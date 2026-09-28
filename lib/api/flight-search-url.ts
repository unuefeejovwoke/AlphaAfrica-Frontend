import {
  type Airport,
  type Cabin,
  type FlightSearchFormValues,
  type FlightSearchPayload,
  tripTypeSchema,
} from "./flights.ts"

/**
 * Shared flight search URL contract (home + flights page).
 *
 * Pure move of the builder/parser previously owned by the flights page
 * client — home submit and flights hydration now read and write identical
 * URL search state from this one implementation, so a search started on
 * home auto-searches correctly on the flights page with no drift.
 *
 * - Form layer stays RHF + Zod; the discriminated trip union remains the
 *   single domain source of truth — this module never duplicates Zod rules.
 * - Currency is fixed NGN; opaque Flight Offer blobs never enter the URL.
 * - Invalid or partial URL state parses to `isValid: false` and must never
 *   trigger a search (callers gate auto-search on the flag).
 */

export const FLIGHT_TRIP_TYPES = [
  "one_way",
  "round_trip",
  "multi_city",
] as const
export type FlightTripType = (typeof FLIGHT_TRIP_TYPES)[number]

const VALID_CABINS = [
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
] as const

export interface ParsedFlightLeg {
  origin: string
  destination: string
  date: string
  cabin: Cabin
}

function parseLegCabin(value: unknown, fallback: Cabin): Cabin {
  return (VALID_CABINS as readonly string[]).includes(value as string)
    ? (value as Cabin)
    : fallback
}

/** Multi-city legs ride in one `legs` query param as JSON (opaque fare blobs never in URL). */
export function parseFlightLegsParam(
  raw: string | null,
  fallbackCabin: Cabin = "ECONOMY"
): ParsedFlightLeg[] | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return undefined
    const legs: ParsedFlightLeg[] = []
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue
      const l = item as Record<string, unknown>
      if (
        typeof l.origin !== "string" ||
        typeof l.destination !== "string" ||
        typeof l.date !== "string"
      ) {
        continue
      }
      legs.push({
        origin: l.origin.toUpperCase(),
        destination: l.destination.toUpperCase(),
        date: l.date,
        // Old shared links carry no per-leg cabin — inherit the global one.
        cabin: parseLegCabin(l.cabin, fallbackCabin),
      })
    }
    return legs.length >= 2 ? legs : undefined
  } catch {
    return undefined
  }
}

function lightAirport(iata: string): Airport | null {
  return /^[A-Z]{3}$/.test(iata)
    ? ({
        iata_code: iata,
        name: iata,
        city: "",
        country_name: "",
        country_code: "",
      } as Airport)
    : null
}

export interface FlightSearchPayloadCandidate {
  trip_type?: unknown
  origin?: unknown
  destination?: unknown
  departureDate?: unknown
  returnDate?: unknown
  legs?: unknown
  adults?: unknown
  children?: unknown
  infants?: unknown
  cabin?: unknown
  non_stop?: unknown
  max_stops?: unknown
}

/**
 * Single shared parser for candidate state → validated payload.
 * Delegates to the tripTypeSchema discriminated union so URL hydration
 * enforces exactly the same rules as the form (return≥departure,
 * chronological multi-city chain, 2–6 legs).
 */
export function parseFlightSearchPayload(
  candidate: FlightSearchPayloadCandidate
) {
  const trip_type: FlightTripType =
    candidate.trip_type === "round_trip" || candidate.trip_type === "multi_city"
      ? candidate.trip_type
      : "one_way"
  return tripTypeSchema.safeParse({
    trip_type,
    origin:
      typeof candidate.origin === "string"
        ? candidate.origin.toUpperCase()
        : candidate.origin,
    destination:
      typeof candidate.destination === "string"
        ? candidate.destination.toUpperCase()
        : candidate.destination,
    departureDate: candidate.departureDate,
    returnDate: candidate.returnDate,
    legs: Array.isArray(candidate.legs)
      ? candidate.legs.map((leg) => {
          if (typeof leg !== "object" || leg === null) return leg
          const l = leg as Record<string, unknown>
          return {
            ...l,
            origin:
              typeof l.origin === "string" ? l.origin.toUpperCase() : l.origin,
            destination:
              typeof l.destination === "string"
                ? l.destination.toUpperCase()
                : l.destination,
            cabin:
              typeof l.cabin === "string" ? l.cabin.toUpperCase() : l.cabin,
          }
        })
      : candidate.legs,
    adults: candidate.adults,
    children: candidate.children,
    infants: candidate.infants,
    cabin: candidate.cabin,
    currency: "NGN",
    non_stop: candidate.non_stop,
    max_stops: candidate.max_stops,
  })
}

export interface FlightSearchUrlState {
  values: Partial<FlightSearchFormValues>
  originAirport: Airport | null
  destinationAirport: Airport | null
  legAirports: { origin: Airport | null; destination: Airport | null }[]
  isValid: boolean
}

