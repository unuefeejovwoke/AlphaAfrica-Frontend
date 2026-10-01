import { z } from "zod"
import { ApiError, apiGet, apiPost, SEARCH_TIMEOUT_MS } from "./client.ts"
import { getSupportWhatsAppUrl } from "../content/company.ts"
import { futureDateStringSchema } from "./validation.ts"
import { moneyToKobo, koboToMoneyString, resolveMoneyChange } from "../money.ts"
import {
  travellerCompositionSchema,
  travellerPartyBaseSchema,
} from "../schemas/travel.ts"
import type {
  BookingTravellersPayload,
  TravellerComposition,
} from "../schemas/travel.ts"

/**
 * Flight domain — one-way international search (Phase 3, ticket 01).
 *
 * - Airport autocomplete via `GET /api/flights/airports/?q=`
 * - International search via `POST /api/flights/search/` with legs-based contract
 * - Opaque Flight Offer blobs never appear in URLs/analytics; kept in memory
 *   with sessionStorage backup for refresh/back navigation (Phase 3 spec §6)
 * - All API responses are treated as untrusted: Zod validates even after
 *   client-side validation passes (spec §9)
 */

// ---------------------------------------------------------------------------
// Airport
// ---------------------------------------------------------------------------

export const airportSchema = z.object({
  iata_code: z.string().length(3),
  name: z.string(),
  city: z.string().optional().default(""),
  country_name: z.string().optional().default(""),
  country_code: z.string().optional().default(""),
})

export type Airport = z.infer<typeof airportSchema>

export const RECENT_AIRPORTS_KEY = "alphaa:recent-airports:v1"
export const MAX_RECENT_AIRPORTS = 5
export const AIRPORT_MIN_CHARS = 2

// Module-level cache + dedup — survives across component mounts
// js-set-map-lookups: Map for O(1) lookups (vercel best practice)
export const airportResultCache = new Map<string, Airport[]>()
export const airportPendingRequests = new Map<string, Promise<Airport[]>>()

// ---------------------------------------------------------------------------
// Recent searches: versioned, minimal, localStorage
// ---------------------------------------------------------------------------

export function getRecentAirports(): Airport[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(RECENT_AIRPORTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    // Validate each entry — discard corrupt items
    const out: Airport[] = []
    for (const item of parsed.slice(0, MAX_RECENT_AIRPORTS)) {
      const res = airportSchema.safeParse(item)
      if (res.success) out.push(res.data)
    }
    return out
  } catch {
    return []
  }
}

export function addRecentAirport(airport: Airport): void {
  if (typeof window === "undefined") return
  try {
    const existing = getRecentAirports()
    // Deduplicate by IATA, most recent first
    const next = [
      airport,
      ...existing.filter((a) => a.iata_code !== airport.iata_code),
    ].slice(0, MAX_RECENT_AIRPORTS)
    window.localStorage.setItem(RECENT_AIRPORTS_KEY, JSON.stringify(next))
    // Also warm the result cache for the IATA and city prefixes
    // so immediate re-type benefits without extra fetch
    airportResultCache.set(airport.iata_code.toLowerCase(), [airport])
    if (airport.city) {
      const cityPrefix = airport.city.slice(0, 2).toLowerCase()
      const cached = airportResultCache.get(cityPrefix)
      if (cached && !cached.some((c) => c.iata_code === airport.iata_code)) {
        airportResultCache.set(cityPrefix, [airport, ...cached].slice(0, 10))
      }
    }
  } catch {
    // localStorage may throw in private mode — fail silently
  }
}

export function clearRecentAirports(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(RECENT_AIRPORTS_KEY)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Airport search: 2-char minimum, dedup, cache, cancellation + run-guard ready
// Uses centralized apiGet (ISR noStore) so base URL stays hidden.
// Cancellation: callers pass an AbortSignal; aborts propagate as AbortError
// so run-guards can ignore stale responses. Cache/dedup stay signal-agnostic
// — a shared in-flight promise is never cancelled by one consumer.
// ---------------------------------------------------------------------------

export interface SearchAirportsOptions {
  signal?: AbortSignal
}

export async function searchAirports(
  query: string,
  options: SearchAirportsOptions = {}
): Promise<Airport[]> {
  const trimmed = query.trim()
  if (trimmed.length < AIRPORT_MIN_CHARS) return []
  if (options.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError")
  }

  const key = trimmed.toLowerCase()

  // cache hit — O(1) Map lookup
  const cached = airportResultCache.get(key)
  if (cached) return cached

  // dedup: share in-flight promise
  const pending = airportPendingRequests.get(key)
  if (pending) return pending

  const promise = (async () => {
    try {
      const raw = await apiGet<unknown>("/api/flights/airports/", {
        query: { q: trimmed },
        noStore: true,
        sameOrigin: true,
        timeoutMs: SEARCH_TIMEOUT_MS,
        ...(options.signal ? { signal: options.signal } : {}),
      })
      // Backend returns array of airports
      const parsed = z.array(airportSchema).safeParse(raw)
      if (!parsed.success) {
        // Defensive: backend may return paginated or wrapped — try .results
        if (typeof raw === "object" && raw !== null && "results" in raw) {
          const inner = (raw as { results: unknown }).results
          const innerParsed = z.array(airportSchema).safeParse(inner)
          if (innerParsed.success) {
            airportResultCache.set(key, innerParsed.data)
            return innerParsed.data
          }
        }
        return []
      }
      airportResultCache.set(key, parsed.data)
      return parsed.data
    } catch (error) {
      // Cancellation must propagate — never cache or swallow as empty.
      if (
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        throw error
      }
      return []
    } finally {
      airportPendingRequests.delete(key)
    }
  })()

  airportPendingRequests.set(key, promise)
  return promise
}

/**
 * Resolve one IATA code to a full Airport (city + name) for shared-link and
 * refresh hydration. Tries the module cache first, then a single lookup;
 * returns null when the lookup fails so callers fall back to the bare code.
 * Never throws.
 */
export async function fetchAirportByIata(
  iata: string,
  options: SearchAirportsOptions = {}
): Promise<Airport | null> {
  const code = iata.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(code)) return null
  try {
    // Cache scan first — avoids a fetch when the code was seen before.
    for (const list of airportResultCache.values()) {
      const hit = list.find((a) => a.iata_code.toUpperCase() === code)
      if (hit) return hit
    }
    const results = await searchAirports(code, options)
    const exact = results.find((a) => a.iata_code.toUpperCase() === code)
    if (exact) return exact
    // Fallback: prefix search may still carry the airport under another key.
    for (const list of airportResultCache.values()) {
      const hit = list.find((a) => a.iata_code.toUpperCase() === code)
      if (hit) return hit
    }
    return null
  } catch {
    // Abort or network failure — caller keeps the light fallback.
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError")
    }
    return null
  }
}

// Helpers for tests / SSR to reset module state
export function __clearAirportCache(): void {
  airportResultCache.clear()
  airportPendingRequests.clear()
}

// ---------------------------------------------------------------------------
// One-way search validation
// Extends travellerCompositionSchema + origin/destination + date + trip flags
// ---------------------------------------------------------------------------

export const cabinSchema = z.enum([
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
])
export type Cabin = z.infer<typeof cabinSchema>

/** Cabin choices for search UIs — single source so leg editors match. */
export const CABIN_OPTIONS = [
  { value: "ECONOMY", label: "Economy" },
  { value: "PREMIUM_ECONOMY", label: "Premium Economy" },
  { value: "BUSINESS", label: "Business" },
  { value: "FIRST", label: "First" },
] as const

const iataSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Select a valid airport from the list")

// Shared trip flags — cabin ECONOMY default, currency NGN-only (ADR-0004),
// non_stop + max_stops map to the backend legs contract (also used by story-9 filters).
const tripFlags = {
  cabin: cabinSchema.default("ECONOMY"),
  currency: z.literal("NGN").default("NGN"),
  non_stop: z.boolean().optional().default(false),
  max_stops: z
    .number()
    .int()
    .min(0, "Maximum stops must be 0-3")
    .max(3, "Maximum stops must be 0-3")
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? null : v)),
}

interface CheckIssue {
  code: "custom"
  message: string
  path: PropertyKey[]
  input: unknown
}

/**
 * Single source for party cross-field rules (total ≤9, infants ≤ adults).
 * Branch `.check()` callbacks delegate here so the messages in travel.ts stay
 * authoritative while branches remain plain ZodObjects — required for
 * discriminated-union membership at the type level (Zod v4 only accepts
 * statically discriminable object members, so `.and()`/`.refine()` wrappers
 * cannot be union members).
 */
function checkTravellerComposition(
  push: (issue: CheckIssue) => void,
  data: { adults: unknown; children: unknown; infants: unknown },
  input: unknown
): void {
  const parsed = travellerCompositionSchema.safeParse(data)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      push({
        code: "custom",
        message: issue.message,
        path: [...issue.path],
        input,
      })
    }
  }
}

function checkDistinctAirports(
  push: (issue: CheckIssue) => void,
  origin: string,
  destination: string,
  input: unknown
): void {
  if (origin === destination) {
    push({
      code: "custom",
      message: "Origin and destination must be different",
      path: ["destination"],
      input,
    })
  }
}

// One-way search validation — plain ZodObject (discriminable) with checks.
// Behavior identical to the ticket-01 schema: autocomplete IATA, distinct
// airports, real future date, shared party rules.
export const oneWayFlightSearchSchema = z
  .object({
    ...travellerPartyBaseSchema.shape,
    origin: iataSchema,
    destination: iataSchema,
    departureDate: futureDateStringSchema("Departure date"),
    trip_type: z.literal("one_way").default("one_way"),
    ...tripFlags,
  })
  .check((ctx) => {
    const v = ctx.value
    const push = (issue: CheckIssue) => ctx.issues.push({ ...issue })
    checkTravellerComposition(push, v, v)
    checkDistinctAirports(push, v.origin, v.destination, v)
  })

