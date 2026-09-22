import { z } from "zod";
import { ApiError, apiGet, type PaginatedResponse } from "./client.ts";
import { getSupportWhatsAppUrl } from "../content/company.ts";
import { formatNaira } from "../format.ts";
import { resolveListingImageUrl } from "../listings.ts";

/**
 * Hotel domain — search foundation (Phase 4, ticket 01).
 *
 * CONTEXT.md vocabulary: Hotel = sellable lodging property with
 * city/country, star rating, amenities, and a from-price per night.
 *
 * Search semantics (spec Implementation Decisions):
 * - One free-text destination partial-matches city or Hotel name
 *   server-side; empty means browse-all paginated. No autocomplete index
 *   and no split city-versus-hotel inputs in v1 (ADR-0005).
 * - Dates optional at search but both-or-neither when either is present,
 *   with real calendar validation, check-out strictly after check-in,
 *   and neither in the past.
 * - Guests and rooms default sensibly with minimums of one and travel in
 *   URL state as booking hints, not hard availability gates.
 *
 * Price/star/ordering filters (server-side, in URL + backend query) and
 * amenity refinement (client-side over the fetched page) are ticket 02;
 * location stays display-only place context with no radius behavior.
 *
 * Framework grounding: bundled version-matched Next.js 16 docs govern
 * fetch caching (`cache: "no-store"` opts out) and `useSearchParams`
 * Suspense boundaries. Context7 remote docs were unreachable at
 * implementation time, so the bundled docs are the authority (noted per
 * ticket instructions).
 */

export const DEFAULT_HOTEL_GUESTS = 2;
export const DEFAULT_HOTEL_ROOMS = 1;
export const MAX_HOTEL_GUESTS = 30;
export const MAX_HOTEL_ROOMS = 30;
/** Whole-Naira ceiling for the max per-night price filter (sanity cap). */
export const MAX_HOTEL_MAX_PRICE = 100_000_000;

/**
 * Server-side ordering vocabulary (backend contract for `GET /api/hotels/`
 * `?ordering=`): price and star rating in both directions, plus name.
 * Amenities are deliberately absent — amenity refinement is client-side over
 * the fetched page, and location is display-only (ADR-0005).
 */
export const HOTEL_ORDERINGS = ["price", "-price", "star_rating", "-star_rating", "name"] as const;

export type HotelOrdering = (typeof HOTEL_ORDERINGS)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse YYYY-MM-DD into a UTC-midnight date, or null when impossible. */
function parseCalendarDate(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

/** Start of today (local) as a UTC timestamp — day-precision comparisons. */
function startOfTodayUtc(): number {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Hotel search query validation (TDD seam 01, extended in ticket 02).
 *
 * - destination: single free-text, trimmed, empty allowed for paginated
 *   browse-all, max 200 chars.
 * - check_in / check_out: both or neither, real calendar dates, neither in
 *   the past, check-out strictly after check-in.
 * - guests / rooms: integers, minimums of one.
 * - max_price: optional whole-Naira per-night ceiling, applied server-side.
 * - min_stars: optional quality floor of 1–5 stars, applied server-side.
 * - ordering: optional server-side sort from the backend vocabulary.
 * - page: 1-based pagination.
 */
export const hotelSearchQuerySchema = z
  .object({
    destination: z.string().trim().max(200, "Destination is too long").optional().default(""),
    check_in: z.string().trim().optional().default(""),
    check_out: z.string().trim().optional().default(""),
    guests: z
      .number()
      .int("Guests must be a whole number")
      .min(1, "At least 1 guest is required")
      .max(MAX_HOTEL_GUESTS, `Guests cannot exceed ${MAX_HOTEL_GUESTS}`)
      .optional()
      .default(DEFAULT_HOTEL_GUESTS),
    rooms: z
      .number()
      .int("Rooms must be a whole number")
      .min(1, "At least 1 room is required")
      .max(MAX_HOTEL_ROOMS, `Rooms cannot exceed ${MAX_HOTEL_ROOMS}`)
      .optional()
      .default(DEFAULT_HOTEL_ROOMS),
    max_price: z
      .number()
      .int("Maximum price must be whole Naira")
      .positive("Maximum price must be above ₦0")
      .max(MAX_HOTEL_MAX_PRICE, "Maximum price is too high")
      .optional(),
    min_stars: z
      .number()
      .int("Star rating must be a whole number")
      .min(1, "Minimum star rating is 1")
      .max(5, "Minimum star rating is 5")
      .optional(),
    ordering: z.enum(HOTEL_ORDERINGS).optional(),
    page: z.number().int().min(1).optional().default(1),
  })
  .superRefine((data, ctx) => {
    const hasIn = data.check_in !== "";
    const hasOut = data.check_out !== "";

    if (hasIn !== hasOut) {
      ctx.addIssue({
        code: "custom",
        message: hasIn
          ? "Add a check-out date, or clear check-in to browse all Hotels"
          : "Add a check-in date, or clear check-out to browse all Hotels",
        path: [hasIn ? "check_out" : "check_in"],
      });
      return;
    }

    if (!hasIn && !hasOut) return;

    const today = startOfTodayUtc();

    const checkIn = parseCalendarDate(data.check_in);
    if (checkIn === null) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid check-in date (YYYY-MM-DD)",
        path: ["check_in"],
      });
    } else if (checkIn.getTime() < today) {
      ctx.addIssue({
        code: "custom",
        message: "Check-in date cannot be in the past",
        path: ["check_in"],
      });
    }

    const checkOut = parseCalendarDate(data.check_out);
    if (checkOut === null) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid check-out date (YYYY-MM-DD)",
        path: ["check_out"],
      });
    } else if (checkOut.getTime() < today) {
      ctx.addIssue({
        code: "custom",
        message: "Check-out date cannot be in the past",
        path: ["check_out"],
      });
    }

    if (checkIn !== null && checkOut !== null && checkOut.getTime() <= checkIn.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "Check-out must be after check-in",
        path: ["check_out"],
      });
    }
  });

