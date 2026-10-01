import { z } from "zod"
import {
  ApiError,
  apiGet,
  apiPost,
  getHumanErrorMessage,
  LISTING_DETAIL_REVALIDATE_SECONDS,
  SEARCH_TIMEOUT_MS,
  type PaginatedResponse,
} from "./client.ts"
import type { ListingInitialPayload } from "./listing-initial.ts"
import {
  resolveBookingOutcome,
  VERIFICATION_REQUEST,
  type VerificationOutcome,
} from "./verification.ts"
import {
  clearSessionRecord,
  extractSlugs,
  firstSearchParam,
  normalizeBookingCreateResult,
  parseBoundedInt,
  parseOrderingValue,
  parsePriceCeiling,
  selectFeaturedItems,
  type BookingCreateResult,
} from "./shared.ts"
import { getSupportWhatsAppUrl } from "../content/company.ts"
import { parseCalendarDate, startOfTodayUtc } from "../date.ts"
import { formatNaira } from "../format.ts"
import { parsePriceAmount, resolveListingImageUrl } from "../listings.ts"
import { guestContactSchema } from "./validation.ts"

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

export const DEFAULT_HOTEL_GUESTS = 2
export const DEFAULT_HOTEL_ROOMS = 1
export const MAX_HOTEL_GUESTS = 30
export const MAX_HOTEL_ROOMS = 30
/** Whole-Naira ceiling for the max per-night price filter (sanity cap). */
export const MAX_HOTEL_MAX_PRICE = 100_000_000

/**
 * Server-side ordering vocabulary (backend contract for `GET /api/hotels/`
 * `?ordering=`): price and star rating in both directions, plus name.
 * Amenities are deliberately absent — amenity refinement is client-side over
 * the fetched page, and location is display-only (ADR-0005).
 */
export const HOTEL_ORDERINGS = [
  "price",
  "-price",
  "star_rating",
  "-star_rating",
  "name",
] as const

export type HotelOrdering = (typeof HOTEL_ORDERINGS)[number]

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
    destination: z
      .string()
      .trim()
      .max(200, "Destination is too long")
      .optional()
      .default(""),
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
    const hasIn = data.check_in !== ""
    const hasOut = data.check_out !== ""

    if (hasIn !== hasOut) {
      ctx.addIssue({
        code: "custom",
        message: hasIn
          ? "Add a check-out date, or clear check-in to browse all Hotels"
          : "Add a check-in date, or clear check-out to browse all Hotels",
        path: [hasIn ? "check_out" : "check_in"],
      })
      return
    }

    if (!hasIn && !hasOut) return

    const today = startOfTodayUtc()

    const checkIn = parseCalendarDate(data.check_in)
    if (checkIn === null) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid check-in date (YYYY-MM-DD)",
        path: ["check_in"],
      })
    } else if (checkIn.getTime() < today) {
      ctx.addIssue({
        code: "custom",
        message: "Check-in date cannot be in the past",
        path: ["check_in"],
      })
    }

    const checkOut = parseCalendarDate(data.check_out)
    if (checkOut === null) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid check-out date (YYYY-MM-DD)",
        path: ["check_out"],
      })
    } else if (checkOut.getTime() < today) {
      ctx.addIssue({
        code: "custom",
        message: "Check-out date cannot be in the past",
        path: ["check_out"],
      })
    }

    if (
      checkIn !== null &&
      checkOut !== null &&
      checkOut.getTime() <= checkIn.getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Check-out must be after check-in",
        path: ["check_out"],
      })
    }
  })

export type HotelSearchQueryInput = z.input<typeof hotelSearchQuerySchema>
export type HotelSearchQuery = z.output<typeof hotelSearchQuerySchema>

/**
 * Validate a parsed URL query before it reaches the backend. URL state is
 * user-editable and therefore untrusted; a hand-edited or partially-shared
 * link must surface a human error instead of firing an invalid request.
 */
export function validateHotelSearchQuery(
  query: HotelSearchQuery
): { success: true } | { success: false; message: string } {
  const parsed = hotelSearchQuerySchema.safeParse(query)
  if (parsed.success) return { success: true }
  return {
    success: false,
    message:
      parsed.error.issues[0]?.message ?? "Some stay details need attention.",
  }
}

// ---------------------------------------------------------------------------
// Shareable URL state — pure helpers (TDD seam 02).
// All HTTP stays in `lib/api/`; these helpers never call `fetch` and never
// throw on invalid input (invalid values are dropped, never leaked).
// Sensitive keys (tokens, payment, passwords) are never read or written.
// ---------------------------------------------------------------------------

export type RawSearchParams = Record<string, string | string[] | undefined>

/** Param keys that make `/hotels` a dynamic result view rather than the
 *  stable search landing (drives both auto-search and noindex). Only listing
 *  state travels here: destination plus the server filters and page.
 *  Stay dates and party live on the Hotel detail (`HotelBookingFlow`) and
 *  booking handoff — never on the listing — while amenity refinement stays
 *  client-side over the fetched page and never appears here (ADR-0005). */
export const HOTEL_SEARCH_PARAM_KEYS = [
  "destination",
  "max_price",
  "min_stars",
  "ordering",
  "page",
] as const

