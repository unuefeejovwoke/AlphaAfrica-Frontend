/**
 * Privacy-safe analytics for the Alphaa Africa platform (Phase 2, PRD §22;
 * Phase 3 ticket 10 flight funnel).
 *
 * Flight funnel (all props are coarse, never PII):
 * - flight_search_started { trip_type, cabin, route, leg_count }
 * - flight_search_completed { trip_type, route, leg_count, results }
 * - flight_selected { trip_type, cabin, route }
 * - flight_price_changed { direction, currency } (`price_changed` kept as legacy alias)
 * - flight_checkout_started { travellers, is_international }
 * - flight_payment_initiated { currency, travellers }
 * - flight_payment_completed { type }
 * - flight_confirmation_viewed { type } (`booking_confirmation_viewed` kept as legacy alias)
 * - support_click { context, channel }
 *
 * Hotel funnel (Phase 4, ticket 07 — all props coarse, never PII):
 * - hotel_search { has_destination, has_dates, guests, rooms }
 * - hotel_viewed { city, stars }
 * - hotel_booking_started { nights, rooms, guests }
 * - hotel_payment_initiated { currency, nights }
 * - hotel_payment_completed { type }
 * - hotel_confirmation_viewed { type, outcome }
 * - support_click { context, channel }
 *
 * Blog funnel (ADR-0006 — all props coarse, never PII):
 * - blog_viewed { slug, category }
 * - blog_search { has_search, has_category, has_tag }
 *
 * - Events are an allowlist: `track()` throws on unknown names so a typo
 *   fails loudly in development instead of silently dropping data.
 * - Props are sanitized: any key resembling passport, payment, card, token,
 *   password, email, phone, auth, reference, order, pnr, booking, flight_offer,
 *   opaque, or blob data is dropped before dispatch, so sensitive customer
 *   data can never reach the analytics pipeline. NEVER pass passport data,
 *   payment card data, passwords, tokens, or opaque offer blobs.
 * - Server-safe: `track()` is a no-op (after validation + sanitization)
 *   when `window` is unavailable, so React Server Components and tests can
 *   call it without branching.
 * - Client dispatch pushes to `window.dataLayer` when present (GTM-ready)
 *   and keeps an in-memory log for debugging.
 */

export const ANALYTICS_EVENTS = [
  "homepage_cta_click",
  "package_viewed",
  "package_enquiry_submitted",
  "visa_country_viewed",
  "visa_application_started",
  "visa_payment_initiated",
  "visa_payment_completed",
  "support_click",
  "booking_confirmation_viewed",
  "flight_search_started",
  "flight_search_completed",
  "flight_selected",
  "price_changed",
  "flight_price_changed",
  "flight_checkout_started",
  "flight_payment_initiated",
  "flight_payment_completed",
  "flight_confirmation_viewed",
  "hotel_search",
  "hotel_viewed",
  "hotel_booking_started",
  "hotel_payment_initiated",
  "hotel_payment_completed",
  "hotel_confirmation_viewed",
  "blog_viewed",
  "blog_search",
] as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number]

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>

/** Keys matching this pattern are PII/payment material and never leave the device. */
const SENSITIVE_KEY_PATTERN =
  /passport|payment|card|token|secret|password|email|phone|auth|reference|order|flight_offer|opaque|blob|pnr|booking|amount|price|total/i

function isKnownEvent(event: string): event is AnalyticsEvent {
  return (ANALYTICS_EVENTS as readonly string[]).includes(event)
}

/**
 * Strip sensitive keys from analytics props. Values are passed through
 * untouched — callers must still avoid putting raw PII in *values*.
 */
export function sanitizeProps(props: AnalyticsProps = {}): AnalyticsProps {
  const clean: AnalyticsProps = {}
  for (const [key, value] of Object.entries(props)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue
    clean[key] = value
  }
  return clean
}

export interface TrackedEvent {
  event: AnalyticsEvent
  props: AnalyticsProps
}

/** In-memory log of dispatched events (debugging; never persisted). */
const eventLog: TrackedEvent[] = []

export function getEventLog(): readonly TrackedEvent[] {
  return eventLog
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}

/**
 * Record an allowlisted analytics event with sanitized props.
 * Throws on unknown event names; no-ops without `window` (SSR/tests).
 */
export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  if (!isKnownEvent(event)) {
    throw new Error(`Unknown analytics event: ${String(event)}`)
  }
  const clean = sanitizeProps(props)
  if (typeof window === "undefined") return
  eventLog.push({ event, props: clean })
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event, ...clean })
  }
}