export type OneWayFlightSearchInput = z.input<typeof oneWayFlightSearchSchema>
export type OneWayFlightSearchPayload = z.output<
  typeof oneWayFlightSearchSchema
>

/**
 * Round-trip and multi-city validation (Phase 3, ticket 02).
 *
 * - Trip types map to legs per spec §51: one-way is 1 leg, round-trip is
 *   outbound plus return, multi-city is 2–6 legs through one leg editor.
 * - Cabin is global for one-way/round-trip and per-leg for multi-city;
 *   the wire contract stays per-leg capable (each leg carries its own cabin).
 * - Party rules reuse travellerCompositionSchema in every branch.
 */

// Leg-editor bounds shared by validation and the LegFields UI.
export const MIN_MULTI_CITY_LEGS = 2
export const MAX_LEGS = 6

export function createEmptyLeg(): {
  origin: string
  destination: string
  date: string
  cabin: Cabin
} {
  return { origin: "", destination: "", date: "", cabin: "ECONOMY" }
}

/** Add Leg is allowed below the 6-leg cap. */
export function canAddLeg(count: number): boolean {
  return count < MAX_LEGS
}

/** Remove Leg is allowed above the 2-leg floor. */
export function canRemoveLeg(count: number): boolean {
  return count > MIN_MULTI_CITY_LEGS
}

// Strict single-leg shape: airports via autocomplete IATA, real future date,
// distinct airports per leg, and its own cabin class. One-way/round-trip
// fill the global cabin at request mapping (toFlightSearchRequest).
const flightLegBase = z.object({
  origin: iataSchema,
  destination: iataSchema,
  date: futureDateStringSchema("Leg date"),
  cabin: cabinSchema.optional().default("ECONOMY"),
})

export const flightLegSchema = flightLegBase.refine(
  (data) => data.origin !== data.destination,
  {
    message: "Origin and destination must be different",
    path: ["destination"],
  }
)

export type FlightLegInput = z.input<typeof flightLegSchema>
export type FlightLeg = z.output<typeof flightLegSchema>

// Round-trip: shared origin/destination with departure + return dates.
// Return must be on or after departure (same-day returns allowed).
export const roundTripFlightSearchSchema = z
  .object({
    ...travellerPartyBaseSchema.shape,
    origin: iataSchema,
    destination: iataSchema,
    departureDate: futureDateStringSchema("Departure date"),
    returnDate: futureDateStringSchema("Return date"),
    trip_type: z.literal("round_trip").default("round_trip"),
    ...tripFlags,
  })
  .check((ctx) => {
    const v = ctx.value
    const push = (issue: CheckIssue) => ctx.issues.push({ ...issue })
    checkTravellerComposition(push, v, v)
    checkDistinctAirports(push, v.origin, v.destination, v)
    if (v.returnDate < v.departureDate) {
      push({
        code: "custom",
        message: "Return date must be on or after the departure date",
        path: ["returnDate"],
        input: v,
      })
    }
  })

export type RoundTripFlightSearchInput = z.input<
  typeof roundTripFlightSearchSchema
>
export type RoundTripFlightSearchPayload = z.output<
  typeof roundTripFlightSearchSchema
>

// Multi-city: 2–6 legs with a chronological date chain. Consecutive-leg
// airport continuity (open-jaw) is intentionally NOT enforced — only distinct
// airports within each leg plus non-decreasing dates (spec §52).
export const multiCityFlightSearchSchema = z
  .object({
    ...travellerPartyBaseSchema.shape,
    trip_type: z.literal("multi_city").default("multi_city"),
    legs: z
      .array(flightLegSchema)
      .min(MIN_MULTI_CITY_LEGS, "Add at least 2 legs for a multi-city search")
      .max(MAX_LEGS, "Multi-city search supports up to 6 legs"),
    ...tripFlags,
  })
  .check((ctx) => {
    const v = ctx.value
    const push = (issue: CheckIssue) => ctx.issues.push({ ...issue })
    checkTravellerComposition(push, v, v)
    for (let i = 1; i < v.legs.length; i++) {
      if (v.legs[i].date < v.legs[i - 1].date) {
        // Point at the offending leg's date so the form shows it inline
        // (code-review: chain errors must not be root-only).
        push({
          code: "custom",
          message: `Leg ${i + 1} date must be on or after leg ${i} date`,
          path: ["legs", i, "date"],
          input: v,
        })
        break
      }
    }
  })

export type MultiCityFlightSearchInput = z.input<
  typeof multiCityFlightSearchSchema
>
export type MultiCityFlightSearchPayload = z.output<
  typeof multiCityFlightSearchSchema
>

// Discriminated union over trip_type — the domain source of truth for
// trip-type validation (TDD seam), submit-time parsing, and request mapping.
// Zod strips unknown keys per branch, so a flat form superset parses cleanly.
export const tripTypeSchema = z.discriminatedUnion("trip_type", [
  oneWayFlightSearchSchema,
  roundTripFlightSearchSchema,
  multiCityFlightSearchSchema,
])

export type FlightSearchInput = z.input<typeof tripTypeSchema>
export type FlightSearchPayload = z.output<typeof tripTypeSchema>

/**
 * Convert a validated search of any trip type into the backend legs contract.
 * Backend expects `POST /api/flights/search/` with `{ trip_type, legs, adults, children, infants, ... }`
 * where every leg carries its own cabin (apidoc FlightSearchRequest).
 * One request per itinerary — never one fetch per leg — with an explicit
 * bounded `max_offers` so searches stay predictable (apidoc: 1–50, default 20).
 */
export const FLIGHT_SEARCH_MAX_OFFERS = 20

export function toFlightSearchRequest(payload: FlightSearchPayload) {
  const cabin = payload.cabin ?? "ECONOMY"
  const common = {
    adults: payload.adults,
    children: payload.children,
    infants: payload.infants,
    currency: payload.currency ?? "NGN",
    non_stop: payload.non_stop ?? false,
    ...(payload.max_stops !== null && payload.max_stops !== undefined
      ? { max_stops: payload.max_stops }
      : {}),
    max_offers: FLIGHT_SEARCH_MAX_OFFERS,
  }
  switch (payload.trip_type) {
    case "round_trip":
      return {
        trip_type: "round_trip" as const,
        legs: [
          {
            origin: payload.origin,
            destination: payload.destination,
            date: payload.departureDate,
            cabin,
          },
          {
            origin: payload.destination,
            destination: payload.origin,
            date: payload.returnDate,
            cabin,
          },
        ],
        ...common,
      }
    case "multi_city":
      return {
        trip_type: "multi_city" as const,
        // Multi-city legs carry their own cabin each (Economy out, Business
        // back); one-way/round-trip use the single global cabin above.
        legs: payload.legs.map((leg) => ({
          origin: leg.origin,
          destination: leg.destination,
          date: leg.date,
          cabin: leg.cabin ?? cabin,
        })),
        ...common,
      }
    case "one_way":
    default:
      return {
        trip_type: "one_way" as const,
        legs: [
          {
            origin: payload.origin,
            destination: payload.destination,
            date: payload.departureDate,
            cabin,
          },
        ],
        ...common,
      }
  }
}

// ---------------------------------------------------------------------------
// Flat RHF form schema — structural adapter over the discriminated union.
// The form needs a flat superset (top-level fields + legs array) so
// useFieldArray has a stable `legs` path for every trip type. All semantic
// rules stay in the union branches: superRefine delegates to tripTypeSchema
// and forwards branch issues with their paths, so there is exactly one rule
// source and no cast on zodResolver (same technique as ticket 01).
// ---------------------------------------------------------------------------

const looseLegSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  date: z.string(),
  cabin: cabinSchema.optional().default("ECONOMY"),
})

export const flightSearchFormSchema = z
  .object({
    trip_type: z
      .enum(["one_way", "round_trip", "multi_city"])
      .default("one_way"),
    origin: z.string().default(""),
    destination: z.string().default(""),
    departureDate: z.string().default(""),
    returnDate: z.string().default(""),
    legs: z.array(looseLegSchema),
    adults: z.number(),
    children: z.number(),
    infants: z.number(),
    cabin: cabinSchema.default("ECONOMY"),
    currency: z.literal("NGN").default("NGN"),
    non_stop: z.boolean().default(false),
    max_stops: z.number().nullable().default(null),
  })
  .superRefine((val, ctx) => {
    const result = tripTypeSchema.safeParse(val)
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: issue.path,
        })
      }
    }
  })

export type FlightSearchFormValues = z.input<typeof flightSearchFormSchema>
export type FlightSearchLegForm = z.output<typeof looseLegSchema>

// ---------------------------------------------------------------------------
// Flight Offer — normalized display shape
// ---------------------------------------------------------------------------

export interface FlightOfferSegment {
  departureAirport: string
  arrivalAirport: string
  departureAt: string
  arrivalAt: string
  carrierCode: string
  flightNumber?: string
  duration?: string
  cabin?: string
}

export interface FlightOfferItinerary {
  duration?: string
  segments: FlightOfferSegment[]
}