/**
 * Parse the shareable `?destination=&…&max_price=&min_stars=&ordering=&page=`
 * query into a search query. Invalid values are dropped, never thrown — the
 * caller runs `validateHotelSearchQuery` for strict human-readable errors.
 * Bounded integers, the whole-Naira ceiling, and the ordering vocabulary all
 * come from the shared listing module so every domain parses alike.
 */
export function parseHotelSearchParams(
  input: RawSearchParams
): HotelSearchQuery {
  // Preserve date strings verbatim (trimmed) so the form can surface
  // human-readable errors; invalid dates are not coerced, only trimmed.
  const query: HotelSearchQuery = {
    destination: firstSearchParam(input.destination)?.trim() ?? "",
    check_in: firstSearchParam(input.check_in)?.trim() ?? "",
    check_out: firstSearchParam(input.check_out)?.trim() ?? "",
    guests:
      parseBoundedInt(input.guests, 1, MAX_HOTEL_GUESTS) ??
      DEFAULT_HOTEL_GUESTS,
    rooms:
      parseBoundedInt(input.rooms, 1, MAX_HOTEL_ROOMS) ?? DEFAULT_HOTEL_ROOMS,
    max_price: parsePriceCeiling(input.max_price, MAX_HOTEL_MAX_PRICE),
    min_stars: parseBoundedInt(input.min_stars, 1, 5),
    ordering: parseOrderingValue(input.ordering, HOTEL_ORDERINGS),
    page: parseBoundedInt(input.page, 1) ?? 1,
  }
  const parsed = hotelSearchQuerySchema.safeParse(query)
  return parsed.success ? parsed.data : query
}

/**
 * Single source for which listing values travel in the URL and the backend
 * query. Destination, server filters, and non-default pages are written;
 * empty destination/dates, unset filters, and the default page are omitted
 * to keep links clean. The party is listing-external now (collected on the
 * Hotel detail): default values are omitted, while non-default values still
 * round-trip so legacy shared links survive. Request and link derive from
 * the same entries so they can never drift apart (ADR-0005
 * centralization). Only non-personal stay state appears.
 */
function hotelQueryEntries(query: HotelSearchQuery): [string, string][] {
  const entries: [string, string][] = []
  if (query.destination.trim().length > 0) {
    entries.push(["destination", query.destination.trim()])
  }
  if (query.check_in.trim().length > 0)
    entries.push(["check_in", query.check_in.trim()])
  if (query.check_out.trim().length > 0)
    entries.push(["check_out", query.check_out.trim()])
  if (query.guests !== DEFAULT_HOTEL_GUESTS)
    entries.push(["guests", String(query.guests)])
  if (query.rooms !== DEFAULT_HOTEL_ROOMS)
    entries.push(["rooms", String(query.rooms)])
  if (query.max_price !== undefined)
    entries.push(["max_price", String(query.max_price)])
  if (query.min_stars !== undefined)
    entries.push(["min_stars", String(query.min_stars)])
  if (query.ordering !== undefined) entries.push(["ordering", query.ordering])
  if (query.page > 1) entries.push(["page", String(query.page)])
  return entries
}

/** Serialize a search query to a shareable query string (no leading `?`). */
export function buildHotelSearchParams(query: HotelSearchQuery): string {
  return new URLSearchParams(hotelQueryEntries(query)).toString()
}

/**
 * Backend query for `GET /api/hotels/`. Derived from the same entries as the
 * URL so request and link can never drift apart (ADR-0005 centralization).
 */
export function toHotelApiQuery(
  query: HotelSearchQuery
): Record<string, string> {
  return Object.fromEntries(hotelQueryEntries(query))
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
})

export type HotelList = z.infer<typeof hotelListSchema>

export const paginatedHotelListSchema = z.object({
  count: z.number().int().min(0),
  // DRF marks next/previous nullable and not required — tolerate absence.
  next: z.string().nullable().default(null),
  previous: z.string().nullable().default(null),
  results: z.array(hotelListSchema),
})

export type PaginatedHotels = PaginatedResponse<HotelList>

/**
 * Search hotels via `GET /api/hotels/` with centralized validation.
 * - `noStore: true` — every query is request-time state, never cached (ADR-0005).
 * - The response is validated against the backend contract; a shape violation
 *   throws a typed, customer-safe error instead of a partial result.
 */
export async function getHotels(
  query: HotelSearchQuery
): Promise<PaginatedHotels> {
  const raw = await apiGet<unknown>("/api/hotels/", {
    query: toHotelApiQuery(query),
    noStore: true,
    timeoutMs: SEARCH_TIMEOUT_MS,
  })

  const parsed = paginatedHotelListSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("Invalid response from the hotel service.", {
      status: 200,
      code: "server",
    })
  }
  return parsed.data
}

/**
 * Server-side first read for the listing page (ticket 21): validates the URL
 * query exactly like the client does, fetches the first page live
 * (`no-store` — listing state is request-time state, ADR-0005), and maps
 * every outcome into a serializable payload the client seeds from. Never
 * throws: a validation failure or backend failure becomes the error payload
 * so the delivered HTML still renders the honest error state instead of a
 * skeleton.
 */
