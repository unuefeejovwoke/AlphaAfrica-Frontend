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

// Base shape before refinements — includes traveller composition fields
const oneWayBase = z.object({
  origin: iataSchema,
  destination: iataSchema,
  departureDate: futureDateStringSchema("Departure date"),
  trip_type: z.literal("one_way").default("one_way"),
  cabin: cabinSchema.default("ECONOMY"),
  currency: z.string().trim().length(3).default("NGN").transform((v) => v.toUpperCase()),
  non_stop: z.boolean().optional().default(false),
  max_stops: z
    .number()
    .int()
    .min(0, "Maximum stops must be 0-3")
    .max(3, "Maximum stops must be 0-3")
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? null : v)),
  adults: z.number().int().min(1, "At least 1 adult traveller is required").max(9, "Maximum 9 adults"),
  children: z.number().int().min(0).max(9),
  infants: z.number().int().min(0).max(9),
});

export const oneWayFlightSearchSchema = oneWayBase
  .refine((data) => data.origin !== data.destination, {
    message: "Origin and destination must be different",
    path: ["destination"],
  })
  .refine((data) => data.adults + data.children + data.infants <= 9, {
    message: "Total travellers cannot exceed 9",
    path: ["adults"],
  })
  .refine((data) => data.infants <= data.adults, {
    message: "Infant count cannot exceed adult count",
    path: ["infants"],
  });

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
  // Prefer explicit total_amount fields first
  if (typeof offer.total_amount === "string" && offer.total_amount.trim()) {
    return { amount: offer.total_amount, currency: offer.currency ?? "NGN" };
  }
  if (typeof offer.totalAmount === "string" && offer.totalAmount.trim()) {
    return { amount: offer.totalAmount, currency: offer.currency ?? "NGN" };
  }
  if (typeof offer.grandTotal === "string" && offer.grandTotal.trim()) {
    return { amount: offer.grandTotal, currency: offer.currency ?? "NGN" };
  }
  const p = offer.price;
  if (typeof p === "string" && p.trim()) return { amount: p, currency: offer.currency ?? "NGN" };
  if (typeof p === "number") return { amount: String(p), currency: offer.currency ?? "NGN" };
  if (typeof p === "object" && p !== null) {
    const obj = p as Record<string, unknown>;
    if (typeof obj.total === "string") return { amount: obj.total, currency: (obj.currency as string) ?? offer.currency ?? "NGN" };
    if (typeof obj.grandTotal === "string") return { amount: obj.grandTotal, currency: (obj.currency as string) ?? offer.currency ?? "NGN" };
    if (typeof obj.amount === "string") return { amount: obj.amount, currency: (obj.currency as string) ?? offer.currency ?? "NGN" };
  }
  return { amount: "—", currency: offer.currency ?? "NGN" };
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
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(11, 16) || iso;
    return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return iso;
  }
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
      // Handle both normalized and raw Amadeus segment shapes
      const first = segs[0] as unknown as Record<string, unknown>;
      const last = segs[segs.length - 1] as unknown as Record<string, unknown>;

      const depAt = (first.departureAt as string) ?? (first.departure as unknown as Record<string, string>)?.at ?? departureAt;
      const arrAt = (last.arrivalAt as string) ?? (last.arrival as unknown as Record<string, string>)?.at ?? arrivalAt;
      if (depAt) departureAt = depAt;
      if (arrAt) arrivalAt = arrAt;

      const depAirport =
        (first.departureAirport as string) ?? (first.departure as unknown as Record<string, string>)?.iataCode ?? origin;
      const arrAirport =
        (last.arrivalAirport as string) ?? (last.arrival as unknown as Record<string, string>)?.iataCode ?? destination;
      if (depAirport) origin = depAirport;
      if (arrAirport) destination = arrAirport;

      if (itin.duration) duration = itin.duration;
      stops = segs.length > 0 ? segs.length - 1 : 0;
      // Cabin from first segment if available
      const segCabin = (first.cabin as string) ?? (first as unknown as Record<string, unknown>).cabin as string | undefined;
      if (segCabin) cabin = segCabin;
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
// International search via centralized apiPost
// ---------------------------------------------------------------------------

export async function searchFlights(payload: OneWayFlightSearchPayload): Promise<FlightOffer[]> {
  const body = toFlightSearchRequest(payload);
  const raw = await apiPost<unknown, typeof body>("/api/flights/search/", body);
  // Backend may return array or { results: [] } or { data: [] }
  if (Array.isArray(raw)) {
    return raw as FlightOffer[];
  }
  if (typeof raw === "object" && raw !== null) {
    const rec = raw as Record<string, unknown>;
    if (Array.isArray(rec.results)) return rec.results as FlightOffer[];
    if (Array.isArray(rec.data)) return rec.data as FlightOffer[];
    if (Array.isArray(rec.offers)) return rec.offers as FlightOffer[];
  }
  return [];
}