export type FlightOffer = {
  id: string
  // Price may arrive as string, number, or nested object
  price?: unknown
  total_amount?: string
  totalAmount?: string
  grandTotal?: string
  currency?: string
  airline?: string
  validatingAirlineCodes?: string[]
  itineraries?: FlightOfferItinerary[]
  // Flat fallback fields
  departure?: string
  arrival?: string
  duration?: string
  stops?: number
  origin?: string
  destination?: string
  cabin?: string
  baggage?: string | null
  // Opaque blob kept for price confirmation — never serialized to URL
  flight_offer?: unknown
  // Allow extra backend fields
  [key: string]: unknown
}

// Permissive schema for API response array — validates shape but not strict
export const flightOfferSchema = z
  .object({
    id: z.string().optional().default(""),
    price: z.unknown().optional(),
    total_amount: z.string().optional(),
    totalAmount: z.string().optional(),
    grandTotal: z.string().optional(),
    currency: z.string().optional(),
    airline: z.string().optional(),
    validatingAirlineCodes: z.array(z.string()).optional(),
    itineraries: z
      .array(
        z.object({
          duration: z.string().optional(),
          segments: z
            .array(
              z.object({
                departureAirport: z.string().optional(),
                arrivalAirport: z.string().optional(),
                departureAt: z.string().optional(),
                arrivalAt: z.string().optional(),
                carrierCode: z.string().optional(),
                flightNumber: z.string().optional(),
                duration: z.string().optional(),
                cabin: z.string().optional(),
                // Amadeus raw shape compatibility
                departure: z.unknown().optional(),
                arrival: z.unknown().optional(),
              })
            )
            .optional()
            .default([]),
        })
      )
      .optional(),
  })
  .passthrough()

export const flightOffersResponseSchema = z
  .array(flightOfferSchema)
  .or(
    z
      .object({ results: z.array(flightOfferSchema) })
      .transform((v) => v.results)
  )

export interface FlightJourneySegment {
  departureAirport: string
  arrivalAirport: string
  departureAt: string
  arrivalAt: string
  carrierCode: string
  flightNumber?: string
  duration?: string
  cabin?: string
  /** Full ISO timestamp from the API (for layover math) — display uses departureAt/arrivalAt. */
  departureAtRaw?: string | null
  arrivalAtRaw?: string | null
  departureTerminal?: string | null
  arrivalTerminal?: string | null
  aircraft?: string | null
  carrierName?: string | null
  operatingCarrier?: string | null
  /** Booking class (e.g. "O"), fare basis (e.g. "OA0WE1IA"), branded fare label. */
  bookingClass?: string | null
  fareBasis?: string | null
  brandedFare?: string | null
  checkedBags?: number | null
  cabinBags?: number | null
  /** Same-plane intermediate stops on THIS leg only — never the journey count. */
  segmentStops?: number | null
}

export interface FlightLayover {
  airport: string
  durationMinutes: number | null
  durationLabel: string
  overnight: boolean
  terminalChange: string | null
}

export interface FlightJourney {
  /** 0-based position in the offer (outbound, return, leg N). */
  index: number
  duration: string
  stops: number
  stopsLabel: string
  origin: string
  destination: string
  airportsLabel: string
  segments: FlightJourneySegment[]
  layovers: FlightLayover[]
}

export interface FlightPriceBreakdown {
  baseFare: string | null
  markup: string | null
  total: string
  currency: string
}

export interface FlightFareRules {
  /** null = airline did not say; true/false only from explicit fareRules. */
  refundable: boolean | null
  exchangePenalty: string | null
  exchangeAllowed: boolean | null
  revalidationAllowed: boolean | null
  ticketDeadline: string | null
}

export interface FlightAmenity {
  description: string
  chargeable: boolean
  type: string
}

export interface FlightOfferDisplay {
  id: string
  airline: string
  airlineCode?: string | null
  validatingAirline?: string | null
  departureAt: string
  arrivalAt: string
  /** ISO date part when the backend provides one, e.g. "2026-10-10". */
  departureDate?: string | null
  arrivalDate?: string | null
  /** Whole-day arrival offset (1 = next day) derived from real dates only. */
  arrivalDayOffset?: number
  duration: string
  stops: number
  stopsLabel: string
  /** Worst stop count across the whole trip (guide `max_stops_in_trip`).
   * `stops` mirrors this value; prefer this field for filters and matrices. */
  maxStopsInTrip: number
  /** Per-leg stop counts (guide `stops_per_itinerary`) — null when unknown. */
  stopsPerItinerary: number[] | null
  /** Guide `is_direct` — true only when the whole trip is non-stop. */
  isDirect: boolean
  origin: string
  destination: string
  airportsLabel: string
  cabin: string
  bookingClass?: string | null
  fareBrand?: string | null
  /** Fare class code/name (guide `fare_code`/`fare_name`, Amadeus class/brand fallback). */
  fareCode: string | null
  fareName: string | null
  /** Guide `airline_logo` URL — null when the backend provides none. */
  airlineLogo: string | null
  baggage: string | null
  checkedBags?: number | null
  cabinBags?: number | null
  price: string
  currency: string
  priceBreakdown?: FlightPriceBreakdown | null
  fareRules?: FlightFareRules | null
  amenities?: FlightAmenity[]
  seatsAvailable?: number | null
  lastTicketingDate?: string | null
  /** Full journey timeline across ALL itineraries — never a single-leg summary alone. */
  journeys: FlightJourney[]
  // Keep reference to raw offer for selection
  raw: FlightOffer
}

function extractPrice(offer: FlightOffer): {
  amount: string
  currency: string
} {
  // Currency is NGN-only in v1 (ADR-0004): display always forces NGN even if
  // the backend echoes another code — conversion lives server-side.
  const CURRENCY = "NGN"
  const candidates: unknown[] = [
    offer.total_amount,
    offer.totalAmount,
    offer.total_price,
    offer.totalPrice,
    offer.grandTotal,
    offer.price,
  ]
  // Flatten nested price objects { total, grandTotal, amount } into candidates
  const p = offer.price
  if (typeof p === "object" && p !== null) {
    const obj = p as Record<string, unknown>
    candidates.push(obj.total, obj.grandTotal, obj.amount)
  }
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return { amount: candidate, currency: CURRENCY }
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return { amount: String(candidate), currency: CURRENCY }
    }
  }
  return { amount: "—", currency: CURRENCY }
}

function formatDuration(raw?: string): string {
  if (!raw) return "—"
  // Handle ISO 8601 like PT2H35M or already formatted
  if (raw.startsWith("PT")) {
    const match = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
    if (match) {
      const h = match[1] ? `${match[1]}h` : ""
      const m = match[2] ? `${match[2]}m` : ""
      return [h, m].filter(Boolean).join(" ") || raw
    }
  }
  return raw
}