export async function getHotelListingInitial(
  rawParams: RawSearchParams
): Promise<ListingInitialPayload<PaginatedHotels>> {
  const query = parseHotelSearchParams(rawParams)
  const validation = validateHotelSearchQuery(query)
  if (!validation.success) {
    return {
      status: "error",
      page: null,
      errorMessage: validation.message,
      errorCode: "validation",
    }
  }
  try {
    const page = await getHotels(query)
    return { status: page.results.length > 0 ? "success" : "empty", page }
  } catch (error) {
    return {
      status: "error",
      page: null,
      errorMessage: getHumanErrorMessage(error),
      errorCode: error instanceof ApiError ? error.code : "unknown",
    }
  }
}

/**
 * Featured Hotels for Home. The Hotels endpoint exposes no server-side
 * featured flag, so this reads the first browse-all page (ISR-cached like
 * `listHotelSlugs`) and slices to `limit`. Empty stays empty (§12) — the
 * section renders its WhatsApp escape hatch instead of a blank grid.
 */
export async function getFeaturedHotels(limit = 3): Promise<HotelList[]> {
  const raw = await apiGet<unknown>("/api/hotels/", {
    query: { page: 1 },
    tags: ["hotels"],
  })
  const parsed = paginatedHotelListSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("Invalid response from the hotel service.", {
      status: 200,
      code: "server",
    })
  }
  return selectFeaturedItems(parsed.data.results, limit)
}

// ---------------------------------------------------------------------------
// Hotel card display mapping + client-side amenity refinement (ticket 02).
// Pure helpers (TDD seam): no fetch, no DOM. Server owns max price, min
// stars, ordering, and pagination plus the authoritative backend total;
// the client only refines the fetched page by amenities, and location stays
// display-only place context with no radius behavior (ADR-0005).
// ---------------------------------------------------------------------------

/** Key amenities shown on a Hotel card before the "+N more" overflow. */
export const HOTEL_CARD_KEY_AMENITIES = 3

export interface HotelCardDisplay {
  /** Detail route for the crawlable card link. */
  href: string
  /** Absolute image URL, or the local brand fallback when missing. */
  imageSrc: string
  /** Descriptive alt text: "Hotel name — City, Country". */
  imageAlt: string
  /** Display-only place context: "City, Country" or "City". */
  placeLabel: string
  /** e.g. "5-star Hotel"; null when the Hotel is unrated (never "0-star"). */
  starLabel: string | null
  /** Up to HOTEL_CARD_KEY_AMENITIES trimmed amenities. */
  keyAmenities: string[]
  /** True when amenities exist beyond the key set shown on the card. */
  hasMoreAmenities: boolean
  /**
   * Locked pricing copy: "from ₦X per night". Null when no usable price —
   * the card renders fallback copy instead of inventing a number.
   */
  priceLabel: string | null
}

// Positive-Naira parsing (`parsePriceAmount`, lib/listings.ts) and display
// formatting (`formatNaira`, lib/format.ts) are single implementations shared
// by card price copy, Room Type price copy, and preview arithmetic — no
// domain ever invents a "₦0" label.

/**
 * Locked from-price copy for Hotel cards: "from ₦X per night".
 * Returns null for missing, zero, or non-numeric prices so the card can
 * render fallback copy instead of a fabricated "from ₦0 per night".
 */
export function formatHotelFromPrice(
  startingPrice: string | null | undefined
): string | null {
  const amount = parsePriceAmount(startingPrice)
  if (amount === null) return null
  return `from ${formatNaira(amount)} per night`
}

/**
 * Star-rating presentation (one implementation): "5-star Hotel"; null when
 * the Hotel is unrated (never "0-star").
 */
function formatHotelStarLabel(starRating: number): string | null {
  return starRating >= 1 ? `${starRating}-star Hotel` : null
}

/**
 * Normalize a Hotel list row into everything a card needs to render.
 * Missing images fall back to the local brand asset; blank amenities are
 * dropped; unrated Hotels carry no star label; unusable prices carry no
 * price label. Uses CONTEXT.md vocabulary exactly (Hotel).
 */
export function toHotelCardDisplay(hotel: HotelList): HotelCardDisplay {
  const placeLabel =
    hotel.country.trim().length > 0
      ? `${hotel.city}, ${hotel.country}`
      : hotel.city
  const amenities = hotel.amenities_list
    .map((a) => a.trim())
    .filter((a) => a.length > 0)
  return {
    href: `/hotels/${hotel.slug}`,
    imageSrc: resolveListingImageUrl(hotel.main_image),
    imageAlt: `${hotel.name} — ${placeLabel}`,
    placeLabel,
    starLabel: formatHotelStarLabel(hotel.star_rating),
    keyAmenities: amenities.slice(0, HOTEL_CARD_KEY_AMENITIES),
    hasMoreAmenities: amenities.length > HOTEL_CARD_KEY_AMENITIES,
    priceLabel: formatHotelFromPrice(hotel.starting_price),
  }
}

