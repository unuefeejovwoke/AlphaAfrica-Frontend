import { z } from "zod"
import { apiGet } from "./client.ts"
import { asRecord, pickNodeValue, pickString } from "./flights.ts"
import type { Airport } from "./flights.ts"
import type { FlightOfferDisplay } from "./flights.ts"

/**
 * Domestic streaming domain — Phase 3, ticket 03.
 *
 * - Auto-routing: both-Nigerian origin+destination → QuickAir SSE proxy,
 *   otherwise the international Amadeus legs path (ADR-0004). No manual
 *   toggle in v1; backend remains the authority for classification.
 * - SSE proxy pipes the backend event stream verbatim (force-dynamic,
 *   no-store); the client reads progressively with AbortController and
 *   falls back to blocking `local-search` on stream error/timeout.
 * - Domestic Flight Cards carry no opaque offer blob (CONTEXT.md).
 */

// ---------------------------------------------------------------------------
// Canonical Nigerian-airport list for auto-detection
// Backend remains the authority; source + refresh cadence still needs an
// owner (spec §77). Country-code from autocomplete is trusted first so a
// missing IATA here never misroutes a known NG airport.
// ---------------------------------------------------------------------------

export const NIGERIAN_AIRPORT_IATAS: ReadonlySet<string> = new Set([
  "LOS", // Lagos — Murtala Muhammed
  "ABV", // Abuja — Nnamdi Azikiwe
  "PHC", // Port Harcourt
  "KAN", // Kano — Mallam Aminu Kano
  "ENU", // Enugu — Akanu Ibiam
  "QUO", // Uyo — Victor Attah
  "ABB", // Asaba
  "BNI", // Benin City
  "CBQ", // Calabar — Margaret Ekpo
  "IBA", // Ibadan
  "ILR", // Ilorin
  "JOS", // Jos — Yakubu Gowon
  "KAD", // Kaduna
  "SKO", // Sokoto — Sultan Abubakar III
  "MIU", // Maiduguri
  "YOL", // Yola
  "QOW", // Owerri — Sam Mbakwe
  "AKR", // Akure
  "ZAR", // Zaria
  "KAA", // Kaduna alternative code seen in the wild
])

function normalizeIata(code: string): string {
  return code.trim().toUpperCase()
}

export function isNigerianAirport(input: Airport | string): boolean {
  if (typeof input === "string") {
    const code = normalizeIata(input)
    if (code.length !== 3) return false
    return NIGERIAN_AIRPORT_IATAS.has(code)
  }
  const countryCode = (input.country_code ?? "").trim().toUpperCase()
  if (countryCode === "NG") return true
  const countryName = (input.country_name ?? "").trim().toLowerCase()
  if (countryName === "nigeria") return true
  return NIGERIAN_AIRPORT_IATAS.has(normalizeIata(input.iata_code ?? ""))
}

/** Both-Nigerian origin+destination → domestic streaming path. */
export function isDomesticSearch(
  origin: Airport | string,
  destination: Airport | string
): boolean {
  return isNigerianAirport(origin) && isNigerianAirport(destination)
}

// ---------------------------------------------------------------------------
// SSE fallback trigger — pure seam under test
// ---------------------------------------------------------------------------

export type SseTerminalReason = "error" | "timeout" | "aborted" | "completed"

/**
 * Stream error/timeout automatically falls back to the blocking domestic
 * search; clean completion or user abort (new search / unmount) never does.
 */
export function shouldFallbackToBlocking(reason: SseTerminalReason): boolean {
  return reason === "error" || reason === "timeout"
}

// ---------------------------------------------------------------------------
// Domestic search params + card shape
// ---------------------------------------------------------------------------

export const DOMESTIC_STREAM_TIMEOUT_MS = 75_000
export const DOMESTIC_SSE_DONE_EVENT = "done"
export const DOMESTIC_STREAM_PROXY_PATH = "/api/flights/domestic-stream"

export interface DomesticSearchParams {
  origin: string
  destination: string
  date: string
  adults?: number
  children?: number
  infants?: number
  return_date?: string | null
}

const domesticParamsSchema = z.object({
  origin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
  destination: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(9).optional().default(1),
  children: z.number().int().min(0).max(9).optional().default(0),
  infants: z.number().int().min(0).max(9).optional().default(0),
  return_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
})

/** Server-side validation — API responses/params are untrusted (spec §59). */
export function parseDomesticParams(
  input: unknown
): DomesticSearchParams | null {
  const parsed = domesticParamsSchema.safeParse(input)
  return parsed.success ? parsed.data : null
}