function formatTime(iso?: string): string {
  if (!iso) return "—"
  // Prefer the wall-clock time embedded in the ISO string (airport-local)
  // over Date parsing, which shifts naive "2026-10-10T08:30:00" into the
  // browser zone. Falls back to Date only for non-ISO shapes.
  const timeMatch =
    iso.match(/[T ](\d{1,2}:\d{2})/) ?? iso.match(/^(\d{1,2}:\d{2})/)
  if (timeMatch) return timeMatch[1]
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  } catch {
    return iso
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

/** First non-empty string among the candidates — backend shapes vary. */
export function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

/** Read a nested departure/arrival node (`{ at, iataCode }` or a bare string). */
export function pickNodeValue(node: unknown, keys: readonly string[]): string {
  if (typeof node === "string") return node.trim()
  const record = asRecord(node)
  return pickString(...keys.map((key) => record[key]))
}

/** Read the same key from an offer and, as fallback, its nested `flight_offer`. */
function readOfferField(
  offer: Record<string, unknown>,
  inner: Record<string, unknown>,
  keys: readonly string[]
): string {
  return pickString(
    ...keys.map((key) => offer[key]),
    ...keys.map((key) => inner[key])
  )
}

function clockMinutes(value: string): number | null {
  const match = value.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function datePart(value: string): string | null {
  const match = value.match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/**
 * Day offset between departure and arrival. Prefers real calendar dates;
 * falls back to a time-only overnight crossing when dates are absent.
 * Returns 0 when it cannot be established — never a fabricated "+1".
 */
function arrivalDayOffset(departureAt: string, arrivalAt: string): number {
  const depDate = datePart(departureAt)
  const arrDate = datePart(arrivalAt)
  if (depDate && arrDate) {
    const depTime = Date.parse(`${depDate}T00:00:00Z`)
    const arrTime = Date.parse(`${arrDate}T00:00:00Z`)
    if (Number.isFinite(depTime) && Number.isFinite(arrTime)) {
      return Math.max(0, Math.round((arrTime - depTime) / 86_400_000))
    }
  }
  const depMins = clockMinutes(departureAt)
  const arrMins = clockMinutes(arrivalAt)
  if (depMins !== null && arrMins !== null && arrMins < depMins) return 1
  return 0
}

/** The opaque Amadeus blob rides under `raw_offer` (live), `flight_offer` (legacy), or `rawOffer`. */
export function getOpaqueBlob(
  record: Record<string, unknown>
): Record<string, unknown> {
  for (const key of ["raw_offer", "flight_offer", "rawOffer"]) {
    const value = record[key]
    if (typeof value === "object" && value !== null) {
      return value as Record<string, unknown>
    }
  }
  return {}
}

function readNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function formatLayoverMinutes(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return "—"
  const total = Math.round(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h <= 0) return `${m}m`
  if (m <= 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Minutes between two ISO timestamps — null when either is unparseable. */
function layoverMinutesBetween(
  arrivalIso: string,
  departureIso: string
): number | null {
  if (!arrivalIso || !departureIso) return null
  const arrival = Date.parse(arrivalIso)
  const departure = Date.parse(departureIso)
  if (!Number.isFinite(arrival) || !Number.isFinite(departure)) return null
  const diff = Math.round((departure - arrival) / 60000)
  return diff >= 0 ? diff : null
}

function formatBaggagePieces(
  pieces: Record<string, unknown>,
  label: string
): string | null {
  const quantity = pieces.quantity
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) return null
  if (quantity <= 0) return `No ${label} bag`
  const weight = pieces.weight
  const unit =
    typeof pieces.weightUnit === "string" && pieces.weightUnit.trim()
      ? pieces.weightUnit.trim().toLowerCase()
      : "kg"
  return typeof weight === "number" && Number.isFinite(weight)
    ? `${quantity} × ${weight}${unit} ${label}`
    : `${quantity} ${label}`
}

function baggageQuantity(node: unknown): number | null {
  const record = asRecord(node)
  const quantity = record.quantity
  return typeof quantity === "number" && Number.isFinite(quantity)
    ? Math.max(0, Math.floor(quantity))
    : null
}

/** First traveler pricing node — all travellers share the same segment fares in v1. */
function firstTravelerPricing(
  sources: Record<string, unknown>[]
): Record<string, unknown> {
  for (const source of sources) {
    const list = source.travelerPricings ?? source.traveler_pricings
    if (Array.isArray(list) && list.length > 0) {
      return asRecord(list[0])
    }
  }
  return {}
}

function fareDetailsList(
  pricing: Record<string, unknown>
): Record<string, unknown>[] {
  const list = pricing.fareDetailsBySegment ?? pricing.fare_details_by_segment
  if (!Array.isArray(list)) return []
  return list.map((item) => asRecord(item))
}

/** Baggage when the backend/airline actually provides it — otherwise null. */
function extractBaggage(offer: FlightOffer): string | null {
  const record = asRecord(offer)
  if (typeof record.baggage === "string" && record.baggage.trim()) {
    return record.baggage.trim()
  }
  const opaque = getOpaqueBlob(record)
  const pricing = firstTravelerPricing([record, opaque])
  for (const detail of fareDetailsList(pricing)) {
    const checked = formatBaggagePieces(
      asRecord(detail.includedCheckedBags),
      "checked"
    )
    if (checked) return checked
    const cabin = formatBaggagePieces(
      asRecord(detail.includedCabinBags),
      "cabin"
    )
    if (cabin) return cabin
  }
  return null
}

/** Hide Amadeus-vs-normalized segment shape walk behind one helper. */
function getSegmentEndpoints(segment: unknown): {
  departureAt: string
  arrivalAt: string
  departureAirport: string
  arrivalAirport: string
  departureTerminal: string
  arrivalTerminal: string
  cabin: string
  carrierCode: string
  carrierName: string
  operatingCarrier: string
  flightNumber: string
  duration: string
  aircraft: string
  segmentId: string
  segmentStops: number | null
} {
  const seg = asRecord(segment)
  const dep = seg.departure
  const arr = seg.arrival
  const depNode = asRecord(dep)
  const arrNode = asRecord(arr)
  const aircraftNode = seg.aircraft
  // Same-plane intermediate stops on this leg (Amadeus numberOfStops).
  // Bare `stops` is deliberately ignored here — on some shapes it carries
  // the journey-level count and must never leak into a segment.
  const segmentStopsRaw = readNumberLike(
    seg.numberOfStops ?? seg.number_of_stops
  )
  const segmentStops =
    segmentStopsRaw === null ? null : Math.max(0, Math.floor(segmentStopsRaw))
  return {
    departureAt: pickString(
      seg.departureAt,
      seg.departure_at,
      seg.departureTime,
      seg.departure_time,
      pickNodeValue(dep, ["at", "time", "dateTime", "datetime", "date_time"])
    ),
    arrivalAt: pickString(
      seg.arrivalAt,
      seg.arrival_at,
      seg.arrivalTime,
      seg.arrival_time,
      pickNodeValue(arr, ["at", "time", "dateTime", "datetime", "date_time"])
    ),
    departureAirport: pickString(
      seg.departureAirport,
      seg.departure_airport,
      seg.origin,
      pickNodeValue(dep, [
        "iataCode",
        "iata_code",
        "code",
        "airport",
        "airportCode",
        "airport_code",
      ])
    ),
    arrivalAirport: pickString(
      seg.arrivalAirport,
      seg.arrival_airport,
      seg.destination,
      pickNodeValue(arr, [
        "iataCode",
        "iata_code",
        "code",
        "airport",
        "airportCode",
        "airport_code",
      ])
    ),
    departureTerminal: pickString(
      seg.departureTerminal,
      seg.departure_terminal,
      depNode.terminal,
      depNode.terminalName,
      depNode.terminal_name
    ),
    arrivalTerminal: pickString(
      seg.arrivalTerminal,
      seg.arrival_terminal,
      arrNode.terminal,
      arrNode.terminalName,
      arrNode.terminal_name
    ),
    cabin: pickString(seg.cabin, seg.cabinClass, seg.cabin_class),
    carrierCode: pickString(
      seg.carrierCode,
      seg.carrier_code,
      seg.carrier,
      seg.marketingCarrierCode,
      seg.marketing_carrier_code,
      seg.airlineCode,
      seg.airline_code,
      seg.airline
    ),
    carrierName: pickString(
      seg.carrierName,
      seg.carrier_name,
      seg.marketingCarrier,
      seg.marketing_carrier,
      seg.airlineName,
      seg.airline_name
    ),
    operatingCarrier: pickString(
      seg.operatingCarrier,
      seg.operating_carrier,
      pickNodeValue(seg.operating, ["carrierCode", "carrier_code", "code"]),
      pickNodeValue(seg.operatingCarrier, ["carrierCode", "code"])
    ),
    flightNumber: pickString(
      seg.flightNumber,
      seg.flight_number,
      seg.number,
      seg.flight_no
    ),
    duration: pickString(seg.duration, seg.flightDuration, seg.flight_duration),
    aircraft: pickString(
      seg.aircraft,
      seg.aircraft_code,
      seg.aircraftCode,
      seg.equipment,
      pickNodeValue(aircraftNode, ["code", "aircraftCode", "aircraft_code"])
    ),
    segmentId: pickString(seg.id, seg.segmentId, seg.segment_id),
    segmentStops,
  }
}

/**
 * Itinerary list across backend shape variants: a canonical `itineraries`
 * array, an Amadeus offer nested under `raw_offer`/`flight_offer`, or
 * `slices`/`legs`.
 */
function collectItineraries(
  offer: Record<string, unknown>
): { duration: string; segments: unknown[] }[] {
  const opaque = getOpaqueBlob(offer)
  const candidates: unknown[] = [
    offer.itineraries,
    opaque.itineraries,
    offer.slices,
    opaque.slices,
    offer.legs,
    opaque.legs,
  ]
  const list = candidates.find(
    (candidate): candidate is unknown[] =>
      Array.isArray(candidate) && candidate.length > 0
  )
  if (!list) return []
  return list.map((itinerary) => {
    const record = asRecord(itinerary)
    const rawSegments = Array.isArray(itinerary)
      ? itinerary
      : (record.segments ??
        record.flightSegments ??
        record.flight_segments ??
        record.flights ??
        [])
    return {
      duration: pickString(
        record.duration,
        record.totalDuration,
        record.total_duration
      ),
      segments: Array.isArray(rawSegments) ? rawSegments : [],
    }
  })
}

/** Enrichment lookups from the opaque Amadeus blob, aligned by itinerary/segment index. */
function buildEnrichment(record: Record<string, unknown>): {
  rawItineraries: { segments: unknown[] }[]
  fareBySegmentId: Map<string, Record<string, unknown>>
  fareOrdered: Record<string, unknown>[]
} {
  const opaque = getOpaqueBlob(record)
  const rawItineraries = collectItineraries(opaque)
  const pricing = firstTravelerPricing([opaque, record])
  const fareOrdered = fareDetailsList(pricing)
  const fareBySegmentId = new Map<string, Record<string, unknown>>()
  for (const fare of fareOrdered) {
    const id = pickString(fare.segmentId, fare.segment_id)
    if (id && !fareBySegmentId.has(id)) fareBySegmentId.set(id, fare)
  }
  return { rawItineraries, fareBySegmentId, fareOrdered }
}

function resolveSegmentFare(
  enrichment: ReturnType<typeof buildEnrichment>,
  globalIndex: number,
  cleanId: string,
  rawId: string
): Record<string, unknown> {
  if (cleanId && enrichment.fareBySegmentId.has(cleanId)) {
    return enrichment.fareBySegmentId.get(cleanId) as Record<string, unknown>
  }
  if (rawId && enrichment.fareBySegmentId.has(rawId)) {
    return enrichment.fareBySegmentId.get(rawId) as Record<string, unknown>
  }
  // fareDetailsBySegment spans the whole offer (all itineraries in order),
  // so the fallback is the running segment ordinal — never the per-leg index,
  // which would reuse leg 1 fares on the return leg.
  return enrichment.fareOrdered[globalIndex] ?? {}
}

/** Build the full journey timeline across every itinerary — defensive pass-through. */
function buildJourneys(
  offer: FlightOffer,
  enrichment?: ReturnType<typeof buildEnrichment>
): FlightJourney[] {
  const record = asRecord(offer)
  const enrich = enrichment ?? buildEnrichment(record)
  const itineraries = collectItineraries(record)
  let ordinal = 0
  return itineraries.map((itinerary, index) => {
    const segs = itinerary.segments
    const rawSegs = enrich.rawItineraries[index]?.segments ?? []
    const segments: FlightJourneySegment[] = segs.map((seg, segIndex) => {
      const e = getSegmentEndpoints(seg)
      const rawEndpoints =
        rawSegs.length > segIndex
          ? getSegmentEndpoints(rawSegs[segIndex])
          : null
      const fare = resolveSegmentFare(
        enrich,
        ordinal++,
        e.segmentId,
        rawEndpoints?.segmentId ?? ""
      )
      const cabin =
        e.cabin || pickString(fare.cabin, fare.cabinClass, fare.cabin_class)
      const bookingClass =
        pickString(fare.class, fare.bookingClass, fare.booking_class) || null
      const fareBasis = pickString(fare.fareBasis, fare.fare_basis) || null
      const brandedFare =
        pickString(
          fare.brandedFareLabel,
          fare.branded_fare_label,
          fare.brandedFare,
          fare.branded_fare
        ) || null
      const checkedBags = baggageQuantity(
        fare.includedCheckedBags ??
          (fare as Record<string, unknown>).included_checked_bags
      )
      const cabinBags = baggageQuantity(
        fare.includedCabinBags ??
          (fare as Record<string, unknown>).included_cabin_bags
      )
      const departureTerminal =
        e.departureTerminal || rawEndpoints?.departureTerminal || null
      const arrivalTerminal =
        e.arrivalTerminal || rawEndpoints?.arrivalTerminal || null
      const aircraft = e.aircraft || rawEndpoints?.aircraft || null
      const carrierName = e.carrierName || rawEndpoints?.carrierName || null
      const operatingCarrier =
        e.operatingCarrier || rawEndpoints?.operatingCarrier || null
      const carrierCode = e.carrierCode || rawEndpoints?.carrierCode || ""
      const flightNumber = e.flightNumber || rawEndpoints?.flightNumber || ""
      const duration = e.duration || rawEndpoints?.duration || ""
      const segmentStops = e.segmentStops ?? rawEndpoints?.segmentStops ?? null
      return {
        departureAirport:
          e.departureAirport || rawEndpoints?.departureAirport || "—",
        arrivalAirport: e.arrivalAirport || rawEndpoints?.arrivalAirport || "—",
        departureAt:
          e.departureAt || rawEndpoints?.departureAt
            ? formatTime(e.departureAt || rawEndpoints?.departureAt)
            : "—",
        arrivalAt:
          e.arrivalAt || rawEndpoints?.arrivalAt
            ? formatTime(e.arrivalAt || rawEndpoints?.arrivalAt)
            : "—",
        carrierCode,
        ...(flightNumber ? { flightNumber } : {}),
        ...(duration ? { duration: formatDuration(duration) } : {}),
        ...(cabin ? { cabin } : {}),
        departureAtRaw: e.departureAt || rawEndpoints?.departureAt || null,
        arrivalAtRaw: e.arrivalAt || rawEndpoints?.arrivalAt || null,
        ...(departureTerminal ? { departureTerminal } : {}),
        ...(arrivalTerminal ? { arrivalTerminal } : {}),
        ...(aircraft ? { aircraft } : {}),
        ...(carrierName ? { carrierName } : {}),
        ...(operatingCarrier ? { operatingCarrier } : {}),
        ...(bookingClass ? { bookingClass } : {}),
        ...(fareBasis ? { fareBasis } : {}),
        ...(brandedFare ? { brandedFare } : {}),
        ...(checkedBags !== null ? { checkedBags } : {}),
        ...(cabinBags !== null ? { cabinBags } : {}),
        ...(segmentStops !== null ? { segmentStops } : {}),
      }
    })
    const first = segs.length > 0 ? getSegmentEndpoints(segs[0]) : null
    const last =
      segs.length > 0 ? getSegmentEndpoints(segs[segs.length - 1]) : null
    const origin = first?.departureAirport || "—"
    const destination = last?.arrivalAirport || "—"
    const stops = segs.length > 0 ? segs.length - 1 : 0
    // Layovers: airport + connection time between consecutive segments.
    const layovers: FlightLayover[] = []
    for (let i = 0; i < segments.length - 1; i++) {
      const arrivalRaw = segments[i].arrivalAtRaw ?? ""
      const departureRaw = segments[i + 1].departureAtRaw ?? ""
      const minutes = layoverMinutesBetween(arrivalRaw, departureRaw)
      const airport = segments[i].arrivalAirport
      const arrivalTerminal = segments[i].arrivalTerminal ?? null
      const departureTerminal = segments[i + 1].departureTerminal ?? null
      const terminalChange =
        arrivalTerminal &&
        departureTerminal &&
        arrivalTerminal !== departureTerminal
          ? `${arrivalTerminal} → ${departureTerminal}`
          : null
      const overnight =
        (datePart(arrivalRaw) ?? "") !== "" &&
        (datePart(departureRaw) ?? "") !== "" &&
        datePart(arrivalRaw) !== datePart(departureRaw)
      layovers.push({
        airport,
        durationMinutes: minutes,
        durationLabel: formatLayoverMinutes(minutes),
        overnight,
        terminalChange,
      })
    }
    return {
      index,
      duration: itinerary.duration ? formatDuration(itinerary.duration) : "—",
      stops,
      stopsLabel:
        stops === 0 ? "Non-stop" : `${stops} ${stops === 1 ? "stop" : "stops"}`,
      origin,
      destination,
      airportsLabel:
        origin !== "—" && destination !== "—"
          ? `${origin} → ${destination}`
          : "—",
      segments,
      layovers,
    }
  })
}

/** Price breakdown (base fare + Alphaa markup + total) — null parts stay null, never zero-filled. */
function extractPriceBreakdown(
  record: Record<string, unknown>,
  opaque: Record<string, unknown>,
  total: string,
  currency: string
): FlightPriceBreakdown | null {
  const baseFromNode = (value: unknown): string => {
    if (typeof value === "object" && value !== null) {
      return pickNodeValue(value, ["base"])
    }
    return ""
  }
  const baseFare =
    pickString(
      record.base_fare,
      record.baseFare,
      record.base_price,
      record.basePrice,
      opaque.base_fare,
      baseFromNode(record.price),
      baseFromNode(opaque.price)
    ) || null
  const markup =
    pickString(
      record.markup,
      record.markup_amount,
      record.markupAmount,
      opaque.markup,
      opaque.markup_amount
    ) || null
  if (!baseFare && !markup) return null
  return { baseFare, markup, total, currency }
}

/** Fare conditions from the Amadeus `fareRules` block — null means the airline did not say. */
function extractFareRules(
  record: Record<string, unknown>,
  opaque: Record<string, unknown>
): FlightFareRules | null {
  const source = asRecord(opaque.fareRules ?? record.fareRules)
  const rules = source.rules
  if (!Array.isArray(rules) || rules.length === 0) return null
  let refundable: boolean | null = null
  let exchangeAllowed: boolean | null = null
  let exchangePenalty: string | null = null
  let revalidationAllowed: boolean | null = null
  for (const item of rules) {
    const rule = asRecord(item)
    const category = pickString(rule.category).toUpperCase()
    const notApplicable =
      rule.notApplicable === true || rule.not_applicable === true
    if (category === "REFUND") {
      refundable = !notApplicable
      if (!notApplicable && exchangeAllowed === null) {
        // A bare applicable REFUND rule with no penalty stated still means
        // refunds are possible — amount unknown, so keep penalty null.
      }
    } else if (category === "EXCHANGE") {
      exchangeAllowed = !notApplicable
      const penalty = pickString(
        rule.maxPenaltyAmount,
        rule.max_penalty_amount,
        rule.penalty,
        rule.amount
      )
      if (penalty) exchangePenalty = penalty
    } else if (category === "REVALIDATION") {
      revalidationAllowed = !notApplicable
    }
  }
  if (
    refundable === null &&
    exchangeAllowed === null &&
    revalidationAllowed === null &&
    !exchangePenalty
  ) {
    return null
  }
  const ticketDeadline =
    pickString(
      opaque.lastTicketingDate,
      record.lastTicketingDate,
      record.last_ticketing_date
    ) || null
  return {
    refundable,
    exchangePenalty,
    exchangeAllowed,
    revalidationAllowed,
    ticketDeadline,
  }
}

/** Unique onboard amenities across all fare details — surfaced only when the airline provides them. */
function extractAmenities(
  record: Record<string, unknown>,
  opaque: Record<string, unknown>
): FlightAmenity[] {
  const pricing = firstTravelerPricing([opaque, record])
  const seen = new Map<string, FlightAmenity>()
  for (const detail of fareDetailsList(pricing)) {
    const amenities = (detail as Record<string, unknown>).amenities
    if (!Array.isArray(amenities)) continue
    for (const item of amenities) {
      const node = asRecord(item)
      const description = pickString(node.description)
      if (!description) continue
      const key = description.toUpperCase()
      if (seen.has(key)) continue
      seen.set(key, {
        description,
        chargeable: node.isChargeable === true,
        type: pickString(node.amenityType, node.amenity_type) || "OTHER",
      })
    }
  }
  return [...seen.values()]
}

function extractSeats(
  record: Record<string, unknown>,
  opaque: Record<string, unknown>
): number | null {
  const candidates = [
    record.seats_available,
    record.seatsAvailable,
    record.numberOfBookableSeats,
    opaque.numberOfBookableSeats,
    opaque.seats_available,
  ]
  for (const candidate of candidates) {
    const value = readNumberLike(candidate)
    if (value !== null) return Math.max(0, Math.floor(value))
  }
  return null
}

export function normalizeFlightOffer(
  offer: FlightOffer,
  index: number
): FlightOfferDisplay {
  const record = asRecord(offer)
  const opaque = getOpaqueBlob(record)
  const inner =
    Object.keys(opaque).length > 0 ? opaque : asRecord(record.flight_offer)
  const read = (...keys: string[]) =>
    pickString(
      ...keys.map((key) => record[key]),
      ...keys.map((key) => opaque[key]),
      ...keys.map((key) => inner[key])
    )

  const id =
    pickString(
      record.offer_id,
      record.offerId,
      record.id,
      opaque.offer_id,
      opaque.id,
      inner.offer_id,
      inner.id
    ) || `offer-${index}`
  const firstCarrierCode = (source: Record<string, unknown>): string => {
    const codes =
      source.validatingAirlineCodes ?? source.validating_airline_codes
    return Array.isArray(codes) && typeof codes[0] === "string" ? codes[0] : ""
  }
  const validatingAirline =
    firstCarrierCode(record) ||
    firstCarrierCode(opaque) ||
    firstCarrierCode(inner) ||
    null
  const airlineCode =
    pickString(
      record.airline_code,
      record.airlineCode,
      opaque.airline_code,
      opaque.airlineCode
    ) || validatingAirline
  const airline =
    pickString(
      record.airline,
      record.airlineName,
      record.airline_name,
      opaque.airline,
      inner.airline
    ) ||
    validatingAirline ||
    "Airline"

  const itineraries = collectItineraries(record)

  // Flat offers (backend "clean cards", mocked data) plus Amadeus shapes.
  let departureAt = read(
    "departureAt",
    "departure_at",
    "departureTime",
    "departure_time"
  )
  let arrivalAt = read("arrivalAt", "arrival_at", "arrivalTime", "arrival_time")
  let duration = read("duration", "totalDuration", "total_duration")
  let origin = read("origin", "departureAirport", "departure_airport", "from")
  let destination = read(
    "destination",
    "arrivalAirport",
    "arrival_airport",
    "to"
  )
  let cabin = read("cabin", "cabinClass", "cabin_class") || "ECONOMY"
  const stopsRaw = record.stops ?? opaque.stops ?? inner.stops
  let stops =
    typeof stopsRaw === "number" && Number.isFinite(stopsRaw)
      ? Math.max(0, Math.floor(stopsRaw))
      : typeof stopsRaw === "string" &&
          stopsRaw.trim() !== "" &&
          Number.isFinite(Number(stopsRaw))
        ? Math.max(0, Math.floor(Number(stopsRaw)))
        : undefined
  const baggage = extractBaggage(offer) ?? extractBaggage(inner as FlightOffer)

  // Nested departure/arrival nodes when no explicit flat field exists.
  if (!departureAt) {
    departureAt = pickNodeValue(record.departure, [
      "at",
      "time",
      "dateTime",
      "datetime",
      "date_time",
    ])
  }
  if (!arrivalAt) {
    arrivalAt = pickNodeValue(record.arrival, [
      "at",
      "time",
      "dateTime",
      "datetime",
      "date_time",
    ])
  }
  if (!origin) {
    origin = pickNodeValue(record.departure, [
      "iataCode",
      "iata_code",
      "code",
      "airport",
      "airportCode",
      "airport_code",
    ])
  }
  if (!destination) {
    destination = pickNodeValue(record.arrival, [
      "iataCode",
      "iata_code",
      "code",
      "airport",
      "airportCode",
      "airport_code",
    ])
  }

  if (itineraries.length > 0) {
    const firstItinerary = itineraries[0]
    const segs = firstItinerary.segments
    if (segs.length > 0) {
      const firstEndpoints = getSegmentEndpoints(segs[0])
      const lastEndpoints = getSegmentEndpoints(segs[segs.length - 1])
      if (firstEndpoints.departureAt) departureAt = firstEndpoints.departureAt
      if (lastEndpoints.arrivalAt) arrivalAt = lastEndpoints.arrivalAt
      if (firstEndpoints.departureAirport)
        origin = firstEndpoints.departureAirport
      if (lastEndpoints.arrivalAirport)
        destination = lastEndpoints.arrivalAirport
      if (firstItinerary.duration) duration = firstItinerary.duration
      // Stop counts are derived trip-wide below (max_stops_in_trip / max
      // across itineraries) — the first leg alone must never label the trip.
      if (firstEndpoints.cabin) cabin = firstEndpoints.cabin
    }
  }

  const { amount, currency } = extractPrice(offer)

  const airportsLabel =
    origin && destination ? `${origin} → ${destination}` : "—"
  const enrichment = buildEnrichment(record)
  const journeys = buildJourneys(offer, enrichment)

  // Trip-wide stop counts (guide §9): the backend `max_stops_in_trip` wins;
  // otherwise the worst across all itineraries; otherwise the flat `stops`.
  // A 0-stop outbound + 1-stop return is a 1-stop trip, never "Direct".
  const backendMaxStops = readNumberLike(
    record.max_stops_in_trip ??
      record.maxStopsInTrip ??
      opaque.max_stops_in_trip ??
      opaque.maxStopsInTrip ??
      inner.max_stops_in_trip ??
      inner.maxStopsInTrip
  )
  const backendStopsPerItinerary = ((): number[] | null => {
    const raw =
      record.stops_per_itinerary ??
      record.stopsPerItinerary ??
      opaque.stops_per_itinerary ??
      opaque.stopsPerItinerary ??
      inner.stops_per_itinerary ??
      inner.stopsPerItinerary
    if (!Array.isArray(raw)) return null
    const out: number[] = []
    for (const item of raw) {
      const n = readNumberLike(item)
      if (n !== null) out.push(Math.max(0, Math.floor(n)))
    }
    return out.length > 0 ? out : null
  })()
  const journeyStops = journeys.map((j) => j.stops)
  const maxJourneyStops =
    journeyStops.length > 0 ? Math.max(...journeyStops) : undefined
  const maxStops =
    backendMaxStops !== null
      ? Math.max(0, Math.floor(backendMaxStops))
      : (maxJourneyStops ?? stops ?? 0)
  const stopsPerItinerary =
    backendStopsPerItinerary ??
    (journeyStops.length > 0 ? journeyStops : null)
  const backendDirect =
    record.is_direct ?? record.isDirect ?? opaque.is_direct ?? inner.is_direct
  const isDirect =
    typeof backendDirect === "boolean" ? backendDirect : maxStops === 0
  const stopsLabel =
    maxStops === 0
      ? "Non-stop"
      : `${maxStops} ${maxStops === 1 ? "stop" : "stops"}`

  // Flat responses without itineraries still get a real, expandable timeline.
  if (
    journeys.length === 0 &&
    (departureAt || arrivalAt || origin || destination)
  ) {
    journeys.push({
      index: 0,
      duration: duration ? formatDuration(duration) : "—",
      stops: maxStops,
      stopsLabel,
      origin: origin || "—",
      destination: destination || "—",
      airportsLabel,
      segments: [
        {
          departureAirport: origin || "—",
          arrivalAirport: destination || "—",
          departureAt: departureAt ? formatTime(departureAt) : "—",
          arrivalAt: arrivalAt ? formatTime(arrivalAt) : "—",
          carrierCode: airlineCode ?? (airline === "Airline" ? "" : airline),
          ...(duration ? { duration: formatDuration(duration) } : {}),
          departureAtRaw: departureAt || null,
          arrivalAtRaw: arrivalAt || null,
        },
      ],
      layovers: [],
    })
  }

  // Offer-level enrichments from the opaque blob + clean card.
  const pricing = firstTravelerPricing([opaque, record])
  const fareOrdered = fareDetailsList(pricing)
  const firstFare = fareOrdered[0] ?? {}
  const bookingClass =
    pickString(
      firstFare.class,
      firstFare.bookingClass,
      firstFare.booking_class
    ) || null
  const fareBrand =
    pickString(
      firstFare.brandedFareLabel,
      firstFare.branded_fare_label,
      firstFare.brandedFare,
      firstFare.branded_fare
    ) || null
  const checkedBags =
    fareOrdered.length > 0
      ? ((): number | null => {
          for (const fare of fareOrdered) {
            const q = baggageQuantity(
              (fare as Record<string, unknown>).includedCheckedBags
            )
            if (q !== null) return q
          }
          return null
        })()
      : null
  const cabinBags =
    fareOrdered.length > 0
      ? ((): number | null => {
          for (const fare of fareOrdered) {
            const q = baggageQuantity(
              (fare as Record<string, unknown>).includedCabinBags
            )
            if (q !== null) return q
          }
          return null
        })()
      : null
  const priceBreakdown = extractPriceBreakdown(record, opaque, amount, currency)
  const fareRules = extractFareRules(record, opaque)
  const amenities = extractAmenities(record, opaque)
  const seatsAvailable = extractSeats(record, opaque)
  const lastTicketingDate =
    pickString(
      opaque.lastTicketingDate,
      record.lastTicketingDate,
      record.last_ticketing_date
    ) || null
  const airlineLogo =
    pickString(
      record.airline_logo,
      record.airlineLogo,
      record.logo,
      opaque.airline_logo,
      opaque.airlineLogo,
      inner.airline_logo
    ) || null
  // Guide fare_code/fare_name ride top-level (domestic fare classes); fall
  // back to the Amadeus fare-details class/brand so cards have one lookup.
  const fareCode =
    pickString(
      record.fare_code,
      record.fareCode,
      opaque.fare_code,
      opaque.fareCode,
      inner.fare_code,
      inner.fareCode
    ) ||
    bookingClass
  const fareName =
    pickString(
      record.fare_name,
      record.fareName,
      record.fare_class_name,
      opaque.fare_name,
      opaque.fareName,
      inner.fare_name,
      inner.fareName
    ) ||
    fareBrand

  return {
    id,
    airline,
    airlineCode: airlineCode || null,
    validatingAirline,
    departureAt: departureAt ? formatTime(departureAt) : "—",
    arrivalAt: arrivalAt ? formatTime(arrivalAt) : "—",
    departureDate: departureAt ? datePart(departureAt) : null,
    arrivalDate: arrivalAt ? datePart(arrivalAt) : null,
    arrivalDayOffset: arrivalDayOffset(departureAt, arrivalAt),
    duration: duration ? formatDuration(duration) : "—",
    stops: maxStops,
    stopsLabel,
    maxStopsInTrip: maxStops,
    stopsPerItinerary,
    isDirect,
    origin: origin || "—",
    destination: destination || "—",
    airportsLabel,
    cabin,
    bookingClass,
    fareBrand,
    fareCode,
    fareName,
    airlineLogo,
    baggage,
    checkedBags,
    cabinBags,
    price: amount,
    currency,
    priceBreakdown,
    fareRules,
    amenities,
    seatsAvailable,
    lastTicketingDate,
    journeys,
    raw: offer,
  }
}

// ---------------------------------------------------------------------------
// International search via centralized apiPost (ticket 01).
// Domestic auto-routing (both-Nigerian → QuickAir SSE proxy, ADR-0004) lands
// in ticket 03 — this slice intentionally serves the Amadeus legs path only.
// One request per itinerary with an explicit bounded max_offers; callers pass
// an AbortSignal so superseding searches and unmount cancel in-flight work
// and stale responses never overwrite fresh ones.
// ---------------------------------------------------------------------------

export interface SearchFlightsOptions {
  signal?: AbortSignal
}

export async function searchFlights(
  payload: FlightSearchPayload,
  options: SearchFlightsOptions = {}
): Promise<FlightOffer[]> {
  const body = toFlightSearchRequest(payload)
  const raw = await apiPost<unknown, typeof body>(
    "/api/flights/search/",
    body,
    {
      sameOrigin: true,
      timeoutMs: SEARCH_TIMEOUT_MS,
      ...(options.signal ? { signal: options.signal } : {}),
    }
  )
  // Backend may return array or { results: [] } or { data: [] } / { offers: [] }.
  // A 200 with an error envelope must surface as an error (never silent empty).
  if (Array.isArray(raw)) {
    return raw as FlightOffer[]
  }
  if (typeof raw === "object" && raw !== null) {
    const rec = raw as Record<string, unknown>
    const backendError =
      (typeof rec.detail === "string" && rec.detail) ||
      (typeof rec.message === "string" && rec.message) ||
      (typeof rec.error === "string" && rec.error) ||
      null
    if (backendError) {
      const { ApiError } = await import("./client.ts")
      throw new ApiError(backendError, { status: 200, code: "server" })
    }
    if (Array.isArray(rec.results)) return rec.results as FlightOffer[]
    if (Array.isArray(rec.data)) return rec.data as FlightOffer[]
    if (Array.isArray(rec.offers)) return rec.offers as FlightOffer[]
    if (Array.isArray(rec.cards)) return rec.cards as FlightOffer[]
    if (Array.isArray(rec.flights)) return rec.flights as FlightOffer[]
    if (Array.isArray(rec.items)) return rec.items as FlightOffer[]
  }
  return []
}

// ---------------------------------------------------------------------------
// Price confirmation — dedicated checkout step (Phase 3, ticket 05).
//
// Selecting a Flight Offer revalidates the live fare via
// `POST /api/flights/price/` with the opaque `flight_offer` blob through the
// centralized `apiPost` (no-store, never cached). The pure
// `resolvePriceConfirmation` machine maps { selected_offer, revalidated_offer }
// to same | changed | expired. A missing offer on either side resolves to
// expired so a stale fare can never silently become a booking.
//
// The opaque blob lives in memory with a sessionStorage backup for refresh
// and back navigation, and never appears in URLs (PRD §9).
// ---------------------------------------------------------------------------

export const SELECTED_OFFER_SESSION_KEY = "alphaa:selected-flight-offer:v1"
export const CONFIRMED_OFFER_SESSION_KEY = "alphaa:confirmed-flight-offer:v1"

export type PriceConfirmOutcome =
  | { status: "same"; total: string; currency: string }
  | {
      status: "changed"
      previousTotal: string
      newTotal: string
      difference: string
      increased: boolean
      currency: string
    }
  | { status: "expired" }

export interface PriceConfirmInput {
  selected_offer: FlightOffer | null | undefined
  revalidated_offer: FlightOffer | null | undefined
}

/** Extract an offer total as integer kobo to avoid float dust in comparisons. */
function extractOfferKobo(
  offer: FlightOffer | null | undefined
): number | null {
  if (typeof offer !== "object" || offer === null) return null
  const { amount } = extractPrice(offer)
  if (amount === "—") return null
  return moneyToKobo(amount)
}

/**
 * Pure price-confirm state machine (TDD seam, ticket 05).
 * input = { selected_offer, revalidated_offer } → same | changed | expired.
 */
export function resolvePriceConfirmation(
  input: PriceConfirmInput
): PriceConfirmOutcome {
  const CURRENCY = "NGN"
  const selectedKobo = extractOfferKobo(input.selected_offer)
  const revalidatedKobo = extractOfferKobo(input.revalidated_offer)
  if (selectedKobo === null || revalidatedKobo === null) {
    return { status: "expired" }
  }
  if (selectedKobo === revalidatedKobo) {
    return {
      status: "same",
      total: koboToMoneyString(revalidatedKobo),
      currency: CURRENCY,
    }
  }
  return {
    status: "changed",
    ...resolveMoneyChange(selectedKobo, revalidatedKobo, CURRENCY),
  }
}

const EXPIRED_OFFER_PATTERN =
  /expir|no longer (available|valid)|unavailable|not found|invalid offer|stale|offer .*gone|reserv|could not (hold|book|confirm)|search (again|expired)|seat .*gone|fare .*gone/i

/**
 * Map a price-confirmation failure to the expired branch. A 404/410 means the
 * offer is gone; a 400/422 carrying expired copy means the airline withdrew
 * the fare; a 502 carrying reserve/stale copy means the QuickAir `search_id`
 * window lapsed — the fix is a fresh search, never a retry of the same card.
 * Everything else is a retryable error, never an expiry.
 */
export function isOfferExpiredError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  if (error.status === 404 || error.status === 410) return true
  if (
    error.status === 400 ||
    error.status === 422 ||
    error.status === 502 ||
    error.status === 504
  ) {
    return EXPIRED_OFFER_PATTERN.test(error.message)
  }
  return false
}

function asOfferOrFirst(value: unknown): FlightOffer | null {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === "object" && candidate !== null
    ? (candidate as FlightOffer)
    : null
}

function unwrapConfirmedOffer(raw: unknown): FlightOffer | null {
  if (Array.isArray(raw)) return asOfferOrFirst(raw)
  if (typeof raw === "object" && raw !== null) {
    const rec = raw as Record<string, unknown>
    for (const key of ["flight_offer", "confirmed_offer", "offer", "data"]) {
      const found = asOfferOrFirst(rec[key])
      if (found) return found
    }
    if (Array.isArray(rec.results)) return asOfferOrFirst(rec.results)
    return raw as FlightOffer
  }
  return null
}

/**
 * The opaque backend blob for revalidation and booking creation.
 * The live API returns "clean cards" where the Amadeus offer rides under
 * `raw_offer`; legacy/mocked shapes use `flight_offer`. Sending the whole
 * normalized card to `/price/` or `/bookings/create/` fails, so always
 * prefer the deepest blob and fall back to the card only when none exists
 * (Domestic Flight Cards carry no opaque blob by definition).
 */
export function extractOpaqueOfferBlob(offer: unknown): unknown {
  const record = asRecord(offer)
  for (const key of ["raw_offer", "flight_offer", "rawOffer"]) {
    const value = record[key]
    if (typeof value === "object" && value !== null) return value
  }
  return offer
}

/**
 * Revalidate a selected Flight Offer against the live airline fare.
 * Sends the opaque blob via centralized `apiPost` (no-store, same-origin
 * proxy). Throws a typed `ApiError` on failure — callers map expiry via
 * `isOfferExpiredError`.
 */
export interface ConfirmFlightPriceOptions {
  signal?: AbortSignal
}

export async function confirmFlightPrice(
  flightOfferBlob: unknown,
  options: ConfirmFlightPriceOptions = {}
): Promise<FlightOffer> {
  const raw = await apiPost<unknown, { flight_offer: unknown }>(
    "/api/flights/price/",
    {
      flight_offer: flightOfferBlob,
    },
    {
      sameOrigin: true,
      ...(options.signal ? { signal: options.signal } : {}),
    }
  )
  if (typeof raw === "object" && raw !== null) {
    const rec = raw as Record<string, unknown>
    const backendError =
      (typeof rec.detail === "string" && rec.detail) ||
      (typeof rec.message === "string" && rec.message) ||
      (typeof rec.error === "string" && rec.error) ||
      null
    if (backendError) {
      throw new ApiError(backendError, { status: 200, code: "server" })
    }
  }
  const offer = unwrapConfirmedOffer(raw)
  if (!offer) {
    throw new ApiError("The airline did not return a confirmed fare.", {
      status: 200,
      code: "server",
    })
  }
  return offer
}

function writeOfferToSession(key: string, offer: FlightOffer): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(offer))
  } catch {
    // sessionStorage may throw in private mode — memory copy still works
  }
}