/** Normalize an amenity string for forgiving comparison (case + padding). */
function normalizeAmenity(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Client-side amenity multi-select over the fetched page (AND semantics):
 * a Hotel stays visible only when it offers every selected amenity. Blank
 * selections are ignored; an empty selection returns the page untouched.
 * Never triggers a new search — server filters stay authoritative.
 */
export function filterHotelsByAmenities(
  hotels: HotelList[],
  selected: string[]
): HotelList[] {
  const required = selected.map(normalizeAmenity).filter((a) => a.length > 0)
  if (required.length === 0) return hotels
  return hotels.filter((hotel) => {
    const offered = new Set(hotel.amenities_list.map(normalizeAmenity))
    return required.every((amenity) => offered.has(amenity))
  })
}

export interface HotelAmenityOption {
  /** Display form, taken from first sighting on the page. */
  value: string
  label: string
  /** How many Hotels on the fetched page offer it. */
  count: number
}

/**
 * Derive multi-select options from the fetched page with per-amenity counts.
 * Most common first so the most useful refinements surface at the top;
 * ties break alphabetically for stability. Empty pages yield no options.
 */
export function collectAmenityOptions(
  hotels: HotelList[]
): HotelAmenityOption[] {
  const seen = new Map<string, { value: string; count: number }>()
  for (const hotel of hotels) {
    const uniqueOnHotel = new Set<string>()
    for (const raw of hotel.amenities_list) {
      const trimmed = raw.trim()
      if (trimmed.length === 0) continue
      const key = normalizeAmenity(trimmed)
      if (uniqueOnHotel.has(key)) continue
      uniqueOnHotel.add(key)
      const entry = seen.get(key)
      if (entry) {
        entry.count += 1
      } else {
        seen.set(key, { value: trimmed, count: 1 })
      }
    }
  }
  return [...seen.values()]
    .map((entry) => ({
      value: entry.value,
      label: entry.value,
      count: entry.count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// ---------------------------------------------------------------------------
// Support context — stay-aware WhatsApp prefills (non-personal only).
// Destination, dates, and party are already URL-visible search state; never
// names, emails, phones, references, or payment data.
// ---------------------------------------------------------------------------

export interface HotelStayContext {
  destination?: string | null
  check_in?: string | null
  check_out?: string | null
  guests?: number | null
  rooms?: number | null
}

/**
 * Compact stay line, e.g. "Lagos on 2026-05-01 → 2026-05-04 for 2 guests, 1 room".
 * Skips whatever is unknown so partial context still reads naturally.
 */
export function describeHotelStay(stay: HotelStayContext): string {
  const parts: string[] = []
  const label =
    stay.destination && stay.destination.trim().length > 0
      ? stay.destination.trim()
      : null
  if (label) parts.push(label)
  if (stay.check_in && stay.check_out) {
    parts.push(`on ${stay.check_in} → ${stay.check_out}`)
  } else if (stay.check_in) {
    parts.push(`from ${stay.check_in}`)
  }
  const guests = stay.guests && stay.guests > 0 ? stay.guests : null
  const rooms = stay.rooms && stay.rooms > 0 ? stay.rooms : null
  if (guests !== null) {
    parts.push(
      `for ${guests} ${guests === 1 ? "guest" : "guests"}${rooms !== null ? `, ${rooms} ${rooms === 1 ? "room" : "rooms"}` : ""}`
    )
  } else if (rooms !== null) {
    parts.push(`for ${rooms} ${rooms === 1 ? "room" : "rooms"}`)
  }
  return parts.join(" ")
}

/**
 * WhatsApp support URL for a hotel topic with optional stay context, e.g.
 * "choosing a hotel (Lagos on 2026-05-01 → 2026-05-04 for 2 guests, 1 room)".
 * Numbers stay owned by lib/content/company.ts — this only builds the message.
 */
export function getHotelSupportWhatsAppUrl(
  topic: string,
  stay?: HotelStayContext
): string {
  const detail = stay ? describeHotelStay(stay) : ""
  const context = detail ? `${topic} (${detail})` : topic
  return getSupportWhatsAppUrl(context)
}

// ---------------------------------------------------------------------------
// Hotel detail — ISR reads with display mapping (ticket 03).
// Stable Hotel content uses timed revalidation (ADR-0005); search, creation,
// and verification opt out of caching entirely. Location is display-only
// place context with a map link only when coordinates exist — no radius or
// geo-query behavior in v1.
// ---------------------------------------------------------------------------

/** One bookable room kind within a Hotel (apidoc RoomType). */
export const roomTypeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().optional().default(""),
  price_per_night: z.string().optional().default("0.00"),
  max_guests: z.number().int().min(0).optional().default(0),
  total_rooms: z.number().int().min(0).optional().default(0),
  image: z.string().optional().default(""),
})

export type RoomType = z.infer<typeof roomTypeSchema>

export const hotelImageSchema = z.object({
  id: z.number().int(),
  image: z.string(),
  caption: z.string().optional().default(""),
})

export type HotelImage = z.infer<typeof hotelImageSchema>

const nullableDecimal = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) =>
    value === undefined || value === null || String(value).trim() === ""
      ? null
      : String(value).trim()
  )

/** Full Hotel detail (apidoc HotelDetail). Sparse rows fall back so one
 *  thin field can never fail the whole page. */
export const hotelDetailSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional().default(""),
  city: z.string(),
  address: z.string().optional().default(""),
  country: z.string().optional().default(""),
  star_rating: z.number().int().min(0).max(5).optional().default(0),
  main_image: z.string().optional().default(""),
  amenities_list: z.array(z.string()).optional().default([]),
  latitude: nullableDecimal,
  longitude: nullableDecimal,
  starting_price: z.string().optional().default("0.00"),
  room_types: z.array(roomTypeSchema).optional().default([]),
  images: z.array(hotelImageSchema).optional().default([]),
})