export type HotelSearchQueryInput = z.input<typeof hotelSearchQuerySchema>;
export type HotelSearchQuery = z.output<typeof hotelSearchQuerySchema>;

/**
 * Validate a parsed URL query before it reaches the backend. URL state is
 * user-editable and therefore untrusted; a hand-edited or partially-shared
 * link must surface a human error instead of firing an invalid request.
 */
export function validateHotelSearchQuery(
  query: HotelSearchQuery,
): { success: true } | { success: false; message: string } {
  const parsed = hotelSearchQuerySchema.safeParse(query);
  if (parsed.success) return { success: true };
  return {
    success: false,
    message: parsed.error.issues[0]?.message ?? "Some stay details need attention.",
  };
}

// ---------------------------------------------------------------------------
// Shareable URL state — pure helpers (TDD seam 02).
// All HTTP stays in `lib/api/`; these helpers never call `fetch` and never
// throw on invalid input (invalid values are dropped, never leaked).
// Sensitive keys (tokens, payment, passwords) are never read or written.
// ---------------------------------------------------------------------------

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Param keys that make `/hotels` a dynamic result view rather than the
 *  stable search landing (drives both auto-search and noindex). Server-side
 *  filters (max price, min stars, ordering) are part of that result state;
 *  amenity refinement stays client-side over the fetched page and never
 *  appears here (ADR-0005). */
export const HOTEL_SEARCH_PARAM_KEYS = [
  "destination",
  "check_in",
  "check_out",
  "guests",
  "rooms",
  "max_price",
  "min_stars",
  "ordering",
  "page",
] as const;

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * True when the query carries any search state. The form always writes the
 * party, so a browse-all search is distinguishable from the idle landing.
 * Mirrors `hasFlightSearchParams` for consistent listing SEO semantics.
 */
export function hasHotelSearchParams(input: RawSearchParams): boolean {
  for (const key of HOTEL_SEARCH_PARAM_KEYS) {
    const value = firstString(input[key]);
    if (typeof value === "string" && value.trim() !== "") return true;
  }
  return false;
}

/** Parse a bounded integer, or undefined when absent/out of range. */
function parseBoundedInt(
  value: string | string[] | undefined,
  min: number,
  max?: number,
): number | undefined {
  const raw = firstString(value)?.trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min) return undefined;
  if (max !== undefined && parsed > max) return undefined;
  return parsed;
}