function readOfferFromSession(key: string): FlightOffer | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== "object" || parsed === null) return null
    return parsed as FlightOffer
  } catch {
    return null
  }
}

// In-memory handoff for the opaque blob: the selecting page holds the object
// (memory caller) while sessionStorage backs refresh and back navigation.
// Reads prefer memory, falling back to session — the blob never enters URLs
// or analytics either way.
let memorySelectedOffer: FlightOffer | null = null
let memoryConfirmedOffer: FlightOffer | null = null

/** Persist the selected Flight Offer blob (memory caller + sessionStorage backup). */
export function saveSelectedOffer(offer: FlightOffer): void {
  memorySelectedOffer = offer
  writeOfferToSession(SELECTED_OFFER_SESSION_KEY, offer)
}

/** Read back the selected Flight Offer blob, or null when absent/corrupt. */
export function readSelectedOffer(): FlightOffer | null {
  return memorySelectedOffer ?? readOfferFromSession(SELECTED_OFFER_SESSION_KEY)
}

/** Drop the selected Flight Offer from memory and session (branch switches). */
export function clearSelectedOffer(): void {
  memorySelectedOffer = null
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(SELECTED_OFFER_SESSION_KEY)
  } catch {
    // ignore — memory copy already cleared
  }
}

/** Copy the Confirmed Offer into session for ticket 06 (traveller entry). */
export function saveConfirmedOffer(offer: FlightOffer): void {
  memoryConfirmedOffer = offer
  writeOfferToSession(CONFIRMED_OFFER_SESSION_KEY, offer)
  writeOfferSavedAt(CONFIRMED_OFFER_SAVED_AT_KEY, Date.now())
}