export type HotelDetail = z.infer<typeof hotelDetailSchema>

/**
 * Stable Hotel detail read for ISR pages (`revalidate 300`,
 * `dynamicParams true`). Timed revalidation keeps detail fast and indexable
 * while picking up new slugs and price changes without redeploys (ADR-0005,
 * ADR-0003). The five-minute lifetime is the price-honesty contract (ticket
 * 21): a browsed from-price must not drift an hour from the checkout total.
 * A shape violation throws a typed error instead of a partial page.
 */
export async function getHotelDetail(slug: string): Promise<HotelDetail> {
  const raw = await apiGet<unknown>(
    `/api/hotels/${encodeURIComponent(slug)}/`,
    {
      tags: ["hotels", `hotel:${slug}`],
      revalidate: LISTING_DETAIL_REVALIDATE_SECONDS,
    }
  )
  const parsed = hotelDetailSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("Invalid response from the hotel service.", {
      status: 200,
      code: "server",
    })
  }
  return parsed.data
}

/**
 * Best-effort slug list for `generateStaticParams` (first browse-all page,
 * cached like any stable read). New slugs beyond page one still render on
 * demand via open-ended fallback (`dynamicParams true`).
 */
export async function listHotelSlugs(): Promise<string[]> {
  const raw = await apiGet<unknown>("/api/hotels/", {
    query: { page: 1 },
    tags: ["hotels"],
  })
  const parsed = paginatedHotelListSchema.safeParse(raw)
  if (!parsed.success) return []
  return extractSlugs(parsed.data.results)
}

// ---------------------------------------------------------------------------
// Detail display mapping — pure helpers (TDD seam, ticket 03).
// ---------------------------------------------------------------------------

export interface HotelGalleryImage {
  src: string
  alt: string
  caption: string
}

export interface RoomTypeDisplay {
  id: number
  name: string
  description: string
  /** Locked per-night copy, e.g. "₦85,000 per night"; null falls back. */
  priceLabel: string | null
  /** Capacity guidance; zero-capacity rows never block (ticket 04 owns it). */
  capacityLabel: string
  imageSrc: string
  imageAlt: string
  maxGuests: number
  totalRooms: number
}

export interface HotelDetailDisplay {
  href: string
  name: string
  /** Display-only place context: "City, Country" or "City". */
  placeLabel: string
  /** Street address text, or null when the backend carries none. */
  addressText: string | null
  /** Exact-point map link; null without coordinates (never a guess). */
  mapUrl: string | null
  starLabel: string | null
  description: string
  amenities: string[]
  gallery: HotelGalleryImage[]
  rooms: RoomTypeDisplay[]
  /** Locked from-price copy; null renders the booking-time caveat. */
  fromPriceLabel: string | null
}

/**
 * Locked per-night copy for a Room Type: "₦X per night". Null for missing,
 * zero, or non-numeric prices so the row renders fallback copy instead of
 * inventing a number (same contract as `formatHotelFromPrice`).
 */
export function formatRoomTypePrice(
  pricePerNight: string | null | undefined
): string | null {
  const amount = parsePriceAmount(pricePerNight)
  if (amount === null) return null
  return `${formatNaira(amount)} per night`
}

/** Capacity guidance for a Room Type row. Zero capacity means unknown —
 *  honest fallback copy, never a frontend block (ticket 04 enforces). */
export function formatRoomTypeCapacity(room: RoomType): string {
  if (room.max_guests <= 0) return "Capacity confirmed at booking"
  const rooms =
    room.total_rooms > 0
      ? ` · ${room.total_rooms} ${room.total_rooms === 1 ? "room" : "rooms"}`
      : ""
  return `Sleeps ${room.max_guests} per room${rooms}`
}

/**
 * Whether a Room Type description carries information beyond restating the
 * Room Type and Hotel names.
 *
 * The backend templates most descriptions as `"<Room Type> at <Hotel>."`, which
 * is pure restatement: printing it under the Room Type name adds a line of
 * noise and pushes the price below the fold on desktop.
 *
 * After the two names are removed, what remains must contain at least one word
 * of three or more characters to count as content. A bare `"at"` (two letters)
 * is a connector, not information, so a pure template still reads as filler
 * while real copy such as `"King bed, city view."` is kept.
 */
export function hasSubstantiveRoomDescription(
  description: string,
  roomName: string,
  hotelName: string
): boolean {
  let remainder = description.toLowerCase()
  for (const name of [roomName, hotelName]) {
    const needle = name.trim().toLowerCase()
    if (needle.length > 0) remainder = remainder.split(needle).join(" ")
  }
  return remainder.split(/[^a-z0-9]+/).some((word) => word.length >= 3)
}

