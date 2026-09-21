import { z } from "zod";
import { apiGet, apiPost } from "./client.ts";
import { futureDateStringSchema } from "./validation.ts";
import { travellerCompositionSchema } from "../schemas/travel.ts";

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
});

export type Airport = z.infer<typeof airportSchema>;

export const RECENT_AIRPORTS_KEY = "alphaa:recent-airports:v1";
export const MAX_RECENT_AIRPORTS = 5;
export const AIRPORT_MIN_CHARS = 2;

// Module-level cache + dedup — survives across component mounts
// js-set-map-lookups: Map for O(1) lookups (vercel best practice)
export const airportResultCache = new Map<string, Airport[]>();
export const airportPendingRequests = new Map<string, Promise<Airport[]>>();

// ---------------------------------------------------------------------------
// Recent searches: versioned, minimal, localStorage
// ---------------------------------------------------------------------------

export function getRecentAirports(): Airport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_AIRPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Validate each entry — discard corrupt items
    const out: Airport[] = [];
    for (const item of parsed.slice(0, MAX_RECENT_AIRPORTS)) {
      const res = airportSchema.safeParse(item);
      if (res.success) out.push(res.data);
    }
    return out;
  } catch {
    return [];
  }
}

export function addRecentAirport(airport: Airport): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentAirports();
    // Deduplicate by IATA, most recent first
    const next = [airport, ...existing.filter((a) => a.iata_code !== airport.iata_code)].slice(
      0,
      MAX_RECENT_AIRPORTS,
    );
    window.localStorage.setItem(RECENT_AIRPORTS_KEY, JSON.stringify(next));
    // Also warm the result cache for the IATA and city prefixes
    // so immediate re-type benefits without extra fetch
    airportResultCache.set(airport.iata_code.toLowerCase(), [airport]);
    if (airport.city) {
      const cityPrefix = airport.city.slice(0, 2).toLowerCase();
      const cached = airportResultCache.get(cityPrefix);
      if (cached && !cached.some((c) => c.iata_code === airport.iata_code)) {
        airportResultCache.set(cityPrefix, [airport, ...cached].slice(0, 10));
      }
    }
  } catch {
    // localStorage may throw in private mode — fail silently
  }
}

export function clearRecentAirports(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECENT_AIRPORTS_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Airport search: 2-char minimum, dedup, cache
// Uses centralized apiGet (ISR noStore) so base URL stays hidden
// ---------------------------------------------------------------------------

export async function searchAirports(query: string): Promise<Airport[]> {
  const trimmed = query.trim();
  if (trimmed.length < AIRPORT_MIN_CHARS) return [];

  const key = trimmed.toLowerCase();

  // cache hit — O(1) Map lookup
  const cached = airportResultCache.get(key);
  if (cached) return cached;

  // dedup: share in-flight promise
  const pending = airportPendingRequests.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const raw = await apiGet<unknown>("/api/flights/airports/", {
        query: { q: trimmed },
        noStore: true,
      });
      // Backend returns array of airports
      const parsed = z.array(airportSchema).safeParse(raw);
      if (!parsed.success) {
        // Defensive: backend may return paginated or wrapped — try .results
        if (typeof raw === "object" && raw !== null && "results" in raw) {
          const inner = (raw as { results: unknown }).results;
          const innerParsed = z.array(airportSchema).safeParse(inner);
          if (innerParsed.success) {
            airportResultCache.set(key, innerParsed.data);
            return innerParsed.data;
          }
        }
        return [];
      }
      airportResultCache.set(key, parsed.data);
      return parsed.data;
    } catch {
      return [];
    } finally {
      airportPendingRequests.delete(key);
    }
  })();

  airportPendingRequests.set(key, promise);
  return promise;
}

// Helpers for tests / SSR to reset module state
export function __clearAirportCache(): void {
  airportResultCache.clear();
  airportPendingRequests.clear();
}

// ---------------------------------------------------------------------------
// One-way search validation
// Extends travellerCompositionSchema + origin/destination + date + trip flags
// ---------------------------------------------------------------------------

export const cabinSchema = z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]);
export type Cabin = z.infer<typeof cabinSchema>;

const iataSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Select a valid airport from the list");

// Base shape before refinements — reuses shared traveller composition
// so party rules (adults ≥1, total ≤9, infants ≤ adults) stay single-sourced.
// Ticket 01 scope: one-way only, cabin ECONOMY default, currency NGN-only (ADR-0004),
// non_stop + max_stops map to the backend legs contract (also used by story-9 filters).
const oneWayJourneyBase = z.object({
  origin: iataSchema,
  destination: iataSchema,
  departureDate: futureDateStringSchema("Departure date"),
  trip_type: z.literal("one_way").default("one_way"),
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
});