/** Only safe primitives ever reach the URL — never opaque blobs. */
export function toDomesticQuery(
  params: DomesticSearchParams
): Record<string, string> {
  const q: Record<string, string> = {
    origin: normalizeIata(params.origin),
    destination: normalizeIata(params.destination),
    date: params.date,
    adults: String(params.adults ?? 1),
    children: String(params.children ?? 0),
    infants: String(params.infants ?? 0),
  }
  if (params.return_date) q.return_date = params.return_date
  return q
}

// Permissive QuickAir card — fields may be missing (spec §55 defensive).
export const domesticCardSchema = z
  .object({
    id: z.string().optional(),
    airline: z.string().optional(),
    carrier: z.string().optional(),
    origin: z.string().optional(),
    destination: z.string().optional(),
    departure: z.string().optional(),
    arrival: z.string().optional(),
    departureTime: z.string().optional(),
    arrivalTime: z.string().optional(),
    departureAt: z.string().optional(),
    arrivalAt: z.string().optional(),
    duration: z.string().optional(),
    stops: z.number().int().min(0).optional(),
    price: z.unknown().optional(),
    amount: z.unknown().optional(),
    total_amount: z.string().optional(),
    currency: z.string().optional(),
    cabin: z.string().optional(),
  })
  .passthrough()

export type DomesticFlightCard = z.infer<typeof domesticCardSchema>

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function cardPriceToString(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) return raw.trim()
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw)
  return "—"
}

function pickCardPrice(record: Record<string, unknown>): string {
  const candidates: unknown[] = [
    record.total_amount,
    record.totalAmount,
    record.total_price,
    record.totalPrice,
    record.amount,
    record.price,
  ]
  const nested = record.price
  if (typeof nested === "object" && nested !== null) {
    const price = nested as Record<string, unknown>
    candidates.push(price.total, price.grandTotal, price.amount, price.value)
  }
  for (const candidate of candidates) {
    const value = cardPriceToString(candidate)
    if (value !== "—") return value
  }
  return "—"
}

/**
 * Normalize a QuickAir card to the shared card-display shape so the
 * existing FlightOfferCard renders it with no duplicate UI.
 * No opaque blob is attached — domestic cards carry none (CONTEXT.md).
 *
 * Field extraction reads the raw record directly (with snake_case and
 * camelCase aliases) so one unexpected field type never discards the whole
 * card — missing data must never hide a bookable option.
 */
export function normalizeDomesticCard(
  raw: unknown,
  index: number
): FlightOfferDisplay {
  const record = asRecord(raw)
  const read = (...keys: string[]) =>
    pickString(...keys.map((key) => record[key]))

  const id =
    read("id", "card_id", "offer_id", "flight_id") || `domestic-${index}`
  const airline =
    read("airline", "airline_name", "airlineName", "carrier", "carrier_name") ||
    "Airline"
  const origin =
    (
      read(
        "origin",
        "from",
        "origin_code",
        "departure_airport",
        "departureAirport"
      ) ||
      pickNodeValue(record.departure, [
        "iataCode",
        "iata_code",
        "code",
        "airport",
      ])
    ).toUpperCase() || "—"
  const destination =
    (
      read(
        "destination",
        "to",
        "destination_code",
        "arrival_airport",
        "arrivalAirport"
      ) ||
      pickNodeValue(record.arrival, [
        "iataCode",
        "iata_code",
        "code",
        "airport",
      ])
    ).toUpperCase() || "—"
  const departureAt =
    read(
      "departureAt",
      "departure_at",
      "departureTime",
      "departure_time",
      "departure",
      "departureDate",
      "departure_date"
    ) ||
    pickNodeValue(record.departure, [
      "at",
      "time",
      "dateTime",
      "datetime",
      "date_time",
    ]) ||
    "—"
  const arrivalAt =
    read(
      "arrivalAt",
      "arrival_at",
      "arrivalTime",
      "arrival_time",
      "arrival",
      "arrivalDate",
      "arrival_date"
    ) ||
    pickNodeValue(record.arrival, [
      "at",
      "time",
      "dateTime",
      "datetime",
      "date_time",
    ]) ||
    "—"
  const stops = Math.max(0, Math.floor(readNumber(record.stops) ?? 0))
  const duration = read("duration", "flightDuration", "flight_duration") || "—"
  const cabin = read("cabin", "cabinClass", "cabin_class") || "ECONOMY"
  const departureDate =
    read("departure_date", "departureDate", "date") ||
    (departureAt !== "—"
      ? (departureAt.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "")
      : "")
  const arrivalDate =
    read("arrival_date", "arrivalDate") ||
    (arrivalAt !== "—" ? (arrivalAt.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "") : "")
  const stopsLabel =
    stops === 0 ? "Non-stop" : `${stops} ${stops === 1 ? "stop" : "stops"}`

  return {
    id,
    airline,
    airlineCode: null,
    validatingAirline: null,
    departureAt,
    arrivalAt,
    departureDate: departureDate || null,
    arrivalDate: arrivalDate || null,
    arrivalDayOffset: 0,
    duration,
    stops,
    stopsLabel,
    origin,
    destination,
    airportsLabel:
      origin !== "—" && destination !== "—"
        ? `${origin} → ${destination}`
        : "—",
    cabin,
    bookingClass: null,
    fareBrand: null,
    baggage: read("baggage", "checked_baggage", "checkedBaggage") || null,
    checkedBags: null,
    cabinBags: null,
    price: pickCardPrice(record),
    currency: "NGN",
    priceBreakdown: null,
    fareRules: null,
    amenities: [],
    seatsAvailable: null,
    lastTicketingDate: null,
    journeys: [
      {
        index: 0,
        duration,
        stops,
        stopsLabel,
        origin,
        destination,
        airportsLabel:
          origin !== "—" && destination !== "—"
            ? `${origin} → ${destination}`
            : "—",
        segments: [
          {
            departureAirport: origin,
            arrivalAirport: destination,
            departureAt,
            arrivalAt,
            carrierCode: airline,
            ...(duration !== "—" ? { duration } : {}),
            departureAtRaw: departureAt !== "—" ? departureAt : null,
            arrivalAtRaw: arrivalAt !== "—" ? arrivalAt : null,
          },
        ],
        layovers: [],
      },
    ],
    raw: { ...record, id },
  }
}

