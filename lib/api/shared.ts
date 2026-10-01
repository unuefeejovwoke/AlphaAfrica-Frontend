import { z } from "zod"
import { digestKey } from "./booking-key.ts"
import { clearSessionKeys } from "./verification.ts"

/**
 * Shared listing, booking-session, and pagination helpers (production
 * hardening, tickets 12–15).
 *
 * The Hotel (`./hotels.ts`) and Car (`./cars.ts`) modules grew as parallel
 * copies of the same logic: bounded-integer parsing, price ceilings,
 * ordering vocabularies, search-param presence, featured selection, slug
 * listing, pagination windows with honest last-page ranges, stable
 * serialisation plus session save/read/clear, digest-based reuse identity,
 * and Paystack-handoff envelope normalisation. This module is the single
 * home for that logic — the next domain to need it (Visa, package) plugs
 * in here instead of copying it a third time.
 *
 * Deliberately NOT duplicated here:
 * - Verification-state resolution lives in `./verification.ts`
 *   (`resolveBookingOutcome` + `VerificationOutcome`, ticket 11). Both
 *   domains already delegate to it; a second resolver here would drift.
 * - Money display (`lib/format.ts`) and listing image resolution
 *   (`lib/listings.ts`) already have single homes.
 *
 * Reuse identity is a digest, never readable payload (ticket 06): session
 * records carry only `{ key, reference, authorization_url }`, where `key`
 * is {@link hashPayloadKey} output. Names, emails, phones, and stay/hire
 * details must never sit in browser storage.
 *
 * Pure unless noted: no `fetch`, no DOM outside the session helpers (which
 * are window-guarded and never throw). All HTTP stays in the domain
 * modules — this module never calls it.
 */

// ---------------------------------------------------------------------------
// Listing parameters — bounded integers, price ceilings, ordering
// vocabularies, and search-param presence. Invalid values are dropped, never
// thrown; strict human-readable errors stay in the domain schemas.
// ---------------------------------------------------------------------------

export type RawSearchParams = Record<string, string | string[] | undefined>

/** First string value of a query param (Next.js may repeat keys). */
export function firstSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

/** Parse a bounded integer, or undefined when absent/out of range. */
export function parseBoundedInt(
  value: string | string[] | undefined,
  min: number,
  max?: number
): number | undefined {
  const raw = firstSearchParam(value)?.trim()
  if (!raw) return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < min) return undefined
  if (max !== undefined && parsed > max) return undefined
  return parsed
}

/**
 * Parse a whole-Naira price ceiling (commas tolerated). Zero, negative,
 * fractional, non-numeric, and absurd values all mean "no cap" (identical
 * to omitting the ceiling backend-side).
 */
export function parsePriceCeiling(
  value: string | string[] | undefined,
  max: number
): number | undefined {
  const raw = firstSearchParam(value)?.trim().replace(/,/g, "")
  if (!raw) return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > max)
    return undefined
  return parsed
}

/** Parse server-side ordering against the domain's vocabulary, if known. */
export function parseOrderingValue<T extends string>(
  value: string | string[] | undefined,
  vocabulary: readonly T[]
): T | undefined {
  const raw = firstSearchParam(value)?.trim()
  if (!raw) return undefined
  return (vocabulary as readonly string[]).includes(raw)
    ? (raw as T)
    : undefined
}

/**
 * True when the query carries any listing state from `keys`. A bare
 * listing path is the landing; any filter, sort, or page marks a results
 * view (drives both auto-search and noindex, consistently per domain).
 */
export function hasListingSearchParams(
  input: RawSearchParams,
  keys: readonly string[]
): boolean {
  for (const key of keys) {
    const value = firstSearchParam(input[key])
    if (typeof value === "string" && value.trim() !== "") return true
  }
  return false
}

/**
 * Number of active server-filter groups: one per defined value. Callers
 * pass exactly the server-owned slice (e.g. price + stars + sort), so a
 * count of "defined" is a count of groups.
 */
export function countActiveFilters(query: Record<string, unknown>): number {
  return Object.values(query).filter((value) => value !== undefined).length
}

// ---------------------------------------------------------------------------
// Pagination — numbered arithmetic over DRF `count/next/previous` shapes plus
// the compact page-item window. Pure seams so listing UIs stay unit-testable.
// ---------------------------------------------------------------------------

export interface PaginationInput {
  page: number
  totalCount: number
  pageSize: number
  visibleCount: number
}

export interface PaginationRange {
  totalPages: number
  start: number
  end: number
}

/**
 * Numbered-pagination arithmetic. `pageSize` is the observed full-page
 * length (first full page wins); `visibleCount` is this page's result
 * length so the last-page range stays honest (`Showing 11–13 of 13`,
 * never `11–20 of 13`).
 */
export function getPagination(input: PaginationInput): PaginationRange {
  const { page, totalCount, visibleCount } = input
  const pageSize =
    Number.isInteger(input.pageSize) && input.pageSize > 0
      ? input.pageSize
      : visibleCount > 0
        ? visibleCount
        : 1
  if (totalCount <= 0 || visibleCount <= 0) {
    return { totalPages: 0, start: 0, end: 0 }
  }
  const safePage = Number.isInteger(page) && page > 0 ? page : 1
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const start = (safePage - 1) * pageSize + 1
  const end = Math.min(totalCount, start + visibleCount - 1)
  return { totalPages, start, end }
}

export type PageItem = number | "ellipsis"

/**
 * Compact page-item window: always the first/last page plus `sibling`
 * neighbours around the current page, with ellipsis gaps.
 */
