import {
  getPaymentOrder,
  isOrderPaid,
  isOrderPending,
  resolveOrderPaymentStatus,
  type GetPaymentOrderOptions,
  type PaymentOrder,
} from "./payments.ts"
import { track, type AnalyticsEvent, type AnalyticsProps } from "../analytics.ts"

/**
 * One payment verification seam for every booking type (Flights, Hotels,
 * Vehicles, Visa Consultations).
 *
 * This module owns four things, and every verify client delegates instead of
 * re-implementing:
 * - the status vocabulary (`VerificationOutcome` + resolvers),
 * - the read policy (never cached, same-origin),
 * - the settle retry (one ~2s wait for the webhook, never polling),
 * - analytics emission (exactly once per state change).
 *
 * The backend stays authoritative for all totals; payment behaviour, pricing,
 * and the Paystack redirect are untouched. A return from Paystack proves
 * nothing by itself — callers must verify before rendering any outcome.
 */

export type VerificationOutcome = "pending" | "confirmed" | "failed" | "cancelled"

export type BookingType = "flight" | "hotel" | "car" | "visa"

/** Money-movement synonyms the backend uses for a completed payment. */
const PAID_STATUSES = new Set(["paid", "confirmed", "success", "completed"])

/** Terminal payment states that will never settle — never retried. */
const FAILED_STATUSES = new Set(["failed", "abandoned", "expired"])

/** Still-settling states where one webhook wait is worthwhile. */
const PENDING_STATUSES = new Set(["pending", "processing", "initialized"])

/**
 * Canonical status mapping. `payment_status` synonyms (`paid`, `success`,
 * `completed`) and module `confirmed` all mean the money moved. Terminal
 * `failed`/`cancelled` (plus `abandoned`/`expired`, which settle never)
 * render the not-completed branch immediately. Anything else — including
 * `pending`, `processing`, and unrecognized or missing states — stays
 * pending so the customer keeps checking instead of assuming failure and
 * paying twice. `extraPaid` covers per-type terminal-proof states (visa
 * `contacted`: a specialist only contacts after the fee has moved).
 */
export function resolveVerificationOutcome(
  status: string | null | undefined,
  extraPaid: readonly string[] = []
): VerificationOutcome {
  const normalized = (status ?? "").trim().toLowerCase()
  if (PAID_STATUSES.has(normalized)) return "confirmed"
  if (extraPaid.includes(normalized)) return "confirmed"
  if (normalized === "cancelled") return "cancelled"
  if (FAILED_STATUSES.has(normalized)) return "failed"
  if (normalized !== "" && !PENDING_STATUSES.has(normalized)) return "pending"
  return "pending"
}

/** Visa-only paid synonyms (terminal-proof consultation states). */
const VISA_EXTRA_PAID = ["contacted"] as const

/**
 * Resolve a module booking status through the shared vocabulary. Every
 * booking type answers pending/confirmed/failed/cancelled the same way;
 * unknown states resolve conservatively to pending.
 */
export function resolveBookingOutcome(
  type: BookingType,
  status: string | null | undefined
): VerificationOutcome {
  return resolveVerificationOutcome(
    status,
    type === "visa" ? VISA_EXTRA_PAID : []
  )
}

// ---------------------------------------------------------------------------
// Read policy: verification reads are live and same-origin, never cached.
// A cached "pending" snapshot must never mask a completed payment.
// Every module verify function spreads this into its request options.
// ---------------------------------------------------------------------------

export const VERIFICATION_REQUEST = {
  noStore: true,
  sameOrigin: true,
} as const

// ---------------------------------------------------------------------------
// Authoritative payment-state reads. The universal order's `payment_status`
// is the final word on money movement; the legacy `status` field is only a
// fallback. Never read `order.status` directly — a stale legacy field can
// render a paid order as unpaid.
// ---------------------------------------------------------------------------

type OrderStatusFields = {
  payment_status?: string | null
  status?: string | null
}

export function isPaidOrder(
  order: OrderStatusFields | null | undefined
): boolean {
  if (!order) return false
  return isOrderPaid(resolveOrderPaymentStatus(order))
}

/** Pending-but-unpaid: the webhook may not have run — one retry is worthwhile. */
export function isSettlingOrder(
  order: OrderStatusFields | null | undefined
): boolean {
  if (!order) return false
  return isOrderPending(resolveOrderPaymentStatus(order))
}