/**
 * Read URL search state into form values plus light airports.
 * Never throws; unknown codes stay IATA-only — Zod + backend remain the
 * authority. Manual home entry must still pick via autocomplete (the form
 * enforces a selectedAirport match); shared/back/refresh URLs hydrate a
 * light Airport so the form shows the IATA and can submit without re-typing.
 */
export function parseFlightSearchUrl(
  searchParams: URLSearchParams
): FlightSearchUrlState {
  const tripRaw = searchParams.get("trip_type") ?? "one_way"
  const trip_type: FlightTripType = (
    FLIGHT_TRIP_TYPES as readonly string[]
  ).includes(tripRaw)
    ? (tripRaw as FlightTripType)
    : "one_way"
  const origin = searchParams.get("origin")?.toUpperCase() ?? ""
  const destination = searchParams.get("destination")?.toUpperCase() ?? ""
  const departureDate = searchParams.get("departureDate") ?? ""
  const returnDate = searchParams.get("returnDate") ?? ""
  const adultsRaw = Number(searchParams.get("adults") ?? "1")
  const childrenRaw = Number(searchParams.get("children") ?? "0")
  const infantsRaw = Number(searchParams.get("infants") ?? "0")
  const cabinRaw = searchParams.get("cabin") ?? "ECONOMY"
  const non_stop =
    searchParams.get("non_stop") === "1" ||
    searchParams.get("non_stop") === "true"
  const maxStopsRaw = searchParams.get("max_stops")

  const adults = Number.isFinite(adultsRaw) ? adultsRaw : 1
  const children = Number.isFinite(childrenRaw) ? childrenRaw : 0
  const infants = Number.isFinite(infantsRaw) ? infantsRaw : 0
  const cabin: Cabin = (VALID_CABINS as readonly string[]).includes(cabinRaw)
    ? (cabinRaw as Cabin)
    : "ECONOMY"
  const legs = parseFlightLegsParam(searchParams.get("legs"), cabin)
  const max_stops =
    maxStopsRaw === null || maxStopsRaw === "" ? null : Number(maxStopsRaw)

  const originAirport = lightAirport(origin)
  const destinationAirport = lightAirport(destination)
  const legAirports = (legs ?? []).map((leg) => ({
    origin: lightAirport(leg.origin),
    destination: lightAirport(leg.destination),
  }))

  const values: Partial<FlightSearchFormValues> = {
    trip_type,
    origin: origin || undefined,
    destination: destination || undefined,
    departureDate: departureDate || undefined,
    returnDate: returnDate || undefined,
    legs,
    adults,
    children,
    infants,
    cabin,
    non_stop,
    max_stops,
  }

  // Never trust URL — validate before auto-searching
  const hasRequired =
    trip_type === "multi_city"
      ? (legs?.length ?? 0) >= 2
      : trip_type === "round_trip"
        ? Boolean(origin && destination && departureDate && returnDate)
        : Boolean(origin && destination && departureDate)
  if (!hasRequired) {
    return {
      values,
      originAirport,
      destinationAirport,
      legAirports,
      isValid: false,
    }
  }
  const parsed = parseFlightSearchPayload({
    trip_type,
    origin,
    destination,
    departureDate,
    returnDate,
    legs,
    adults,
    children,
    infants,
    cabin,
    non_stop,
    max_stops,
  })
  return {
    values,
    originAirport,
    destinationAirport,
    legAirports,
    isValid: parsed.success,
  }
}

/**
 * Build shareable URL search state from a validated payload.
 * Only safe primitives (IATA, dates, legs blob, party, cabin, trip flags) —
 * never opaque blobs, tokens, or PII.
 */
export function buildFlightSearchParams(
  payload: FlightSearchPayload
): URLSearchParams {
  const p = new URLSearchParams()
  p.set("trip_type", payload.trip_type)
  if (payload.trip_type === "multi_city") {
    p.set(
      "legs",
      JSON.stringify(
        payload.legs.map((leg) => ({
          origin: leg.origin,
          destination: leg.destination,
          date: leg.date,
          cabin: leg.cabin,
        }))
      )
    )
  } else {
    p.set("origin", payload.origin)
    p.set("destination", payload.destination)
    p.set("departureDate", payload.departureDate)
    if (payload.trip_type === "round_trip") {
      p.set("returnDate", payload.returnDate)
    }
  }
  p.set("adults", String(payload.adults))
  p.set("children", String(payload.children))
  p.set("infants", String(payload.infants))
  p.set("cabin", payload.cabin)
  if (payload.non_stop) p.set("non_stop", "1")
  if (payload.max_stops !== null && payload.max_stops !== undefined)
    p.set("max_stops", String(payload.max_stops))
  // Never put opaque blobs, tokens, or PII in URL — only safe search state
  return p
}

/** String form of the shared builder (router.push `?${query}`). */
export function buildFlightSearchQuery(payload: FlightSearchPayload): string {
  return buildFlightSearchParams(payload).toString()
}