// ---------------------------------------------------------------------------
// SSE event parsing (no E2E test in v1 — seam test covers fallback trigger)
// ---------------------------------------------------------------------------

export interface ParsedSseEvent {
  event: string
  data: unknown
  searchId: string | null
}

export function extractSearchId(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null
  const rec = data as Record<string, unknown>
  for (const key of ["search_id", "searchId", "searchID", "id"]) {
    const v = rec[key]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}

/** Parse one SSE block (`event: …` + `data: …` lines) into card/done. */
export function parseSseEventBlock(block: string): ParsedSseEvent | null {
  const trimmed = block.trim()
  if (!trimmed) return null
  let event = "message"
  const dataLines: string[] = []
  for (const line of trimmed.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim() || "message"
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim())
    }
  }
  if (dataLines.length === 0) return null
  const payload = dataLines.join("\n")
  let data: unknown = payload
  try {
    data = JSON.parse(payload) as unknown
  } catch {
    // Keep raw string — caller treats unparseable data as ignorable.
  }
  // The search reference rides early: card events may already carry
  // search_id/searchId, and the terminal done envelope may nest the id or
  // carry it as a bare string. Capture whenever present so the UI shows the
  // reference early and retains it on completion.
  const searchId =
    extractSearchId(data) ??
    (event === DOMESTIC_SSE_DONE_EVENT &&
    typeof data === "string" &&
    data.trim()
      ? data.trim()
      : null)
  return { event, data, searchId }
}

// ---------------------------------------------------------------------------
// Blocking fallback — GET /api/flights/local-search/ (30-60s, no-store)
// ---------------------------------------------------------------------------

export interface FetchDomesticBlockingOptions {
  signal?: AbortSignal
}

export async function fetchDomesticBlocking(
  params: DomesticSearchParams,
  options: FetchDomesticBlockingOptions = {}
): Promise<DomesticFlightCard[]> {
  const raw = await apiGet<unknown>("/api/flights/local-search/", {
    query: toDomesticQuery(params),
    noStore: true,
    sameOrigin: true,
    ...(options.signal ? { signal: options.signal } : {}),
  })
  if (Array.isArray(raw)) return raw as DomesticFlightCard[]
  if (typeof raw === "object" && raw !== null) {
    const rec = raw as Record<string, unknown>
    for (const key of ["results", "data", "cards", "offers", "flights"]) {
      if (Array.isArray(rec[key])) return rec[key] as DomesticFlightCard[]
    }
  }
  return []
}

// ---------------------------------------------------------------------------
// Domestic booking branch — session-backed handoff that never submits card
// fields as an opaque Amadeus blob. Domestic Flight Cards carry no
// `flight_offer`/`itineraries`/`validatingAirlineCodes`; the fare-confirmation
// step takes this explicit branch and skips Amadeus revalidation entirely.
// ---------------------------------------------------------------------------

export const SELECTED_DOMESTIC_CARD_SESSION_KEY =
  "alphaa:selected-domestic-card:v1"

