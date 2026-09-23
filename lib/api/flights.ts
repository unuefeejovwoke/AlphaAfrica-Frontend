import { z } from "zod"
import { ApiError, apiGet, apiPost } from "./client.ts"
import { getSupportWhatsAppUrl } from "../content/company.ts"
import { futureDateStringSchema } from "./validation.ts"
import {
  travellerCompositionSchema,
  travellerPartyBaseSchema,
} from "../schemas/travel.ts"
import type { BookingTravellersPayload } from "../schemas/travel.ts"

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
// Airport search: 2-char minimum, dedup, cache
// Uses centralized apiGet (ISR noStore) so base URL stays hidden
// ---------------------------------------------------------------------------

export async function searchAirports(query: string): Promise<Airport[]> {
  const trimmed = query.trim()
  if (trimmed.length < AIRPORT_MIN_CHARS) return []

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
    } catch {
      return []
    } finally {
      airportPendingRequests.delete(key)
    }
  })()

  airportPendingRequests.set(key, promise)
  return promise
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
 * - Cabin is a single global selection applied to every leg in v1 while the
 *   contract stays per-leg capable (each leg carries its own cabin value).
 * - Party rules reuse travellerCompositionSchema in every branch.
 */

// Leg-editor bounds shared by validation and the LegFields UI.
export const MIN_MULTI_CITY_LEGS = 2
export const MAX_LEGS = 6