/** Read back the Confirmed Offer, or null when absent/corrupt. */
export function readConfirmedOffer(): FlightOffer | null {
  return (
    memoryConfirmedOffer ?? readOfferFromSession(CONFIRMED_OFFER_SESSION_KEY)
  )
}

/** Drop the Confirmed Offer from memory and session (checkout teardown). */
export function clearConfirmedOffer(): void {
  memoryConfirmedOffer = null
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(CONFIRMED_OFFER_SESSION_KEY)
    window.sessionStorage.removeItem(CONFIRMED_OFFER_SAVED_AT_KEY)
  } catch {
    // ignore — memory copy already cleared
  }
}

/**
 * QuickAir `search_id` freshness (guide §9: a domestic offer is only
 * bookable for a short window after the search — re-search on expiry).
 * The saved-at sidecar travels with the Confirmed Offer; offers saved
 * before sidecars existed (or with corrupt clocks) are treated as fresh
 * so old sessions never hard-block — the backend 502 path still catches
 * genuinely dead offers.
 */
export const CONFIRMED_OFFER_SAVED_AT_KEY =
  "alphaa:confirmed-flight-offer-saved-at:v1"
/** Domestic offers older than this must re-search instead of booking. */
export const DOMESTIC_OFFER_TTL_MS = 10 * 60 * 1000

