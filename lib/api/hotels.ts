import { z } from "zod";
import { ApiError, apiGet, type PaginatedResponse } from "./client.ts";
import { getSupportWhatsAppUrl } from "../content/company.ts";

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
 * Price/star/ordering filters and amenity refinement are ticket 02; this
 * module deliberately models only destination, stay dates, party, and page.
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
 * Hotel search query validation (TDD seam 01).
 *
 * - destination: single free-text, trimmed, empty allowed for paginated
 *   browse-all, max 200 chars.
 * - check_in / check_out: both or neither, real calendar dates, neither in
 *   the past, check-out strictly after check-in.
 * - guests / rooms: integers, minimums of one.
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
 *  stable search landing (drives both auto-search and noindex). */
export const HOTEL_SEARCH_PARAM_KEYS = [
  "destination",
  "check_in",
  "check_out",
  "guests",
  "rooms",
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
 * Parse the shareable `?destination=&check_in=&check_out=&guests=&rooms=`
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
    page: parseBoundedInt(input.page, 1) ?? 1,
  };
  const parsed = hotelSearchQuerySchema.safeParse(query);
  return parsed.success ? parsed.data : query;
}

/**
 * Single source for which stay values travel in the URL and the backend
 * query. The party is always written so a submitted search is separable from
 * the idle landing and survives back/refresh/share, including the
 * empty-destination browse-all case. Empty destination/dates and the default
 * page are omitted to keep links clean. Only non-personal stay state appears.
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