/**
 * Normalize a Hotel detail into everything the detail page needs to render.
 * Gallery alt text always names the Hotel; uncaptioned photos fall back to a
 * positional label so alt text is never empty. Location stays display-only
 * place context with an exact-point map link only when coordinates exist.
 */
export function toHotelDetailDisplay(hotel: HotelDetail): HotelDetailDisplay {
  const placeLabel =
    hotel.country.trim().length > 0
      ? `${hotel.city}, ${hotel.country}`
      : hotel.city
  const amenities = hotel.amenities_list
    .map((a) => a.trim())
    .filter((a) => a.length > 0)

  const gallery: HotelGalleryImage[] =
    hotel.images.length > 0
      ? hotel.images.map((image, index) => ({
          src: resolveListingImageUrl(image.image),
          caption: image.caption.trim(),
          alt:
            image.caption.trim().length > 0
              ? `${hotel.name} — ${image.caption.trim()}`
              : `${hotel.name} — photo ${index + 1} of ${hotel.images.length}`,
        }))
      : [
          {
            src: resolveListingImageUrl(hotel.main_image),
            caption: "",
            alt: `${hotel.name} — ${placeLabel}`,
          },
        ]

  const rooms: RoomTypeDisplay[] = hotel.room_types.map((room) => ({
    id: room.id,
    name: room.name,
    description: room.description,
    priceLabel: formatRoomTypePrice(room.price_per_night),
    capacityLabel: formatRoomTypeCapacity(room),
    imageSrc: resolveListingImageUrl(room.image),
    imageAlt: `${room.name} at ${hotel.name}`,
    maxGuests: room.max_guests,
    totalRooms: room.total_rooms,
  }))

  const lat = hotel.latitude?.trim() ?? ""
  const lng = hotel.longitude?.trim() ?? ""
  const addressText =
    hotel.address.trim().length > 0 ? hotel.address.trim() : null

  return {
    href: `/hotels/${hotel.slug}`,
    name: hotel.name,
    placeLabel,
    addressText,
    mapUrl:
      lat.length > 0 && lng.length > 0
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
        : null,
    starLabel: formatHotelStarLabel(hotel.star_rating),
    description: hotel.description,
    amenities,
    gallery,
    rooms,
    fromPriceLabel: formatHotelFromPrice(hotel.starting_price),
  }
}

// ---------------------------------------------------------------------------
// Room Type choice — capacity rule, nights, and preview arithmetic (ticket 04).
// Pure helpers (TDD seams): no fetch, no DOM. Exactly one Room Type per Hotel
// Booking; guests at most per-room capacity times rooms; zero-capacity rows
// are unknown and never block; Hotel room counts are informational only
// with availability owned by the backend at creation time; the only
// chargeable total is the backend-computed amount (ADR-0005).
// ---------------------------------------------------------------------------

export interface RoomCapacityInput {
  /** Per-room guest capacity; 0 means unknown (never blocks). */
  maxGuests: number
  numGuests: number
  numRooms: number
}

export type CapacityVerdict =
  | { ok: true; capacity: number | null }
  | { ok: false; capacity: number; shortBy: number; guidance: string }

/**
 * Capacity rule: guests ≤ per-room capacity × rooms. Zero-capacity rows pass
 * through as unknown. Over-capacity verdicts carry inline guidance to add
 * rooms or choose another Room Type.
 */
export function checkRoomCapacity(input: RoomCapacityInput): CapacityVerdict {
  if (input.maxGuests <= 0) return { ok: true, capacity: null }
  const capacity = input.maxGuests * input.numRooms
  if (input.numGuests <= capacity) return { ok: true, capacity }
  const shortBy = input.numGuests - capacity
  const roomsNeeded = Math.ceil(input.numGuests / input.maxGuests)
  const extraRooms = roomsNeeded - input.numRooms
  const guestWord = capacity === 1 ? "guest" : "guests"
  const roomWord = input.numRooms === 1 ? "room" : "rooms"
  const extraWord = extraRooms === 1 ? "room" : "rooms"
  return {
    ok: false,
    capacity,
    shortBy,
    guidance: `Only ${capacity} ${guestWord} fit in ${input.numRooms} ${roomWord} of this Room Type — add ${extraRooms} more ${extraWord} or choose a Room Type that sleeps more.`,
  }
}

/**
 * Whole nights between two YYYY-MM-DD dates, or null when the pair is not a
 * real forward stay (same-day, backwards, impossible, or blank). Dates are
 * optional upstream, so blanks are quiet nulls, not errors.
 */
export function calculateNights(
  checkIn: string,
  checkOut: string
): number | null {
  const start = parseCalendarDate(checkIn.trim())
  const end = parseCalendarDate(checkOut.trim())
  if (start === null || end === null) return null
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  return nights >= 1 ? nights : null
}

export interface StayPreviewInput {
  pricePerNight: string | null | undefined
  nights: number | null | undefined
  numRooms: number | null | undefined
}

/**
 * Preview arithmetic: nights × per-night price × rooms in whole Naira.
 * Display only — the charged total comes exclusively from backend creation
 * and verification responses. Null whenever any input is unusable (a preview
 * of ₦0 would lie).
 */