function writeOfferSavedAt(key: string, now: number): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key, String(now))
  } catch {
    // sessionStorage may throw in private mode — freshness unknown, treat as fresh
  }
}

export function readConfirmedOfferSavedAt(): number | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(CONFIRMED_OFFER_SAVED_AT_KEY)
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  } catch {
    return null
  }
}

/** True when a domestic Confirmed Offer outlived its bookable window. */
export function isConfirmedOfferStale(
  savedAt: number | null,
  now: number = Date.now()
): boolean {
  if (savedAt === null) return false
  return now - savedAt > DOMESTIC_OFFER_TTL_MS
}

export const SELECTED_PARTY_SESSION_KEY = "alphaa:selected-flight-party:v1"

/**
 * Search-step party persisted alongside the selection. Aliased to the shared
 * composition type so the session handoff and the traveller form can never
 * drift apart.
 */
export type SelectedFlightParty = TravellerComposition

let memorySelectedParty: SelectedFlightParty | null = null

/**
 * Persist the search-step party alongside the selected offer so Traveller
 * entry opens the exact slot count (adults/children/infants) even though
 * the opaque blob carries no party. Safe primitives only — never PII.
 */
export function saveSelectedParty(party: SelectedFlightParty): void {
  memorySelectedParty = { ...party }
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      SELECTED_PARTY_SESSION_KEY,
      JSON.stringify(party)
    )
  } catch {
    // sessionStorage may throw in private mode — memory copy still works
  }
}