const oneWayBase = oneWayJourneyBase.and(travellerCompositionSchema);

export const oneWayFlightSearchSchema = oneWayBase.refine(
  (data) => data.origin !== data.destination,
  {
    message: "Origin and destination must be different",
    path: ["destination"],
  },
);

export type OneWayFlightSearchInput = z.input<typeof oneWayFlightSearchSchema>;
export type OneWayFlightSearchPayload = z.output<typeof oneWayFlightSearchSchema>;

/**
 * Convert a validated one-way search into the backend legs contract.
 * Backend expects `POST /api/flights/search/` with `{ trip_type, legs, adults, children, infants, ... }`
 */
export function toFlightSearchRequest(payload: OneWayFlightSearchPayload) {
  return {
    trip_type: "one_way" as const,
    legs: [
      {
        origin: payload.origin,
        destination: payload.destination,
        date: payload.departureDate,
        cabin: payload.cabin,
      },
    ],
    adults: payload.adults,
    children: payload.children,
    infants: payload.infants,
    currency: payload.currency ?? "NGN",
    non_stop: payload.non_stop ?? false,
    ...(payload.max_stops !== null && payload.max_stops !== undefined ? { max_stops: payload.max_stops } : {}),
    cabin: payload.cabin,
  };
}

// ---------------------------------------------------------------------------
// Flight Offer — normalized display shape
// ---------------------------------------------------------------------------

export interface FlightOfferSegment {
  departureAirport: string;
  arrivalAirport: string;
  departureAt: string;
  arrivalAt: string;
  carrierCode: string;
  flightNumber?: string;
  duration?: string;
  cabin?: string;
}

export interface FlightOfferItinerary {
  duration?: string;
  segments: FlightOfferSegment[];
}

export type FlightOffer = {
  id: string;
  // Price may arrive as string, number, or nested object
  price?: unknown;
  total_amount?: string;
  totalAmount?: string;
  grandTotal?: string;
  currency?: string;
  airline?: string;
  validatingAirlineCodes?: string[];
  itineraries?: FlightOfferItinerary[];
  // Flat fallback fields
  departure?: string;
  arrival?: string;
  duration?: string;
  stops?: number;
  origin?: string;
  destination?: string;
  cabin?: string;
  baggage?: string | null;
  // Opaque blob kept for price confirmation — never serialized to URL
  flight_offer?: unknown;
  // Allow extra backend fields
  [key: string]: unknown;
};

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
              }),
            )
            .optional()
            .default([]),
        }),
      )
      .optional(),
  })
  .passthrough();

export const flightOffersResponseSchema = z.array(flightOfferSchema).or(
  z.object({ results: z.array(flightOfferSchema) }).transform((v) => v.results),
);

export interface FlightOfferDisplay {
  id: string;
  airline: string;
  departureAt: string;
  arrivalAt: string;
  duration: string;
  stops: number;
  stopsLabel: string;
  origin: string;
  destination: string;
  airportsLabel: string;
  cabin: string;
  baggage: string | null;
  price: string;
  currency: string;
  // Keep reference to raw offer for selection
  raw: FlightOffer;
}

function extractPrice(offer: FlightOffer): { amount: string; currency: string } {
  // Currency is NGN-only in v1 (ADR-0004): display always forces NGN even if
  // the backend echoes another code — conversion lives server-side.
  const CURRENCY = "NGN";
  const candidates: unknown[] = [
    offer.total_amount,
    offer.totalAmount,
    offer.grandTotal,
    offer.price,
  ];
  // Flatten nested price objects { total, grandTotal, amount } into candidates
  const p = offer.price;
  if (typeof p === "object" && p !== null) {
    const obj = p as Record<string, unknown>;
    candidates.push(obj.total, obj.grandTotal, obj.amount);
  }
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return { amount: candidate, currency: CURRENCY };
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return { amount: String(candidate), currency: CURRENCY };
    }
  }
  return { amount: "—", currency: CURRENCY };
}

function formatDuration(raw?: string): string {
  if (!raw) return "—";
  // Handle ISO 8601 like PT2H35M or already formatted
  if (raw.startsWith("PT")) {
    const match = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const h = match[1] ? `${match[1]}h` : "";
      const m = match[2] ? `${match[2]}m` : "";
      return [h, m].filter(Boolean).join(" ") || raw;
    }
  }
  return raw;
}

