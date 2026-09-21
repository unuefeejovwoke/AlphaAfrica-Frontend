/**
 * Privacy-safe analytics for the Alphaa Africa platform (Phase 2, PRD §22).
 *
 * - Events are an allowlist: `track()` throws on unknown names so a typo
 *   fails loudly in development instead of silently dropping data.
 * - Props are sanitized: any key resembling passport, payment, card, token,
 *   password, email, phone, or auth data is dropped before dispatch, so
 *   sensitive customer data can never reach the analytics pipeline.
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
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

/** Keys matching this pattern are PII/payment material and never leave the device. */
const SENSITIVE_KEY_PATTERN =
  /passport|payment|card|token|secret|password|email|phone|auth|reference|order/i;

function isKnownEvent(event: string): event is AnalyticsEvent {
  return (ANALYTICS_EVENTS as readonly string[]).includes(event);
}

/**
 * Strip sensitive keys from analytics props. Values are passed through
 * untouched — callers must still avoid putting raw PII in *values*.
 */
export function sanitizeProps(props: AnalyticsProps = {}): AnalyticsProps {
  const clean: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    clean[key] = value;
  }
  return clean;
}

export interface TrackedEvent {
  event: AnalyticsEvent;
  props: AnalyticsProps;
}

/** In-memory log of dispatched events (debugging; never persisted). */
const eventLog: TrackedEvent[] = [];

export function getEventLog(): readonly TrackedEvent[] {
  return eventLog;
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Record an allowlisted analytics event with sanitized props.
 * Throws on unknown event names; no-ops without `window` (SSR/tests).
 */
export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  if (!isKnownEvent(event)) {
    throw new Error(`Unknown analytics event: ${String(event)}`);
  }
  const clean = sanitizeProps(props);
  if (typeof window === "undefined") return;
  eventLog.push({ event, props: clean });
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event, ...clean });
  }
}