/** Read back the selected party, or null when absent/corrupt. */
export function readSelectedParty(): SelectedFlightParty | null {
  if (memorySelectedParty) return { ...memorySelectedParty }
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(SELECTED_PARTY_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== "object" || parsed === null) return null
    const rec = parsed as Record<string, unknown>
    const adults = rec.adults
    const children = rec.children
    const infants = rec.infants
    if (
      typeof adults !== "number" ||
      !Number.isInteger(adults) ||
      adults < 1 ||
      adults > 9 ||
      typeof children !== "number" ||
      !Number.isInteger(children) ||
      children < 0 ||
      children > 9 ||
      typeof infants !== "number" ||
      !Number.isInteger(infants) ||
      infants < 0 ||
      infants > 9
    ) {
      return null
    }
    return { adults, children, infants }
  } catch {
    return null
  }
}

/** Build the traveller-entry query carrying only safe party counts. */
export function buildCheckoutPartyQuery(party: SelectedFlightParty): string {
  const params = new URLSearchParams()
  params.set("adults", String(party.adults))
  params.set("children", String(party.children))
  params.set("infants", String(party.infants))
  return params.toString()
}

/** Drop the selected party from memory and session (checkout teardown). */
export function clearSelectedParty(): void {
  memorySelectedParty = null
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(SELECTED_PARTY_SESSION_KEY)
  } catch {
    // ignore — memory copy already cleared
  }
}

export const TRAVELLERS_DRAFT_SESSION_KEY = "alphaa:travellers-draft:v1"

/** Persist the validated Traveller + Customer draft for ticket 07 (payment). */
export function saveTravellersDraft(payload: BookingTravellersPayload): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      TRAVELLERS_DRAFT_SESSION_KEY,
      JSON.stringify(payload)
    )
  } catch {
    // sessionStorage may throw in private mode — the in-memory submit still ran
  }
}

/** Read back the Travellers draft, or null when absent/corrupt. */
export function readTravellersDraft(): BookingTravellersPayload | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(TRAVELLERS_DRAFT_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== "object" || parsed === null) return null
    return parsed as BookingTravellersPayload
  } catch {
    return null
  }
}

/** Drop the Travellers draft from session (cleared or completed checkout). */
export function clearTravellersDraft(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(TRAVELLERS_DRAFT_SESSION_KEY)
  } catch {
    // ignore — nothing left to clear
  }
}

/**
 * Drop every session-backed checkout input: the selected and Confirmed Offer
 * blobs, the selected party, and the Travellers draft. Called after a verified
 * payment so back/forward can never re-enter checkout with a completed trip.
 * Pending Booking + Payment Reference clearing lives beside their writers.
 */
export function clearFlightCheckoutSession(): void {
  clearSelectedOffer()
  clearConfirmedOffer()
  clearSelectedParty()
  clearTravellersDraft()
}

// ---------------------------------------------------------------------------
// Support context — trip-aware WhatsApp prefills (Phase 3, ticket 09)
// ---------------------------------------------------------------------------

/**
 * Non-sensitive trip state for support hatches. Route, dates, party,
 * references, and amounts are already URL/session-visible booking state —
 * never names, emails, phones, passports, or payment data.
 */
export interface FlightTripContext {
  origin?: string | null
  destination?: string | null
  departureDate?: string | null
  returnDate?: string | null
  adults?: number | null
  children?: number | null
  infants?: number | null
  reference?: string | null
  amount?: string | null
}

/**
 * Compact trip line for WhatsApp prefills, e.g.
 * "LOS → DXB on 2026-05-01 for 2 adults (ref ABC123)". Skips whatever is
 * unknown so partial context still reads naturally.
 */
export function describeFlightTrip(trip: FlightTripContext): string {
  const parts: string[] = []
  const route = [trip.origin, trip.destination].filter(Boolean).join(" → ")
  if (route) parts.push(route)
  const dates = [trip.departureDate, trip.returnDate]
    .filter(Boolean)
    .join(" → ")
  if (dates) parts.push(`on ${dates}`)
  const party: string[] = []
  if (trip.adults)
    party.push(`${trip.adults} ${trip.adults === 1 ? "adult" : "adults"}`)
  if (trip.children) {
    party.push(trip.children === 1 ? "1 child" : `${trip.children} children`)
  }
  if (trip.infants) {
    party.push(`${trip.infants} ${trip.infants === 1 ? "infant" : "infants"}`)
  }
  if (party.length > 0) parts.push(`for ${party.join(", ")}`)
  if (trip.reference) parts.push(`(ref ${trip.reference})`)
  if (trip.amount) parts.push(`· ${trip.amount}`)
  return parts.join(" ")
}

/**
 * WhatsApp support URL for a flight topic with optional trip context, e.g.
 * "choosing a flight (LOS → DXB on 2026-05-01 for 2 adults)". Numbers stay
 * owned by lib/content/company.ts — this only builds the message.
 */
export function getFlightSupportWhatsAppUrl(
  topic: string,
  trip?: FlightTripContext
): string {
  const detail = trip ? describeFlightTrip(trip) : ""
  const context = detail ? `${topic} (${detail})` : topic
  return getSupportWhatsAppUrl(context)
}