/**
 * Parse the shareable `?destination=&…&max_price=&min_stars=&ordering=&page=`
 * query into a search query. Invalid values are dropped, never thrown — the
 * caller runs `validateHotelSearchQuery` for strict human-readable errors.
 */
export function parseHotelSearchParams(input: RawSearchParams): HotelSearchQuery {
  // Preserve date strings verbatim (trimmed) so the form can surface
  // human-readable errors; invalid dates are not coerced, only trimmed.
  const query: HotelSearchQuery = {
    destination: firstString(input.destination)?.trim() ?? "",
    check_in: firstString(input.check_in)?.trim() ?? "",
    check_out: firstString(input.check_out)?.trim() ?? "",
    guests: parseBoundedInt(input.guests, 1, MAX_HOTEL_GUESTS) ?? DEFAULT_HOTEL_GUESTS,
    rooms: parseBoundedInt(input.rooms, 1, MAX_HOTEL_ROOMS) ?? DEFAULT_HOTEL_ROOMS,
    max_price: parseHotelMaxPrice(input.max_price),
    min_stars: parseBoundedInt(input.min_stars, 1, 5),
    ordering: parseHotelOrdering(input.ordering),
    page: parseBoundedInt(input.page, 1) ?? 1,
  };
  const parsed = hotelSearchQuerySchema.safeParse(query);
  return parsed.success ? parsed.data : query;
}

/**
 * Parse the max per-night price ceiling. Whole Naira only; zero, negative,
 * fractional, non-numeric, and absurd values all mean "no cap" (identical to
 * omitting max_price backend-side).
 */
function parseHotelMaxPrice(value: string | string[] | undefined): number | undefined {
  const raw = firstString(value)?.trim().replace(/,/g, "");
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_HOTEL_MAX_PRICE) return undefined;
  return parsed;
}

/** Parse server-side ordering, or undefined when absent/unknown. */
function parseHotelOrdering(value: string | string[] | undefined): HotelOrdering | undefined {
  const raw = firstString(value)?.trim();
  if (!raw) return undefined;
  return (HOTEL_ORDERINGS as readonly string[]).includes(raw)
    ? (raw as HotelOrdering)
    : undefined;
}

/**
 * Single source for which stay values travel in the URL and the backend
 * query. The party is always written so a submitted search is separable from
 * the idle landing and survives back/refresh/share, including the
 * empty-destination browse-all case. Empty destination/dates, unset filters,
 * and the default page are omitted to keep links clean. Request and link
 * derive from the same entries so they can never drift apart (ADR-0005
 * centralization). Only non-personal stay state appears.
 */
function hotelQueryEntries(query: HotelSearchQuery): [string, string][] {
  const entries: [string, string][] = [];
  if (query.destination.trim().length > 0) {
    entries.push(["destination", query.destination.trim()]);
  }
  if (query.check_in.trim().length > 0) entries.push(["check_in", query.check_in.trim()]);
  if (query.check_out.trim().length > 0) entries.push(["check_out", query.check_out.trim()]);
  entries.push(["guests", String(query.guests)]);
  entries.push(["rooms", String(query.rooms)]);
  if (query.max_price !== undefined) entries.push(["max_price", String(query.max_price)]);
  if (query.min_stars !== undefined) entries.push(["min_stars", String(query.min_stars)]);
  if (query.ordering !== undefined) entries.push(["ordering", query.ordering]);
  if (query.page > 1) entries.push(["page", String(query.page)]);
  return entries;
}

/** Serialize a search query to a shareable query string (no leading `?`). */
export function buildHotelSearchParams(query: HotelSearchQuery): string {
  return new URLSearchParams(hotelQueryEntries(query)).toString();
}

/**
 * Backend query for `GET /api/hotels/`. Derived from the same entries as the
 * URL so request and link can never drift apart (ADR-0005 centralization).
 */
export function toHotelApiQuery(query: HotelSearchQuery): Record<string, string> {
  return Object.fromEntries(hotelQueryEntries(query));
}

// ---------------------------------------------------------------------------
// Hotel listing — centralized integration with untrusted-response validation.
// Responses are treated as untrusted and revalidated with Zod even after
// client validation passes (spec §63); a malformed envelope fails loudly
// rather than silently dropping rows or fabricating the authoritative count.
// Search opts out of caching (`no-store`) so every query combination is
// request-time state (ADR-0005).
// ---------------------------------------------------------------------------