function formatTime(iso?: string): string {
  if (!iso) return "—";
  // Prefer the wall-clock time embedded in the ISO string (airport-local)
  // over Date parsing, which shifts naive "2026-10-10T08:30:00" into the
  // browser zone. Falls back to Date only for non-ISO shapes.
  const timeMatch = iso.match(/T(\d{2}:\d{2})/);
  if (timeMatch) return timeMatch[1];
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return iso;
  }
}

/** Hide Amadeus-vs-normalized segment shape walk behind one helper. */
function getSegmentEndpoints(segment: unknown): {
  departureAt: string;
  arrivalAt: string;
  departureAirport: string;
  arrivalAirport: string;
  cabin: string;
} {
  const seg = segment as Record<string, unknown>;
  const dep = seg.departure as Record<string, string> | undefined;
  const arr = seg.arrival as Record<string, string> | undefined;
  return {
    departureAt: (seg.departureAt as string) ?? dep?.at ?? "",
    arrivalAt: (seg.arrivalAt as string) ?? arr?.at ?? "",
    departureAirport: (seg.departureAirport as string) ?? dep?.iataCode ?? "",
    arrivalAirport: (seg.arrivalAirport as string) ?? arr?.iataCode ?? "",
    cabin: (seg.cabin as string) ?? "",
  };
}

export function normalizeFlightOffer(offer: FlightOffer, index: number): FlightOfferDisplay {
  const id = (offer.id as string) || `offer-${index}`;
  const airline =
    offer.airline ||
    (Array.isArray(offer.validatingAirlineCodes) && offer.validatingAirlineCodes[0]) ||
    "Airline";

  // Try itineraries first
  let departureAt = (offer.departure as string) || "";
  let arrivalAt = (offer.arrival as string) || "";
  let duration = (offer.duration as string) || "";
  let stops: number | undefined = offer.stops as number | undefined;
  let origin = (offer.origin as string) || "";
  let destination = (offer.destination as string) || "";
  let cabin = (offer.cabin as string) || "ECONOMY";
  const baggage = (offer.baggage as string | null) ?? null;

  if (Array.isArray(offer.itineraries) && offer.itineraries.length > 0) {
    const itin = offer.itineraries[0];
    const segs = itin.segments ?? [];
    if (segs.length > 0) {
      const firstEndpoints = getSegmentEndpoints(segs[0]);
      const lastEndpoints = getSegmentEndpoints(segs[segs.length - 1]);
      if (firstEndpoints.departureAt) departureAt = firstEndpoints.departureAt;
      if (lastEndpoints.arrivalAt) arrivalAt = lastEndpoints.arrivalAt;
      if (firstEndpoints.departureAirport) origin = firstEndpoints.departureAirport;
      if (lastEndpoints.arrivalAirport) destination = lastEndpoints.arrivalAirport;
      if (itin.duration) duration = itin.duration;
      stops = segs.length > 0 ? segs.length - 1 : 0;
      if (firstEndpoints.cabin) cabin = firstEndpoints.cabin;
    }
  }

  const { amount, currency } = extractPrice(offer);

  const stopsLabel = stops === undefined ? "—" : stops === 0 ? "Non-stop" : `${stops} ${stops === 1 ? "stop" : "stops"}`;
  const airportsLabel = origin && destination ? `${origin} → ${destination}` : "—";

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
  };
}

// ---------------------------------------------------------------------------
// International search via centralized apiPost (ticket 01).
// Domestic auto-routing (both-Nigerian → QuickAir SSE proxy, ADR-0004) lands
// in ticket 03 — this slice intentionally serves the Amadeus legs path only.
// ---------------------------------------------------------------------------

export async function searchFlights(payload: OneWayFlightSearchPayload): Promise<FlightOffer[]> {
  const body = toFlightSearchRequest(payload);
  const raw = await apiPost<unknown, typeof body>("/api/flights/search/", body);
  // Backend may return array or { results: [] } or { data: [] } / { offers: [] }.
  // A 200 with an error envelope must surface as an error (never silent empty).
  if (Array.isArray(raw)) {
    return raw as FlightOffer[];
  }
  if (typeof raw === "object" && raw !== null) {
    const rec = raw as Record<string, unknown>;
    const backendError =
      (typeof rec.detail === "string" && rec.detail) ||
      (typeof rec.message === "string" && rec.message) ||
      (typeof rec.error === "string" && rec.error) ||
      null;
    if (backendError) {
      const { ApiError } = await import("./client.ts");
      throw new ApiError(backendError, { status: 200, code: "server" });
    }
    if (Array.isArray(rec.results)) return rec.results as FlightOffer[];
    if (Array.isArray(rec.data)) return rec.data as FlightOffer[];
    if (Array.isArray(rec.offers)) return rec.offers as FlightOffer[];
  }
  return [];
}