/** Raw-status variant for callers that already resolved the status string. */
export function shouldSettleRetry(
  status: string | null | undefined
): boolean {
  return isOrderPending(status) && !isOrderPaid(status)
}

// ---------------------------------------------------------------------------
// Settle retry: wait ~2s for the webhook, retry ONCE, never poll. Terminal
// states skip the wait entirely — the payment will never settle.
// ---------------------------------------------------------------------------

export const SETTLE_RETRY_WAIT_MS = 2000

export function waitForSettlement(
  ms: number = SETTLE_RETRY_WAIT_MS
): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Run `read`; when `shouldRetry` holds for the first result, wait once and
 * re-read. A failed retry keeps the first result — the module verify call
 * below still gets its chance. `wait` is injectable so tests never sleep.
 */
export async function withSettleRetry<T>(
  read: () => Promise<T>,
  shouldRetry: (value: T) => boolean,
  wait: () => Promise<void> = () => waitForSettlement()
): Promise<T> {
  const first = await read()
  if (!shouldRetry(first)) return first
  await wait()
  try {
    return await read()
  } catch {
    return first
  }
}

/**
 * Fetch the universal order with the shared settle retry. Throws like
 * {@link getPaymentOrder} when the first read fails — callers that tolerate
 * an absent order (falling back to the module verify call) keep their own
 * try/catch, exactly as before.
 */
export async function fetchOrderWithSettleRetry(
  reference: string,
  options: GetPaymentOrderOptions = {},
  wait: () => Promise<void> = () => waitForSettlement()
): Promise<PaymentOrder> {
  return withSettleRetry(
    () => getPaymentOrder(reference, options),
    (order) => isSettlingOrder(order),
    wait
  )
}

// ---------------------------------------------------------------------------
// Analytics: confirmation events fire exactly once per state change. The key
// must include the reference AND the outcome, so a pending→confirmed
// transition on retry emits the new state while a repeat of the same state
// (retry button, back navigation, remount) stays silent. Keys persist in
// sessionStorage so a full reload cannot double-fire either; the in-memory
// set covers private mode where storage throws.
//
// One `track()` call pushes once to `window.dataLayer`, which every
// configured tag manager (GTM and/or GA) consumes — never push per manager,
// and never render two page-view trackers for one confirmation.
// ---------------------------------------------------------------------------

const EMITTED_STORAGE_PREFIX = "alphaa:verification-event:v1:"

const emittedMemory = new Set<string>()

export function verificationEventKey(
  reference: string,
  suffix: string
): string {
  return `${reference}::${suffix}`
}

function readStorageFlag(key: string): boolean {
  try {
    if (typeof window === "undefined") return false
    return window.sessionStorage.getItem(EMITTED_STORAGE_PREFIX + key) === "1"
  } catch {
    return false
  }
}

function writeStorageFlag(key: string): void {
  try {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(EMITTED_STORAGE_PREFIX + key, "1")
  } catch {
    // Private mode — the in-memory set below still dedupes this mount.
  }
}

export function hasEmittedVerificationEvent(key: string): boolean {
  if (emittedMemory.has(key)) return true
  if (readStorageFlag(key)) {
    emittedMemory.add(key)
    return true
  }
  return false
}

/**
 * Track an allowlisted analytics event unless this state already emitted.
 * Returns true only when the event actually fired. Unknown event names throw
 * (via `track`) before anything is marked, so a typo fails loudly instead of
 * silently suppressing the real event.
 */
export function emitVerificationEventOnce(
  key: string,
  event: AnalyticsEvent,
  props: AnalyticsProps = {}
): boolean {
  if (hasEmittedVerificationEvent(key)) return false
  track(event, props)
  emittedMemory.add(key)
  writeStorageFlag(key)
  return true
}

/** Test seam: drop in-memory emission state between assertions. */
export function resetVerificationEmissions(): void {
  emittedMemory.clear()
}

// ---------------------------------------------------------------------------
// Session clearing: a successful verification drops the stored Payment
// Reference (and its pending-booking record) so back/forward can never
// re-enter checkout with a completed trip. SSR-safe; each domain module
// exposes its own typed clearer built on this helper.
// ---------------------------------------------------------------------------

export function clearSessionKeys(keys: readonly string[]): void {
  if (typeof window === "undefined") return
  for (const key of keys) {
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      // Private mode — nothing stored, nothing to clear.
    }
  }
}