export const hotelListSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  city: z.string(),
  country: z.string().optional().default(""),
  star_rating: z.number().int().min(0).max(5).optional().default(0),
  main_image: z.string().optional().default(""),
  amenities_list: z.array(z.string()).optional().default([]),
  starting_price: z.string().optional().default("0.00"),
});

export type HotelList = z.infer<typeof hotelListSchema>;

export const paginatedHotelListSchema = z.object({
  count: z.number().int().min(0),
  // DRF marks next/previous nullable and not required — tolerate absence.
  next: z.string().nullable().default(null),
  previous: z.string().nullable().default(null),
  results: z.array(hotelListSchema),
});

export type PaginatedHotels = PaginatedResponse<HotelList>;

/**
 * Search hotels via `GET /api/hotels/` with centralized validation.
 * - `noStore: true` — every query is request-time state, never cached (ADR-0005).
 * - The response is validated against the backend contract; a shape violation
 *   throws a typed, customer-safe error instead of a partial result.
 */
export async function getHotels(query: HotelSearchQuery): Promise<PaginatedHotels> {
  const raw = await apiGet<unknown>("/api/hotels/", {
    query: toHotelApiQuery(query),
    noStore: true,
  });

  const parsed = paginatedHotelListSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError("Invalid response from the hotel service.", {
      status: 200,
      code: "server",
    });
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Hotel card display mapping + client-side amenity refinement (ticket 02).
// Pure helpers (TDD seam): no fetch, no DOM. Server owns max price, min
// stars, ordering, and pagination plus the authoritative backend total;
// the client only refines the fetched page by amenities, and location stays
// display-only place context with no radius behavior (ADR-0005).
// ---------------------------------------------------------------------------

/** Key amenities shown on a Hotel card before the "+N more" overflow. */
export const HOTEL_CARD_KEY_AMENITIES = 3;

export interface HotelCardDisplay {
  /** Detail route for the crawlable card link. */
  href: string;
  /** Absolute image URL, or the local brand fallback when missing. */
  imageSrc: string;
  /** Descriptive alt text: "Hotel name — City, Country". */
  imageAlt: string;
  /** Display-only place context: "City, Country" or "City". */
  placeLabel: string;
  /** e.g. "5-star Hotel"; null when the Hotel is unrated (never "0-star"). */
  starLabel: string | null;
  /** Up to HOTEL_CARD_KEY_AMENITIES trimmed amenities. */
  keyAmenities: string[];
  /** True when amenities exist beyond the key set shown on the card. */
  hasMoreAmenities: boolean;
  /**
   * Locked pricing copy: "from ₦X per night". Null when no usable price —
   * the card renders fallback copy instead of inventing a number.
   */
  priceLabel: string | null;
}

/**
 * Locked from-price copy for Hotel cards: "from ₦X per night".
 * Returns null for missing, zero, or non-numeric prices so the card can
 * render fallback copy instead of a fabricated "from ₦0 per night".
 */
export function formatHotelFromPrice(startingPrice: string | null | undefined): string | null {
  if (startingPrice === null || startingPrice === undefined) return null;
  const trimmed = startingPrice.replace(/,/g, "").trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return `from ${formatNaira(trimmed)} per night`;
}

/**
 * Normalize a Hotel list row into everything a card needs to render.
 * Missing images fall back to the local brand asset; blank amenities are
 * dropped; unrated Hotels carry no star label; unusable prices carry no
 * price label. Uses CONTEXT.md vocabulary exactly (Hotel).
 */
export function toHotelCardDisplay(hotel: HotelList): HotelCardDisplay {
  const placeLabel =
    hotel.country.trim().length > 0 ? `${hotel.city}, ${hotel.country}` : hotel.city;
  const amenities = hotel.amenities_list.map((a) => a.trim()).filter((a) => a.length > 0);
  return {
    href: `/hotels/${hotel.slug}`,
    imageSrc: resolveListingImageUrl(hotel.main_image),
    imageAlt: `${hotel.name} — ${placeLabel}`,
    placeLabel,
    starLabel: hotel.star_rating >= 1 ? `${hotel.star_rating}-star Hotel` : null,
    keyAmenities: amenities.slice(0, HOTEL_CARD_KEY_AMENITIES),
    hasMoreAmenities: amenities.length > HOTEL_CARD_KEY_AMENITIES,
    priceLabel: formatHotelFromPrice(hotel.starting_price),
  };
}

/** Normalize an amenity string for forgiving comparison (case + padding). */
function normalizeAmenity(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Client-side amenity multi-select over the fetched page (AND semantics):
 * a Hotel stays visible only when it offers every selected amenity. Blank
 * selections are ignored; an empty selection returns the page untouched.
 * Never triggers a new search — server filters stay authoritative.
 */
export function filterHotelsByAmenities(hotels: HotelList[], selected: string[]): HotelList[] {
  const required = selected.map(normalizeAmenity).filter((a) => a.length > 0);
  if (required.length === 0) return hotels;
  return hotels.filter((hotel) => {
    const offered = new Set(hotel.amenities_list.map(normalizeAmenity));
    return required.every((amenity) => offered.has(amenity));
  });
}

export interface HotelAmenityOption {
  /** Display form, taken from first sighting on the page. */
  value: string;
  label: string;
  /** How many Hotels on the fetched page offer it. */
  count: number;
}

/**
 * Derive multi-select options from the fetched page with per-amenity counts.
 * Most common first so the most useful refinements surface at the top;
 * ties break alphabetically for stability. Empty pages yield no options.
 */
export function collectAmenityOptions(hotels: HotelList[]): HotelAmenityOption[] {
  const seen = new Map<string, { value: string; count: number }>();
  for (const hotel of hotels) {
    const uniqueOnHotel = new Set<string>();
    for (const raw of hotel.amenities_list) {
      const trimmed = raw.trim();
      if (trimmed.length === 0) continue;
      const key = normalizeAmenity(trimmed);
      if (uniqueOnHotel.has(key)) continue;
      uniqueOnHotel.add(key);
      const entry = seen.get(key);
      if (entry) {
        entry.count += 1;
      } else {
        seen.set(key, { value: trimmed, count: 1 });
      }
    }
  }
  return [...seen.values()]
    .map((entry) => ({ value: entry.value, label: entry.value, count: entry.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------------------
// Support context — stay-aware WhatsApp prefills (non-personal only).
// Destination, dates, and party are already URL-visible search state; never
// names, emails, phones, references, or payment data.
// ---------------------------------------------------------------------------

export interface HotelStayContext {
  destination?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  guests?: number | null;
  rooms?: number | null;
}

/**
 * Compact stay line, e.g. "Lagos on 2026-05-01 → 2026-05-04 for 2 guests, 1 room".
 * Skips whatever is unknown so partial context still reads naturally.
 */
export function describeHotelStay(stay: HotelStayContext): string {
  const parts: string[] = [];
  const label = stay.destination && stay.destination.trim().length > 0 ? stay.destination.trim() : null;
  if (label) parts.push(label);
  if (stay.check_in && stay.check_out) {
    parts.push(`on ${stay.check_in} → ${stay.check_out}`);
  } else if (stay.check_in) {
    parts.push(`from ${stay.check_in}`);
  }
  const guests = stay.guests && stay.guests > 0 ? stay.guests : null;
  const rooms = stay.rooms && stay.rooms > 0 ? stay.rooms : null;
  if (guests !== null) {
    parts.push(
      `for ${guests} ${guests === 1 ? "guest" : "guests"}${rooms !== null ? `, ${rooms} ${rooms === 1 ? "room" : "rooms"}` : ""}`,
    );
  } else if (rooms !== null) {
    parts.push(`for ${rooms} ${rooms === 1 ? "room" : "rooms"}`);
  }
  return parts.join(" ");
}

/**
 * WhatsApp support URL for a hotel topic with optional stay context, e.g.
 * "choosing a hotel (Lagos on 2026-05-01 → 2026-05-04 for 2 guests, 1 room)".
 * Numbers stay owned by lib/content/company.ts — this only builds the message.
 */
export function getHotelSupportWhatsAppUrl(topic: string, stay?: HotelStayContext): string {
  const detail = stay ? describeHotelStay(stay) : "";
  const context = detail ? `${topic} (${detail})` : topic;
  return getSupportWhatsAppUrl(context);
}