/**
 * True when the raw selection looks like a Domestic Flight Card rather than
 * an opaque Amadeus Flight Offer: no `flight_offer` blob, no `itineraries`,
 * no `validatingAirlineCodes`. Defensive — unknown shapes default to false
 * (Amadeus path) so a fare is never booked without revalidation by mistake.
 */
export function isDomesticFlightCard(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null) return false
  const rec = raw as Record<string, unknown>
  // Amadeus blobs in either casing always mean an international offer.
  if (rec.raw_offer !== undefined && rec.raw_offer !== null) return false
  if (rec.flight_offer !== undefined && rec.flight_offer !== null) return false
  if (Array.isArray(rec.itineraries) && rec.itineraries.length > 0) return false
  if (
    Array.isArray(rec.validatingAirlineCodes) &&
    rec.validatingAirlineCodes.length > 0
  ) {
    return false
  }
  // Domestic cards always carry an origin/destination pair in some casing.
  const hasRoute =
    (typeof rec.origin === "string" && typeof rec.destination === "string") ||
    (typeof rec.Origin === "string" && typeof rec.Destination === "string")
  return hasRoute
}

export type BookingBranch = "domestic" | "international"

/** Origin/destination from a card's flat fields or its first/last segment. */
function readCardRoute(
  raw: unknown
): { origin: string; destination: string } | null {
  const record = asRecord(raw)
  const directOrigin = pickString(
    record.origin,
    record.Origin,
    record.departure_airport,
    record.departureAirport
  )
  const directDestination = pickString(
    record.destination,
    record.Destination,
    record.arrival_airport,
    record.arrivalAirport
  )
  if (directOrigin && directDestination) {
    return {
      origin: directOrigin.toUpperCase(),
      destination: directDestination.toUpperCase(),
    }
  }
  const itineraries = Array.isArray(record.itineraries)
    ? record.itineraries
    : []
  const firstItinerary = asRecord(itineraries[0])
  const segments = Array.isArray(firstItinerary.segments)
    ? (firstItinerary.segments as unknown[])
    : []
  if (segments.length === 0) return null
  const first = asRecord(segments[0])
  const last = asRecord(segments[segments.length - 1])
  const origin =
    pickString(first.departure_airport, first.departureAirport) ||
    pickNodeValue(first.departure, ["iataCode", "iata_code", "code"])
  const destination =
    pickString(last.arrival_airport, last.arrivalAirport) ||
    pickNodeValue(last.arrival, ["iataCode", "iata_code", "code"])
  if (!origin || !destination) return null
  return {
    origin: origin.toUpperCase(),
    destination: destination.toUpperCase(),
  }
}

/**
 * Single booking-branch resolver shared by selection and fare confirmation.
 * The route decides first (same both-Nigerian rule the search uses), so a
 * flat international card can never be mistaken for a Domestic Flight Card.
 * The live search mode wins; shape inference is only the fallback when the
 * route cannot be read at all.
 */
export function resolveBookingBranch(
  searchMode: "domestic" | "international" | null,
  raw: unknown
): BookingBranch {
  if (searchMode === "domestic") return "domestic"
  const route = readCardRoute(raw)
  if (route) {
    return isDomesticSearch(route.origin, route.destination)
      ? "domestic"
      : "international"
  }
  return isDomesticFlightCard(raw) ? "domestic" : "international"
}

function writeDomesticCardToSession(
  key: string,
  card: DomesticFlightCard
): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(card))
  } catch {
    // sessionStorage may throw in private mode — memory copy still works
  }
}

function readDomesticCardFromSession(key: string): DomesticFlightCard | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== "object" || parsed === null) return null
    return parsed as DomesticFlightCard
  } catch {
    return null
  }
}

// In-memory handoff mirroring the Amadeus blob flow: the selecting page holds
// the card while sessionStorage backs refresh and back navigation.
let memorySelectedDomesticCard: DomesticFlightCard | null = null

/** Persist the selected Domestic Flight Card (memory caller + session backup). */
export function saveSelectedDomesticCard(card: DomesticFlightCard): void {
  memorySelectedDomesticCard = card
  writeDomesticCardToSession(SELECTED_DOMESTIC_CARD_SESSION_KEY, card)
}

/** Read back the selected Domestic Flight Card, or null when absent/corrupt. */
export function readSelectedDomesticCard(): DomesticFlightCard | null {
  return (
    memorySelectedDomesticCard ??
    readDomesticCardFromSession(SELECTED_DOMESTIC_CARD_SESSION_KEY)
  )
}

/** Drop the selected Domestic Flight Card from memory and session (branch switches). */
export function clearSelectedDomesticCard(): void {
  memorySelectedDomesticCard = null
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(SELECTED_DOMESTIC_CARD_SESSION_KEY)
  } catch {
    // ignore — memory copy already cleared
  }
}