export function previewStayTotal(input: StayPreviewInput): number | null {
  const nights = input.nights ?? 0
  const rooms = input.numRooms ?? 0
  if (!Number.isInteger(nights) || nights < 1) return null
  if (!Number.isInteger(rooms) || rooms < 1) return null
  const price = parsePriceAmount(input.pricePerNight)
  if (price === null) return null
  return Math.round(price * nights * rooms)
}

// ---------------------------------------------------------------------------
// Booking handoff — stay contract between detail choice and guest details.
// One Room Type plus dates plus party travels in the URL (shareable, no PII,
// no payment data); ticket 05 validates it strictly before any payment step.
// ---------------------------------------------------------------------------

export interface HotelBookingStay {
  room_type_id: number
  check_in: string
  check_out: string
  guests: number
  rooms: number
}

export interface ParsedHotelBookingStay {
  room_type_id?: number
  check_in: string
  check_out: string
  guests?: number
  rooms?: number
}

/** Serialize the chosen stay for the guest-details step (no leading `?`). */
export function buildHotelBookingParams(stay: HotelBookingStay): string {
  const params = new URLSearchParams()
  params.set("room_type", String(stay.room_type_id))
  if (stay.check_in.trim().length > 0)
    params.set("check_in", stay.check_in.trim())
  if (stay.check_out.trim().length > 0)
    params.set("check_out", stay.check_out.trim())
  params.set("guests", String(stay.guests))
  params.set("rooms", String(stay.rooms))
  return params.toString()
}

/**
 * Parse the booking handoff back into a stay. Lenient by design — invalid
 * values are dropped and the receiving step surfaces guided errors instead
 * of firing a request off a phantom Room Type.
 */
export function parseHotelBookingParams(
  input: RawSearchParams
): ParsedHotelBookingStay {
  const roomRaw = firstSearchParam(input.room_type)?.trim() ?? ""
  const roomId =
    /^\d+$/.test(roomRaw) && Number(roomRaw) >= 1 ? Number(roomRaw) : undefined
  return {
    room_type_id: roomId,
    check_in: firstSearchParam(input.check_in)?.trim() ?? "",
    check_out: firstSearchParam(input.check_out)?.trim() ?? "",
    guests: parseBoundedInt(input.guests, 1, MAX_HOTEL_GUESTS),
    rooms: parseBoundedInt(input.rooms, 1, MAX_HOTEL_ROOMS),
  }
}

// ---------------------------------------------------------------------------
// Hotel Guest form + creation with Paystack redirect (ticket 05).
// Guest Booking with no account gate: one full name plus email plus
// Nigerian/international phone (normalized before submission), validated on
// blur plus on submit plus pre-payment. Creation is the quote (no
// flight-style revalidation): the backend returns a Paystack authorization
// URL plus a Payment Reference, and the guest continues there. The charged
// total is backend-authoritative (ADR-0005).
// ---------------------------------------------------------------------------

/**
 * Hotel Guest contact validation (ticket 05) is the shared guest-contact
 * schema (`guestContactSchema` in `./validation.ts`) — the one field set for
 * every booking type; the phone transform normalizes Nigerian formats to
 * `+234…` before submission.
 */

/** Backend contract for `POST /api/hotels/bookings/create/`. */
export const hotelBookingCreateRequestSchema = guestContactSchema.extend({
  hotel_id: z.number().int().positive(),
  room_type_id: z.number().int().positive(),
  check_in: z.string().trim().min(1, "Add a check-in date"),
  check_out: z.string().trim().min(1, "Add a check-out date"),
  num_rooms: z.number().int().min(1).max(MAX_HOTEL_ROOMS),
  num_guests: z.number().int().min(1).max(MAX_HOTEL_GUESTS),
})

export type HotelBookingCreatePayload = z.infer<
  typeof hotelBookingCreateRequestSchema
>

export interface BuildHotelBookingPayloadInput {
  hotel_id: number
  room_type_id: number
  check_in: string
  check_out: string
  num_rooms: number
  num_guests: number
  guest_name: string
  guest_email: string
  guest_phone: string
}

/**
 * Build the creation payload (TDD seam): full-name shape, email validity,
 * and Nigerian phone normalization are enforced here as well as in the form,
 * so responses stay treated as untrusted even after client validation.
 */
export function buildHotelBookingPayload(
  input: BuildHotelBookingPayloadInput
): HotelBookingCreatePayload {
  return hotelBookingCreateRequestSchema.parse(input)
}

/** The Paystack-handoff contract (shared by every booking type). */
export type HotelBookingCreateResult = BookingCreateResult
/**
 * Create one Hotel Booking (Guest Booking — no login required). Validates
 * the payload against the backend contract first; the response is parsed as
 * untrusted input and normalized from either the flat or the
 * `{ booking, payment }` envelope via the shared module. Never cached.
 */
export async function createHotelBooking(
  payload: HotelBookingCreatePayload
): Promise<HotelBookingCreateResult> {
  const raw = await apiPost<unknown, Record<string, unknown>>(
    "/api/hotels/bookings/create/",
    payload as Record<string, unknown>,
    { sameOrigin: true }
  )
  const normalized = normalizeBookingCreateResult(raw)
  if (!normalized) {
    throw new ApiError("Invalid response from the hotel service.", {
      status: 201,
      code: "server",
    })
  }
  return normalized
}