export function createEmptyLeg(): {
  origin: string
  destination: string
  date: string
} {
  return { origin: "", destination: "", date: "" }
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
// distinct airports per leg. Cabin stays per-leg capable; v1 fills the global
// cabin at request mapping (toFlightSearchRequest).
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
 */
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
    cabin,
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
        legs: payload.legs.map((leg) => ({
          origin: leg.origin,
          destination: leg.destination,
          date: leg.date,
          cabin,
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

export interface FlightOfferDisplay {
  id: string
  airline: string
  departureAt: string
  arrivalAt: string
  duration: string
  stops: number
  stopsLabel: string
  origin: string
  destination: string
  airportsLabel: string
  cabin: string
  baggage: string | null
  price: string
  currency: string
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
  const timeMatch = iso.match(/T(\d{2}:\d{2})/)
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

/** Hide Amadeus-vs-normalized segment shape walk behind one helper. */
function getSegmentEndpoints(segment: unknown): {
  departureAt: string
  arrivalAt: string
  departureAirport: string
  arrivalAirport: string
  cabin: string
} {
  const seg = segment as Record<string, unknown>
  const dep = seg.departure as Record<string, string> | undefined
  const arr = seg.arrival as Record<string, string> | undefined
  return {
    departureAt: (seg.departureAt as string) ?? dep?.at ?? "",
    arrivalAt: (seg.arrivalAt as string) ?? arr?.at ?? "",
    departureAirport: (seg.departureAirport as string) ?? dep?.iataCode ?? "",
    arrivalAirport: (seg.arrivalAirport as string) ?? arr?.iataCode ?? "",
    cabin: (seg.cabin as string) ?? "",
  }
}

export function normalizeFlightOffer(
  offer: FlightOffer,
  index: number
): FlightOfferDisplay {
  const id = (offer.id as string) || `offer-${index}`
  const airline =
    offer.airline ||
    (Array.isArray(offer.validatingAirlineCodes) &&
      offer.validatingAirlineCodes[0]) ||
    "Airline"

  // Try itineraries first
  let departureAt = (offer.departure as string) || ""
  let arrivalAt = (offer.arrival as string) || ""
  let duration = (offer.duration as string) || ""
  let stops: number | undefined = offer.stops as number | undefined
  let origin = (offer.origin as string) || ""
  let destination = (offer.destination as string) || ""
  let cabin = (offer.cabin as string) || "ECONOMY"
  const baggage = (offer.baggage as string | null) ?? null

  if (Array.isArray(offer.itineraries) && offer.itineraries.length > 0) {
    const itin = offer.itineraries[0]
    const segs = itin.segments ?? []
    if (segs.length > 0) {
      const firstEndpoints = getSegmentEndpoints(segs[0])
      const lastEndpoints = getSegmentEndpoints(segs[segs.length - 1])
      if (firstEndpoints.departureAt) departureAt = firstEndpoints.departureAt
      if (lastEndpoints.arrivalAt) arrivalAt = lastEndpoints.arrivalAt
      if (firstEndpoints.departureAirport)
        origin = firstEndpoints.departureAirport
      if (lastEndpoints.arrivalAirport)
        destination = lastEndpoints.arrivalAirport
      if (itin.duration) duration = itin.duration
      stops = segs.length > 0 ? segs.length - 1 : 0
      if (firstEndpoints.cabin) cabin = firstEndpoints.cabin
    }
  }

  const { amount, currency } = extractPrice(offer)

  const stopsLabel =
    stops === undefined
      ? "—"
      : stops === 0
        ? "Non-stop"
        : `${stops} ${stops === 1 ? "stop" : "stops"}`
  const airportsLabel =
    origin && destination ? `${origin} → ${destination}` : "—"

  return {
    id,
    airline,
    departureAt: departureAt ? formatTime(departureAt) : "—",
    arrivalAt: arrivalAt ? formatTime(arrivalAt) : "—",
    duration: duration ? formatDuration(duration) : "—",
    stops: stops ?? 0,
    stopsLabel,
    origin: origin || "—",
    destination: destination || "—",
    airportsLabel,
    cabin,
    baggage,
    price: amount,
    currency,
    raw: offer,
  }
}

// ---------------------------------------------------------------------------
// International search via centralized apiPost (ticket 01).
// Domestic auto-routing (both-Nigerian → QuickAir SSE proxy, ADR-0004) lands
// in ticket 03 — this slice intentionally serves the Amadeus legs path only.
// ---------------------------------------------------------------------------

export async function searchFlights(
  payload: FlightSearchPayload
): Promise<FlightOffer[]> {
  const body = toFlightSearchRequest(payload)
  const raw = await apiPost<unknown, typeof body>("/api/flights/search/", body)
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
  const value = Number(amount)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

function koboToMoneyString(kobo: number): string {
  return (kobo / 100).toFixed(2)
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
  const diffKobo = revalidatedKobo - selectedKobo
  return {
    status: "changed",
    previousTotal: koboToMoneyString(selectedKobo),
    newTotal: koboToMoneyString(revalidatedKobo),
    difference: koboToMoneyString(Math.abs(diffKobo)),
    increased: diffKobo > 0,
    currency: CURRENCY,
  }
}

const EXPIRED_OFFER_PATTERN =
  /expir|no longer (available|valid)|unavailable|not found|invalid offer|stale|offer .*gone/i

/**
 * Map a price-confirmation failure to the expired branch. A 404/410 means the
 * offer is gone; a 400/422 carrying expired copy means the airline withdrew
 * the fare. Everything else is a retryable error, never an expiry.
 */
export function isOfferExpiredError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  if (error.status === 404 || error.status === 410) return true
  if (error.status === 400 || error.status === 422) {
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
 * Revalidate a selected Flight Offer against the live airline fare.
 * Sends the opaque blob via centralized `apiPost` (no-store). Throws a typed
 * `ApiError` on failure — callers map expiry via `isOfferExpiredError`.
 */
export async function confirmFlightPrice(
  flightOfferBlob: unknown
): Promise<FlightOffer> {
  const raw = await apiPost<unknown, { flight_offer: unknown }>(
    "/api/flights/price/",
    {
      flight_offer: flightOfferBlob,
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

/** Persist the selected Flight Offer blob (memory caller + sessionStorage backup). */
export function saveSelectedOffer(offer: FlightOffer): void {
  writeOfferToSession(SELECTED_OFFER_SESSION_KEY, offer)
}

/** Read back the selected Flight Offer blob, or null when absent/corrupt. */
export function readSelectedOffer(): FlightOffer | null {
  return readOfferFromSession(SELECTED_OFFER_SESSION_KEY)
}

/** Copy the Confirmed Offer into session for ticket 06 (traveller entry). */
export function saveConfirmedOffer(offer: FlightOffer): void {
  writeOfferToSession(CONFIRMED_OFFER_SESSION_KEY, offer)
}

/** Read back the Confirmed Offer, or null when absent/corrupt. */
export function readConfirmedOffer(): FlightOffer | null {
  return readOfferFromSession(CONFIRMED_OFFER_SESSION_KEY)
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