export function getPageItems(
  page: number,
  totalPages: number,
  sibling = 1
): PageItem[] {
  if (!Number.isInteger(totalPages) || totalPages <= 0) return []
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const safePage = Math.min(Math.max(1, page), totalPages)
  const near = new Set<number>([1, totalPages, safePage])
  for (let i = 1; i <= Math.max(0, sibling); i++) {
    if (safePage - i > 1) near.add(safePage - i)
    if (safePage + i < totalPages) near.add(safePage + i)
  }
  const sorted = [...near].sort((a, b) => a - b)
  const items: PageItem[] = []
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]
    const prev = sorted[i - 1]
    if (i > 0 && current - prev > 1) items.push("ellipsis")
    items.push(current)
  }
  return items
}

// ---------------------------------------------------------------------------
// Booking session — one stored creation per in-flight attempt, keyed by a
// digest of the full creation payload. Retrying an identical payload reuses
// the stored pending reference instead of creating a duplicate booking; any
// change creates fresh. The session helpers never throw (private mode) and
// never persist readable guest data (ticket 06).
// ---------------------------------------------------------------------------

/** A stored booking creation: digest key plus the Paystack handoff. */
export interface PendingBookingRecord {
  key: string
  reference: string
  authorization_url: string
}

/**
 * Key-order-normalized serialisation, so identical payloads hash
 * identically regardless of property insertion order.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null"
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`
  }
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  const parts = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`
  )
  return `{${parts.join(",")}}`
}

/**
 * Identity of one creation attempt: a digest of the canonical payload.
 * The stored key is hex, never the readable payload — guest contact and
 * stay/hire details must never sit in browser storage.
 */
export function hashPayloadKey(payload: unknown): string {
  return digestKey(stableStringify(payload))
}

/**
 * Reuse the stored pending reference when the retry matches the stored
 * key, otherwise signal that a new creation is required. Never throws.
 */
export function findReusableBookingRecord(
  stored: PendingBookingRecord | null,
  key: string
): { reference: string; authorization_url: string } | null {
  if (!stored || stored.key !== key) return null
  if (!stored.reference || !stored.authorization_url) return null
  return {
    reference: stored.reference,
    authorization_url: stored.authorization_url,
  }
}

/** Persist the created booking so an identical retry reuses it. */
export function saveSessionRecord(
  sessionKey: string,
  record: PendingBookingRecord
): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(sessionKey, JSON.stringify(record))
  } catch {
    // sessionStorage may throw in private mode — the creation still ran
  }
}

/** Read back the stored booking, or null when absent/corrupt. */
export function readSessionRecord(sessionKey: string): PendingBookingRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(sessionKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== "object" || parsed === null) return null
    const record = parsed as Record<string, unknown>
    if (
      typeof record.key !== "string" ||
      typeof record.reference !== "string" ||
      typeof record.authorization_url !== "string"
    ) {
      return null
    }
    return {
      key: record.key,
      reference: record.reference,
      authorization_url: record.authorization_url,
    }
  } catch {
    return null
  }
}

/**
 * Drop a stored session record (e.g. once a payment verifies as paid, so
 * back/forward can never re-enter checkout). Built on the shared
 * verification seam's clearer.
 */
export function clearSessionRecord(sessionKey: string): void {
  clearSessionKeys([sessionKey])
}

/** Persist a plain Payment Reference string so refresh/back survive. */
export function saveSessionString(sessionKey: string, value: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(sessionKey, value)
  } catch {
    // sessionStorage may throw in private mode — the URL copy still works
  }
}

/** Read back a persisted string, or null when absent. */
export function readSessionString(sessionKey: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(sessionKey)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Creation envelope — either live shape normalizes to the Paystack handoff:
// flat (apidoc) or the `{ booking, payment }` envelope the guide documents.
// Null when no usable reference plus checkout link exists, so callers
// surface an error instead of redirecting to a broken URL.
// ---------------------------------------------------------------------------

/** Creation result: Paystack handoff plus the Payment Reference. */
export const bookingCreateResultSchema = z.object({
  reference: z.string().min(1),
  authorization_url: z.string().min(1),
})

export type BookingCreateResult = z.infer<typeof bookingCreateResultSchema>

const bookingCreateEnvelopeSchema = z
  .object({
    reference: z.string().optional(),
    authorization_url: z.string().optional(),
    booking: z
      .object({ reference: z.string().optional() })
      .passthrough()
      .optional(),
    payment: z
      .object({
        reference: z.string().optional(),
        authorization_url: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export function normalizeBookingCreateResult(
  raw: unknown
): BookingCreateResult | null {
  const parsed = bookingCreateEnvelopeSchema.safeParse(raw)
  if (!parsed.success) return null
  const { booking, payment } = parsed.data
  const reference =
    payment?.reference ?? booking?.reference ?? parsed.data.reference
  const authorization_url =
    payment?.authorization_url ?? parsed.data.authorization_url
  if (!reference || !authorization_url) return null
  return { reference, authorization_url }
}

// ---------------------------------------------------------------------------
// Listing reads — the pure halves of featured selection and slug listing.
// Fetching plus envelope validation stays in the domain modules (different
// endpoints and error copy per domain); only the shaping is shared.
// ---------------------------------------------------------------------------

/**
 * Featured selection for Home: the listing endpoints expose no server-side
 * featured flag, so the first browse-all page is sliced to `limit`. Empty
 * stays empty — sections render their support escape hatch instead of a
 * blank grid.
 */
export function selectFeaturedItems<T>(results: T[], limit = 3): T[] {
  return results.slice(0, Math.max(1, limit))
}

/** Slug list for `generateStaticParams` (first browse-all page). */
export function extractSlugs(items: { slug: string }[]): string[] {
  return items.map((item) => item.slug)
}
