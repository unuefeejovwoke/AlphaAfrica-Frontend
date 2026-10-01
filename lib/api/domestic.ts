import { z } from "zod"
import { apiGet, SEARCH_TIMEOUT_MS } from "./client.ts"
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
export const DOMESTIC_SSE_META_EVENT = "meta"
export const DOMESTIC_SSE_ERROR_EVENT = "error"
export const DOMESTIC_SSE_RESULT_EVENT = "result"
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
 *
 * QuickAir carries route/times inside `itineraries[].segments[]` (guide §9)
 * with no flat origin/destination/departure fields on search results, while
 * the booking `raw_offer` uses flat `departure`/`destination`/`departureTime`
 * /`arrivalTime` + `providerCode`/`providerName`/`flightNumber` keys. Both
 * shapes are supported: flat fields win when present, itinerary segments
 * fill every gap, and journeys are built from real segments when available.
 */
export function normalizeDomesticCard(
  raw: unknown,
  index: number
): FlightOfferDisplay {
  const record = asRecord(raw)
  const nested = asRecord(
    record.raw_offer ?? record.rawOffer ?? record.flight_offer
  )
  const read = (...keys: string[]) =>
    pickString(
      ...keys.map((key) => record[key]),
      ...keys.map((key) => nested[key])
    )

  const isIataLike = (value: string): boolean =>
    /^[A-Z]{3}$/.test(value.trim().toUpperCase())
  const isTimeLike = (value: string): boolean =>
    /(\d{1,2}:\d{2})/.test(value) || /^\d{4}-\d{2}-\d{2}T/.test(value.trim())

  const formatClock = (iso: string): string => {
    if (!iso || iso === "—") return "—"
    const m = iso.match(/[T ](\d{1,2}:\d{2})/) ?? iso.match(/^(\d{1,2}:\d{2})/)
    if (m) return m[1]
    try {
      const d = new Date(iso)
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-NG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      }
    } catch {
      // fall through to raw
    }
    return iso
  }
  const formatDomesticDuration = (value: string): string => {
    if (!value || value === "—") return "—"
    if (value.startsWith("PT")) {
      const m = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
      if (m) {
        const h = m[1] ? `${m[1]}h` : ""
        const min = m[2] ? `${m[2]}m` : ""
        return [h, min].filter(Boolean).join(" ") || value
      }
    }
    return value
  }
  const datePartOf = (value: string): string =>
    value.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ""
  const dayOffsetBetween = (dep: string, arr: string): number => {
    const depDate = datePartOf(dep)
    const arrDate = datePartOf(arr)
    if (depDate && arrDate) {
      const depT = Date.parse(`${depDate}T00:00:00Z`)
      const arrT = Date.parse(`${arrDate}T00:00:00Z`)
      if (Number.isFinite(depT) && Number.isFinite(arrT)) {
        return Math.max(0, Math.round((arrT - depT) / 86_400_000))
      }
    }
    const clock = (v: string): number | null => {
      const m = v.match(/(\d{1,2}):(\d{2})/)
      if (!m) return null
      const h = Number(m[1])
      const mins = Number(m[2])
      if (h > 23 || mins > 59) return null
      return h * 60 + mins
    }
    const depM = clock(dep)
    const arrM = clock(arr)
    if (depM !== null && arrM !== null && arrM < depM) return 1
    return 0
  }
  const layoverMinutes = (arrIso: string, depIso: string): number | null => {
    if (!arrIso || !depIso) return null
    const a = Date.parse(arrIso)
    const d = Date.parse(depIso)
    if (!Number.isFinite(a) || !Number.isFinite(d)) return null
    const diff = Math.round((d - a) / 60000)
    return diff >= 0 ? diff : null
  }
  const formatLayover = (minutes: number | null): string => {
    if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return "—"
    const total = Math.round(minutes)
    const h = Math.floor(total / 60)
    const m = total % 60
    if (h <= 0) return `${m}m`
    if (m <= 0) return `${h}h`
    return `${h}h ${m}m`
  }

  // Flat time candidates reject bare IATA codes: `departure: "LOS"` is an
  // origin, never a clock time.
  const readTime = (...keys: string[]): string => {
    for (const key of keys) {
      for (const source of [record, nested]) {
        const v = source[key]
        if (typeof v === "string" && v.trim()) {
          const trimmed = v.trim()
          if (isIataLike(trimmed) && !isTimeLike(trimmed)) continue
          return trimmed
        }
      }
    }
    return ""
  }

  // `pickNodeValue` returns a bare string node verbatim — a `"LOS"` departure
  // node would otherwise leak into clock times. Only time-like values survive.
  const readNodeTime = (node: unknown, keys: readonly string[]): string => {
    const v = pickNodeValue(node, keys)
    if (!v) return ""
    if (isIataLike(v) && !isTimeLike(v)) return ""
    return v
  }

  const id =
    read("id", "card_id", "offer_id", "offerId", "flight_id") ||
    `domestic-${index}`
  const airline =
    read(
      "airline",
      "airline_name",
      "airlineName",
      "carrier",
      "carrier_name",
      "carrierName",
      "providerName",
      "provider_name"
    ) || "Airline"
  // Flat route first; itinerary segments fill the gaps below.
  let origin = (
    read(
      "origin",
      "Origin",
      "from",
      "From",
      "origin_code",
      "originCode",
      "departure_airport",
      "departureAirport",
      "departure_code",
      "departureCode"
    ) ||
    pickNodeValue(record.departure, [
      "iataCode",
      "iata_code",
      "code",
      "airport",
      "airportCode",
      "airport_code",
    ]) ||
    pickNodeValue(nested.departure, [
      "iataCode",
      "iata_code",
      "code",
      "airport",
    ]) ||
    ""
  ).toUpperCase()
  // `departure: "LOS"` (QuickAir booking shape) is an origin when it looks
  // like an IATA code rather than a timestamp.
  if (!origin) {
    const depFlat = read("departure", "Departure")
    if (depFlat && isIataLike(depFlat) && !isTimeLike(depFlat)) {
      origin = depFlat.toUpperCase()
    }
  }
  let destination = (
    read(
      "destination",
      "Destination",
      "to",
      "To",
      "destination_code",
      "destinationCode",
      "arrival_airport",
      "arrivalAirport",
      "arrival_code",
      "arrivalCode"
    ) ||
    pickNodeValue(record.arrival, [
      "iataCode",
      "iata_code",
      "code",
      "airport",
      "airportCode",
      "airport_code",
    ]) ||
    pickNodeValue(nested.arrival, [
      "iataCode",
      "iata_code",
      "code",
      "airport",
    ]) ||
    ""
  ).toUpperCase()
  let departureAtRaw =
    readTime(
      "departureAt",
      "departure_at",
      "departureTime",
      "departure_time",
      "depart_at",
      "departAt",
      "departureDateTime",
      "departure_date_time"
    ) ||
    readNodeTime(record.departure, [
      "at",
      "time",
      "dateTime",
      "datetime",
      "date_time",
      "departure_time",
      "departureTime",
    ]) ||
    readNodeTime(nested.departure, ["at", "time", "dateTime", "datetime"]) ||
    ""
  // `departure` itself may carry the timestamp when it is not an IATA code.
  if (!departureAtRaw) {
    const depFlat = read("departure", "Departure")
    if (depFlat && isTimeLike(depFlat)) departureAtRaw = depFlat
  }
  let arrivalAtRaw =
    readTime(
      "arrivalAt",
      "arrival_at",
      "arrivalTime",
      "arrival_time",
      "arrive_at",
      "arriveAt",
      "arrivalDateTime",
      "arrival_date_time"
    ) ||
    readNodeTime(record.arrival, [
      "at",
      "time",
      "dateTime",
      "datetime",
      "date_time",
      "arrival_time",
      "arrivalTime",
    ]) ||
    readNodeTime(nested.arrival, ["at", "time", "dateTime", "datetime"]) ||
    ""
  if (!arrivalAtRaw) {
    const arrFlat = read("arrival", "Arrival")
    if (arrFlat && isTimeLike(arrFlat)) arrivalAtRaw = arrFlat
  }
  // Top-level flight number (QuickAir booking shape) for the synthetic
  // fallback segment when no itinerary segments exist.
  const topFlightNumber =
    read("flightNumber", "flight_number", "flight_no", "flightNo") || ""
  let durationFlat =
    read(
      "duration",
      "flightDuration",
      "flight_duration",
      "totalDuration",
      "total_duration"
    ) || ""
  let cabin = read("cabin", "cabinClass", "cabin_class", "Cabin") || "ECONOMY"
  const flatStops =
    readNumber(record.stops) ??
    readNumber(nested.stops) ??
    readNumber(record.max_stops_in_trip) ??
    readNumber(record.maxStopsInTrip) ??
    readNumber(nested.max_stops_in_trip) ??
    0

  // Itineraries ride top-level on search results (guide §9) and may also be
  // nested under `raw_offer` on some shapes — collect whichever exists.
  const itinerariesRaw: unknown[] = Array.isArray(record.itineraries)
    ? (record.itineraries as unknown[])
    : Array.isArray(nested.itineraries)
      ? (nested.itineraries as unknown[])
      : []
  const getSegmentsOf = (itin: Record<string, unknown>): unknown[] => {
    for (const key of [
      "segments",
      "flightSegments",
      "flight_segments",
      "flights",
      "legs",
    ]) {
      const v = itin[key]
      if (Array.isArray(v)) return v as unknown[]
    }
    return []
  }

  // QuickAir segment endpoints across snake_case / camelCase / booking-shape
  // aliases (`departure_airport` + `departure_time` on search segments,
  // `from`/`to` + `depart_at`/`arrive_at` variants in the wild).
  const segmentEndpoints = (segment: unknown) => {
    const seg = asRecord(segment)
    const depNode = seg.departure
    const arrNode = seg.arrival
    const pickAirport = (...candidates: unknown[]): string =>
      pickString(...candidates).toUpperCase()
    let depAirport = pickAirport(
      seg.departure_airport,
      seg.departureAirport,
      seg.departure_code,
      seg.departureCode,
      seg.origin,
      seg.Origin,
      seg.from,
      seg.From,
      seg.departure_airport_code
    )
    if (!depAirport) {
      const depStr = pickString(seg.departure, seg.Departure)
      if (depStr && isIataLike(depStr) && !isTimeLike(depStr)) {
        depAirport = depStr.toUpperCase()
      } else {
        depAirport = pickNodeValue(depNode, [
          "iataCode",
          "iata_code",
          "code",
          "airport",
          "airportCode",
          "airport_code",
        ]).toUpperCase()
      }
    }
    let arrAirport = pickAirport(
      seg.arrival_airport,
      seg.arrivalAirport,
      seg.arrival_code,
      seg.arrivalCode,
      seg.destination,
      seg.Destination,
      seg.to,
      seg.To,
      seg.arrival_airport_code
    )
    if (!arrAirport) {
      const arrStr = pickString(seg.arrival, seg.Arrival)
      if (arrStr && isIataLike(arrStr) && !isTimeLike(arrStr)) {
        arrAirport = arrStr.toUpperCase()
      } else {
        arrAirport = pickNodeValue(arrNode, [
          "iataCode",
          "iata_code",
          "code",
          "airport",
          "airportCode",
          "airport_code",
        ]).toUpperCase()
      }
    }
    const depTimeCandidates: unknown[] = [
      seg.departureAt,
      seg.departure_at,
      seg.departureTime,
      seg.departure_time,
      seg.depart_at,
      seg.departAt,
      seg.departureDateTime,
      seg.time,
      seg.depart,
    ]
    let depTime = ""
    for (const c of depTimeCandidates) {
      if (typeof c === "string" && c.trim()) {
        const t = c.trim()
        if (isIataLike(t) && !isTimeLike(t)) continue
        depTime = t
        break
      }
    }
    if (!depTime) {
      const depStr = pickString(seg.departure, seg.Departure)
      if (depStr && isTimeLike(depStr)) depTime = depStr
      else {
        const nodeTime = pickNodeValue(depNode, [
          "at",
          "time",
          "dateTime",
          "datetime",
          "date_time",
          "departure_time",
          "departureTime",
        ])
        depTime =
          nodeTime && !(isIataLike(nodeTime) && !isTimeLike(nodeTime))
            ? nodeTime
            : ""
      }
    }
    const arrTimeCandidates: unknown[] = [
      seg.arrivalAt,
      seg.arrival_at,
      seg.arrivalTime,
      seg.arrival_time,
      seg.arrive_at,
      seg.arriveAt,
      seg.arrivalDateTime,
      seg.time,
      seg.arrive,
    ]
    let arrTime = ""
    for (const c of arrTimeCandidates) {
      if (typeof c === "string" && c.trim()) {
        const t = c.trim()
        if (isIataLike(t) && !isTimeLike(t)) continue
        arrTime = t
        break
      }
    }
    if (!arrTime) {
      const arrStr = pickString(seg.arrival, seg.Arrival)
      if (arrStr && isTimeLike(arrStr)) arrTime = arrStr
      else {
        const nodeTime = pickNodeValue(arrNode, [
          "at",
          "time",
          "dateTime",
          "datetime",
          "date_time",
          "arrival_time",
          "arrivalTime",
        ])
        arrTime =
          nodeTime && !(isIataLike(nodeTime) && !isTimeLike(nodeTime))
            ? nodeTime
            : ""
      }
    }
    return {
      depAirport,
      arrAirport,
      depTime,
      arrTime,
      carrierCode: pickString(
        seg.carrier_code,
        seg.carrierCode,
        seg.carrier,
        seg.marketingCarrierCode,
        seg.marketing_carrier_code,
        seg.airline_code,
        seg.airlineCode,
        seg.providerCode,
        seg.provider_code
      ),
      carrierName: pickString(
        seg.carrier_name,
        seg.carrierName,
        seg.airline,
        seg.airline_name,
        seg.airlineName,
        seg.providerName,
        seg.provider_name
      ),
      flightNumber: pickString(
        seg.flight_number,
        seg.flightNumber,
        seg.flight_no,
        seg.flightNo,
        seg.number
      ),
      duration: pickString(
        seg.duration,
        seg.flightDuration,
        seg.flight_duration
      ),
      cabin: pickString(seg.cabin, seg.cabinClass, seg.cabin_class),
      bookingClass: pickString(
        seg.fare_code,
        seg.fareCode,
        seg.class,
        seg.bookingClass,
        seg.booking_class
      ),
      brandedFare: pickString(
        seg.fare_name,
        seg.fareName,
        seg.brandedFare,
        seg.branded_fare
      ),
    }
  }

  // Per-itinerary stop counts: explicit `stops` wins, otherwise segments-1.
  // The worst across itineraries wins trip-wide so nothing reads non-stop
  // wrongly.
  const itineraryStops: number[] = []
  const parsedItineraries: {
    duration: string
    stops: number
    rawSegments: unknown[]
  }[] = []
  for (const item of itinerariesRaw) {
    const itin = asRecord(item)
    const rawSegments = getSegmentsOf(itin)
    const itinStops =
      readNumber(itin.stops) ??
      (rawSegments.length > 0 ? rawSegments.length - 1 : null)
    const safeStops =
      itinStops !== null ? Math.max(0, Math.floor(itinStops)) : 0
    itineraryStops.push(safeStops)
    parsedItineraries.push({
      duration: pickString(
        itin.duration,
        itin.totalDuration,
        itin.total_duration
      ),
      stops: safeStops,
      rawSegments,
    })
  }
  const maxStops =
    itineraryStops.length > 0
      ? Math.max(flatStops, ...itineraryStops)
      : Math.max(0, Math.floor(flatStops))
  const backendDirect =
    record.is_direct ?? record.isDirect ?? nested.is_direct ?? nested.isDirect
  const isDirect =
    typeof backendDirect === "boolean" ? backendDirect : maxStops === 0
  const airlineCode =
    read(
      "airline_code",
      "airlineCode",
      "carrier_code",
      "carrierCode",
      "validating_airline",
      "providerCode",
      "provider_code"
    ) || null
  const fareCode = read("fare_code", "fareCode", "FareCode", "farecode") || null
  const fareName =
    read("fare_name", "fareName", "FareName", "fare_class_name") || null
  const airlineLogo = read("airline_logo", "airlineLogo", "logo") || null
  const seatsAvailable =
    readNumber(
      record.seats_available ??
        record.seatsAvailable ??
        record.numberOfBookableSeats ??
        nested.seats_available ??
        nested.seatsAvailable
    ) ?? null
  // Itinerary duration fills the gap when no flat duration exists (the
  // common QuickAir search shape).
  if (!durationFlat && parsedItineraries.length > 0) {
    durationFlat = parsedItineraries[0]?.duration ?? ""
  }
  // Itinerary endpoints fill route/times when flat fields are absent.
  if (
    parsedItineraries.length > 0 &&
    parsedItineraries[0]?.rawSegments.length
  ) {
    const firstSeg = segmentEndpoints(parsedItineraries[0].rawSegments[0])
    const lastSeg = segmentEndpoints(
      parsedItineraries[0].rawSegments[
        parsedItineraries[0].rawSegments.length - 1
      ]
    )
    if (!origin && firstSeg.depAirport) origin = firstSeg.depAirport
    if (!destination && lastSeg.arrAirport) destination = lastSeg.arrAirport
    if (!departureAtRaw && firstSeg.depTime) departureAtRaw = firstSeg.depTime
    if (!arrivalAtRaw && lastSeg.arrTime) arrivalAtRaw = lastSeg.arrTime
    if (!cabin || cabin === "ECONOMY") {
      const segCabin = firstSeg.cabin
      if (segCabin) cabin = segCabin
    }
  }
  const originFinal = origin || "—"
  const destinationFinal = destination || "—"
  const departureRawFinal = departureAtRaw || ""
  const arrivalRawFinal = arrivalAtRaw || ""
  const duration = formatDomesticDuration(durationFlat) || "—"
  const departureAt = departureRawFinal ? formatClock(departureRawFinal) : "—"
  const arrivalAt = arrivalRawFinal ? formatClock(arrivalRawFinal) : "—"
  const departureDate =
    read("departure_date", "departureDate", "date") ||
    (departureRawFinal ? datePartOf(departureRawFinal) : "")
  const arrivalDate =
    read("arrival_date", "arrivalDate") ||
    (arrivalRawFinal ? datePartOf(arrivalRawFinal) : "")
  const stopsLabel =
    maxStops === 0
      ? "Non-stop"
      : `${maxStops} ${maxStops === 1 ? "stop" : "stops"}`
  const airportsLabel =
    originFinal !== "—" && destinationFinal !== "—"
      ? `${originFinal} → ${destinationFinal}`
      : "—"

  // Full journey timeline: one journey per itinerary with real segments when
  // available; otherwise a single synthetic segment from flat fields.
  const buildPrice = (): string => {
    const merged: Record<string, unknown> = { ...nested, ...record }
    return pickCardPrice(merged)
  }
  const journeys: FlightOfferDisplay["journeys"] =
    parsedItineraries.length > 0 &&
    parsedItineraries.some((p) => p.rawSegments.length > 0)
      ? parsedItineraries.map((parsed, journeyIndex) => {
          const segments = parsed.rawSegments.map((s) => {
            const e = segmentEndpoints(s)
            const segDepRaw = e.depTime || ""
            const segArrRaw = e.arrTime || ""
            return {
              departureAirport: e.depAirport || originFinal,
              arrivalAirport: e.arrAirport || destinationFinal,
              departureAt: segDepRaw ? formatClock(segDepRaw) : "—",
              arrivalAt: segArrRaw ? formatClock(segArrRaw) : "—",
              carrierCode: e.carrierCode || airlineCode || "",
              ...(e.flightNumber || (journeyIndex === 0 ? topFlightNumber : "")
                ? {
                    flightNumber:
                      e.flightNumber ||
                      (journeyIndex === 0 ? topFlightNumber : ""),
                  }
                : {}),
              ...(e.duration || (journeyIndex === 0 ? durationFlat : "")
                ? {
                    duration: formatDomesticDuration(
                      e.duration || durationFlat
                    ),
                  }
                : {}),
              ...(e.cabin || cabin ? { cabin: e.cabin || cabin } : {}),
              departureAtRaw: segDepRaw || null,
              arrivalAtRaw: segArrRaw || null,
              ...(e.bookingClass || (journeyIndex === 0 ? fareCode : null)
                ? {
                    bookingClass:
                      e.bookingClass || (journeyIndex === 0 ? fareCode : null),
                  }
                : {}),
              ...(e.brandedFare || (journeyIndex === 0 ? fareName : null)
                ? {
                    brandedFare:
                      e.brandedFare || (journeyIndex === 0 ? fareName : null),
                  }
                : {}),
            }
          })
          const first = segments[0]
          const last = segments[segments.length - 1]
          const jOrigin = first?.departureAirport ?? originFinal
          const jDestination = last?.arrivalAirport ?? destinationFinal
          const jStops =
            parsed.rawSegments.length > 0
              ? Math.max(parsed.stops, parsed.rawSegments.length - 1)
              : parsed.stops
          const jStopsLabel =
            jStops === 0
              ? "Non-stop"
              : `${jStops} ${jStops === 1 ? "stop" : "stops"}`
          const jDuration = formatDomesticDuration(parsed.duration) || "—"
          const layovers: FlightOfferDisplay["journeys"][number]["layovers"] =
            []
          for (let i = 0; i < segments.length - 1; i++) {
            const arrivalR = segments[i]?.arrivalAtRaw ?? ""
            const departureR = segments[i + 1]?.departureAtRaw ?? ""
            const minutes = layoverMinutes(arrivalR, departureR)
            const airport = segments[i]?.arrivalAirport ?? "—"
            layovers.push({
              airport,
              durationMinutes: minutes,
              durationLabel: formatLayover(minutes),
              overnight:
                datePartOf(arrivalR) !== "" &&
                datePartOf(departureR) !== "" &&
                datePartOf(arrivalR) !== datePartOf(departureR),
              terminalChange: null,
            })
          }
          return {
            index: journeyIndex,
            duration: jDuration,
            stops: jStops,
            stopsLabel: jStopsLabel,
            origin: jOrigin,
            destination: jDestination,
            airportsLabel:
              jOrigin !== "—" && jDestination !== "—"
                ? `${jOrigin} → ${jDestination}`
                : "—",
            segments,
            layovers,
          }
        })
      : [
          {
            index: 0,
            duration,
            stops: maxStops,
            stopsLabel,
            origin: originFinal,
            destination: destinationFinal,
            airportsLabel,
            segments: [
              {
                departureAirport: originFinal,
                arrivalAirport: destinationFinal,
                departureAt,
                arrivalAt,
                carrierCode: airlineCode || "",
                ...(topFlightNumber ? { flightNumber: topFlightNumber } : {}),
                ...(duration !== "—" ? { duration } : {}),
                ...(cabin ? { cabin } : {}),
                departureAtRaw: departureRawFinal || null,
                arrivalAtRaw: arrivalRawFinal || null,
                ...(fareCode ? { bookingClass: fareCode } : {}),
                ...(fareName ? { brandedFare: fareName } : {}),
              },
            ],
            layovers: [],
          },
        ]

  return {
    id,
    airline,
    airlineCode,
    validatingAirline: null,
    departureAt,
    arrivalAt,
    departureDate: departureDate || null,
    arrivalDate: arrivalDate || null,
    arrivalDayOffset: dayOffsetBetween(departureRawFinal, arrivalRawFinal),
    duration,
    stops: maxStops,
    stopsLabel,
    maxStopsInTrip: maxStops,
    stopsPerItinerary: itineraryStops.length > 0 ? itineraryStops : null,
    isDirect,
    origin: originFinal,
    destination: destinationFinal,
    airportsLabel,
    cabin,
    bookingClass: fareCode,
    fareBrand: fareName,
    fareCode,
    fareName,
    airlineLogo,
    baggage: read("baggage", "checked_baggage", "checkedBaggage") || null,
    checkedBags: null,
    cabinBags: null,
    price: buildPrice(),
    currency: "NGN",
    priceBreakdown: null,
    fareRules: null,
    amenities: [],
    seatsAvailable,
    lastTicketingDate: null,
    journeys,
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
  // Only explicit search-reference keys — a bare card `id`/`offer_id` must
  // never pollute the visible search reference.
  for (const key of ["search_id", "searchId", "searchID"]) {
    const v = rec[key]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}

/**
 * True only when an SSE `data` payload looks like a flight result.
 * The guide's `meta` event (`{ search_id }`) and `error` envelopes carry no
 * flight fields — they must never become selectable cards.
 */
export function isDomesticResultPayload(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false
  const rec = data as Record<string, unknown>
  const flightKeys = [
    "airline",
    "airline_name",
    "airlineName",
    "carrier",
    "carrier_name",
    "carrierName",
    "providerName",
    "provider_name",
    "flightNumber",
    "flight_number",
    "flight_id",
    "offer_id",
    "offerId",
    "origin",
    "Origin",
    "from",
    "destination",
    "Destination",
    "to",
    "departure",
    "departureTime",
    "departure_time",
    "departureAt",
    "departure_at",
    "arrival",
    "arrivalTime",
    "arrival_time",
    "arrivalAt",
    "arrival_at",
    "price",
    "amount",
    "total_amount",
    "totalAmount",
    "total_price",
    "totalPrice",
    "fare_code",
    "fareCode",
    "fare_name",
    "fareName",
    "itineraries",
  ]
  return flightKeys.some((key) => {
    const v = rec[key]
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === "object" && v !== null)
      return Object.keys(v as Record<string, unknown>).length > 0
    return v !== undefined && v !== null && v !== ""
  })
}

/** Human-readable message from an SSE `error` event payload, if any. */
export function getSseErrorMessage(data: unknown): string | null {
  if (typeof data === "string") {
    const trimmed = data.trim()
    return trimmed ? trimmed : null
  }
  if (typeof data !== "object" || data === null) return null
  const rec = data as Record<string, unknown>
  for (const key of ["error", "message", "detail"]) {
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
    timeoutMs: SEARCH_TIMEOUT_MS,
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