// ---------------------------------------------------------------------------
// Booking session — this domain's storage keys. Stable serialise, digest,
// save, read, reuse and clear all live in `./shared.ts` (the single home for
// that logic); only the domain's own session keys remain here.
// ---------------------------------------------------------------------------

export const PENDING_HOTEL_BOOKING_SESSION_KEY =
  "alphaa:pending-hotel-booking:v1"
export const HOTEL_PAYMENT_REFERENCE_SESSION_KEY =
  "alphaa:hotel-payment-reference:v1"

/**
 * Drop the stored Hotel Booking and Payment Reference once a payment is
 * verified as paid. Back/forward can then never re-enter checkout with a
 * completed stay; the confirmation page keeps rendering from its fetched
 * booking, and the reference stays in the URL for refreshes.
 */
export function clearHotelBookingSession(): void {
  clearSessionRecord(PENDING_HOTEL_BOOKING_SESSION_KEY)
  clearSessionRecord(HOTEL_PAYMENT_REFERENCE_SESSION_KEY)
}

// ---------------------------------------------------------------------------
// Reference-only verification with confirmation and recovery (ticket 06).
// A return from Paystack proves nothing by itself: the live Hotel Booking is
// fetched without caching and only a verified `confirmed` status renders the
// premium confirmation. Every other outcome keeps the Payment Reference with
// payment-safety reassurance (ADR-0005).
// ---------------------------------------------------------------------------

/**
 * Terminal verification outcome derived from a Hotel Booking status
 * (apidoc Status8eeEnum: pending, confirmed, cancelled, failed). Delegates to
 * the shared verification seam so every booking type resolves the same
 * vocabulary: the universal order lookup reports money movement as
 * `success`/`paid`, and those count as confirmed so an order-first flow never
 * renders a paid booking as "still processing". Unrecognized states stay
 * pending so the guest keeps checking instead of assuming success — or
 * assuming failure and paying twice.
 */
export type HotelVerificationOutcome = VerificationOutcome

export function resolveHotelVerificationState(booking: {
  status?: string | null
}): HotelVerificationOutcome {
  return resolveBookingOutcome("hotel", booking.status)
}

/**
 * A verified Hotel Booking (apidoc HotelBooking). Permissive beyond
 * `reference`: only the reference is required and renderers read the rest
 * defensively. Amounts are backend-authoritative display strings — the
 * charged total is whatever creation and verification returned.
 */
export const hotelBookingSchema = z.object({
  reference: z.string(),
  hotel_name: z.string().optional().default(""),
  room_type_name: z.string().optional().default(""),
  guest_name: z.string().optional().default(""),
  guest_email: z.string().optional().default(""),
  guest_phone: z.string().optional().default(""),
  check_in: z.string().optional().default(""),
  check_out: z.string().optional().default(""),
  nights: z.number().int().nonnegative().optional().default(0),
  num_rooms: z.number().int().nonnegative().optional().default(0),
  num_guests: z.number().int().nonnegative().optional().default(0),
  price_per_night: z.union([z.string(), z.number()]).optional().default(""),
  total_amount: z.union([z.string(), z.number()]).optional().default(""),
  status: z.string().optional().default("pending"),
})

export type HotelBooking = z.infer<typeof hotelBookingSchema>

/**
 * Verify the Paystack payment for a reference and fetch the final Hotel
 * Booking. Never cached: verification must reflect the live payment state,
 * not a stale pending snapshot. Guest Booking — no login required. A shape
 * violation throws a typed, customer-safe error instead of a raw ZodError.
 */
export async function verifyHotelBooking(
  reference: string
): Promise<HotelBooking> {
  const raw = await apiGet<unknown>(
    `/api/hotels/bookings/verify/${encodeURIComponent(reference)}/`,
    { ...VERIFICATION_REQUEST }
  )
  const parsed = hotelBookingSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("Invalid response from the hotel service.", {
      status: 200,
      code: "server",
    })
  }
  return parsed.data
}

/**
 * Build a renderable Hotel Booking from the universal order's embedded
 * details when the module verify call fails (e.g. transient backend error
 * after a confirmed payment). Only the reference is guaranteed; everything
 * else is read defensively by renderers.
 */
export function hotelBookingFromOrder(
  reference: string,
  order: { order?: unknown } | null | undefined
): HotelBooking | null {
  const details =
    order && typeof order === "object" && "order" in order
      ? (order as { order?: unknown }).order
      : null
  if (typeof details !== "object" || details === null) {
    return hotelBookingSchema.parse({ reference })
  }
  const parsed = hotelBookingSchema.safeParse({
    ...(details as Record<string, unknown>),
    reference,
  })
  if (parsed.success) return parsed.data
  return hotelBookingSchema.parse({ reference })
}

/**
 * Confirmation-route URL carrying the Payment Reference as a query param
 * (ADR-0005 contract). Only the reference travels in the URL — never names,
 * emails, phones, tokens, or payment data.
 */
export function buildHotelConfirmationUrl(reference: string): string {
  return `/hotels/confirmation?reference=${encodeURIComponent(reference)}`
}

// Listing pagination and active-filter count are owned by `./shared.ts`
// (getPagination, getPageItems, countActiveFilters) and not re-exported here.

