import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Ticket 11 — One payment verification seam for every booking type.
//
// Pending, confirmed, failed and cancelled resolve the same way for Flights,
// Hotels, Vehicles and Visa Consultations, from one place, with one analytics
// contract. A Visa Consultation stops reporting a paid order as unpaid, and
// confirmation events stop firing twice on retry or back navigation.

import {
  clearSessionKeys,
  emitVerificationEventOnce,
  fetchOrderWithSettleRetry,
  hasEmittedVerificationEvent,
  isPaidOrder,
  isSettlingOrder,
  resetVerificationEmissions,
  resolveBookingOutcome,
  resolveVerificationOutcome,
  VERIFICATION_REQUEST,
  withSettleRetry,
  type BookingType,
  type VerificationOutcome,
} from "../lib/api/verification.ts"
import { getPaymentOrder } from "../lib/api/payments.ts"
import { verifyFlightBooking } from "../lib/api/flight-bookings.ts"
import { verifyHotelBooking } from "../lib/api/hotels.ts"
import { verifyCarBooking } from "../lib/api/cars.ts"
import { verifyVisaPayment } from "../lib/api/visa.ts"
import { getEventLog } from "../lib/analytics.ts"

const ROOT = join(import.meta.dirname, "..")
const readSource = (rel: string): string => readFileSync(join(ROOT, rel), "utf8")

function stubFetch(
  t: { after: (fn: () => void) => void },
  impl: (url: unknown, init?: RequestInit) => Promise<Response>
): void {
  const original = globalThis.fetch
  globalThis.fetch = impl as typeof fetch
  t.after(() => {
    globalThis.fetch = original
  })
}

function asBrowser(t: { after: (fn: () => void) => void }): void {
  const had = "window" in globalThis
  const prev = (globalThis as Record<string, unknown>).window
  ;(globalThis as Record<string, unknown>).window = {}
  t.after(() => {
    if (had) (globalThis as Record<string, unknown>).window = prev
    else delete (globalThis as Record<string, unknown>).window
  })
}

function asBrowserWindow(
  t: { after: (fn: () => void) => void },
  extra: Record<string, unknown> = {}
): { dataLayer: unknown[] } {
  const had = "window" in globalThis
  const prev = (globalThis as Record<string, unknown>).window
  const dataLayer: unknown[] = []
  ;(globalThis as Record<string, unknown>).window = {
    dataLayer,
    ...extra,
  }
  resetVerificationEmissions()
  t.after(() => {
    if (had) (globalThis as Record<string, unknown>).window = prev
    else delete (globalThis as Record<string, unknown>).window
    resetVerificationEmissions()
  })
  return { dataLayer }
}

function ok(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    Response.json(body, {
      status,
      headers: { "content-type": "application/json" },
    })
  )
}

// ---------------------------------------------------------------------------
// Status vocabulary: pending, confirmed, failed, cancelled — and unknown —
// resolve the same way for every booking type.
// ---------------------------------------------------------------------------

const BOOKING_TYPES: BookingType[] = ["flight", "hotel", "car", "visa"]

test("Seam vocabulary: pending, confirmed, failed, cancelled resolve identically per booking type", () => {
  for (const type of BOOKING_TYPES) {
    assert.equal(resolveBookingOutcome(type, "pending"), "pending", type)
    assert.equal(resolveBookingOutcome(type, "confirmed"), "confirmed", type)
    assert.equal(resolveBookingOutcome(type, "failed"), "failed", type)
    assert.equal(resolveBookingOutcome(type, "cancelled"), "cancelled", type)
  }
})

test("Seam vocabulary: unknown, missing, and padded states stay pending", () => {
  const unknowns: (string | null | undefined)[] = [
    "weird",
    "unknown-status",
    "",
    "   ",
    null,
    undefined,
  ]
  for (const type of BOOKING_TYPES) {
    for (const status of unknowns) {
      assert.equal(
        resolveBookingOutcome(type, status),
        "pending",
        `${type}:${String(status)}`
      )
    }
    // Case and padding never change the answer.
    assert.equal(resolveBookingOutcome(type, " CONFIRMED "), "confirmed", type)
    assert.equal(resolveBookingOutcome(type, "Paid"), "confirmed", type)
  }
})

test("Seam vocabulary: money-movement synonyms count as confirmed everywhere", () => {
  for (const type of BOOKING_TYPES) {
    for (const paid of ["paid", "success", "completed"]) {
      assert.equal(
        resolveBookingOutcome(type, paid),
        "confirmed",
        `${type}:${paid}`
      )
    }
  }
  // A specialist only contacts the customer after the consultation fee has
  // moved — `contacted` is terminal-proof for visa, unknown elsewhere.
  assert.equal(resolveBookingOutcome("visa", "contacted"), "confirmed")
  assert.equal(resolveBookingOutcome("flight", "contacted"), "pending")
  assert.equal(resolveBookingOutcome("hotel", "contacted"), "pending")
  assert.equal(resolveBookingOutcome("car", "contacted"), "pending")
})

test("Seam vocabulary: terminal payment states never read as pending", () => {
  for (const type of BOOKING_TYPES) {
    for (const failed of ["failed", "abandoned", "expired"]) {
      const outcome: VerificationOutcome = resolveBookingOutcome(type, failed)
      assert.equal(outcome, "failed", `${type}:${failed}`)
      assert.notEqual(outcome, "pending", `${type}:${failed} must not retry`)
    }
  }
})

test("Canonical resolver matches the per-type dispatcher without extras", () => {
  assert.equal(resolveVerificationOutcome("paid"), "confirmed")
  assert.equal(resolveVerificationOutcome("pending"), "pending")
  assert.equal(resolveVerificationOutcome("failed"), "failed")
  assert.equal(resolveVerificationOutcome("cancelled"), "cancelled")
  assert.equal(resolveVerificationOutcome("nope"), "pending")
  assert.equal(resolveVerificationOutcome("contacted", ["contacted"]), "confirmed")
  assert.equal(resolveVerificationOutcome("contacted"), "pending")
})

// ---------------------------------------------------------------------------
// Authoritative reads: `payment_status` wins, legacy `status` falls back.
// Regression cover for the visa defect — a paid order rendering as unpaid.
// ---------------------------------------------------------------------------

test("Authoritative read: guide payment_status wins over a stale legacy status", () => {
  // The visa defect shape: money moved, legacy field still says pending.
  assert.equal(
    isPaidOrder({ payment_status: "success", status: "pending" }),
    true,
    "paid order must never render as unpaid"
  )
  assert.equal(isPaidOrder({ payment_status: "paid" }), true)
  assert.equal(isPaidOrder({ status: "paid" }), true, "legacy fallback holds")
  assert.equal(isPaidOrder({ payment_status: "pending" }), false)
  assert.equal(isPaidOrder({ status: "pending" }), false)
  assert.equal(isPaidOrder(null), false)
  assert.equal(isPaidOrder(undefined), false)
})

test("Settling read: pending-but-unpaid retries, everything else does not", () => {
  assert.equal(isSettlingOrder({ payment_status: "pending" }), true)
  assert.equal(isSettlingOrder({ status: "processing" }), true)
  assert.equal(isSettlingOrder({ payment_status: "success" }), false)
  assert.equal(isSettlingOrder({ status: "failed" }), false)
  assert.equal(isSettlingOrder({ status: "abandoned" }), false)
  assert.equal(isSettlingOrder({ status: "expired" }), false)
  assert.equal(isSettlingOrder({ status: "cancelled" }), false)
  assert.equal(isSettlingOrder({ payment_status: "" }), true, "missing status keeps checking")
  assert.equal(isSettlingOrder(null), false)
  assert.equal(isSettlingOrder(undefined), false)
})

// ---------------------------------------------------------------------------
// Settle retry: one wait, one re-read, never polling.
// ---------------------------------------------------------------------------

test("Settle retry: paid and failed resolve without waiting", async () => {
  let reads = 0
  let waits = 0
  const read = async () => {
    reads += 1
    return "paid"
  }
  const result = await withSettleRetry(read, (v) => v === "pending", async () => {
    waits += 1
  })
  assert.equal(result, "paid")
  assert.equal(reads, 1)
  assert.equal(waits, 0)
})

test("Settle retry: pending waits once, then takes the settled result", async () => {
  let waits = 0
  const states = ["pending", "success"]
  const result = await withSettleRetry(
    async () => states.shift() ?? "success",
    (v) => v === "pending",
    async () => {
      waits += 1
    }
  )
  assert.equal(result, "success")
  assert.equal(waits, 1, "exactly one webhook wait, never polling")
})

test("Settle retry: a failed re-read keeps the first result", async () => {
  let calls = 0
  const result = await withSettleRetry(
    async () => {
      calls += 1
      if (calls > 1) throw new Error("transient backend error")
      return "pending"
    },
    (v) => v === "pending",
    async () => {}
  )
  assert.equal(result, "pending")
  assert.equal(calls, 2)
})

test("Settle retry: a failed first read propagates (callers decide fallback)", async () => {
  await assert.rejects(
    withSettleRetry(
      async () => {
        throw new Error("order lookup down")
      },
      () => true,
      async () => {}
    ),
    /order lookup down/
  )
})

// ---------------------------------------------------------------------------
// Read policy: verification reads are same-origin and never cached —
// asserted at the seam for the order lookup and every module verify call.
// ---------------------------------------------------------------------------

test("Read policy: the seam pins never-cached, same-origin requests", () => {
  assert.deepEqual({ ...VERIFICATION_REQUEST }, { noStore: true, sameOrigin: true })
})

test("Verification reads are never cached, for every booking type", async (t) => {
  asBrowser(t)
  const seen: { url: string; init?: RequestInit }[] = []
  stubFetch(t, (url, init) => {
    seen.push({ url: String(url), init })
    const target = String(url)
    if (target.includes("/api/visa/")) {
      return ok({
        id: 1,
        reference: "ALPHAA-V",
        country_name: "Kenya",
        full_name: "Ada Okafor",
        email: "ada@example.com",
        phone: "+2348012345678",
        consultation_fee: "5000.00",
        status: "pending",
        created_at: "2026-01-01T00:00:00Z",
      })
    }
    if (target.includes("/api/payments/order/")) {
      return ok({ reference: "ALPHAA-1", payment_status: "success" })
    }
    return ok({ reference: "ALPHAA-X", status: "pending" })
  })

  await getPaymentOrder("ALPHAA-1")
  await verifyFlightBooking("ALPHAA-F")
  await verifyHotelBooking("ALPHAA-H")
  await verifyCarBooking("ALPHAA-C")
  await verifyVisaPayment("ALPHAA-V")

  assert.equal(seen.length, 5)
  for (const { url, init } of seen) {
    assert.ok(url.startsWith("/"), `must be relative, got ${url}`)
    assert.ok(!url.includes("api.alphaaafrica.com"), `must not name the backend: ${url}`)
    assert.equal(init?.method, "GET")
    assert.equal(init?.cache, "no-store", `un-cached read required: ${url}`)
  }
})

test("Order fetch with settle retry: pending re-reads once, paid reads once", async (t) => {
  asBrowser(t)
  const calls: string[] = []
  stubFetch(t, (url) => {
    calls.push(String(url))
    // First read still settling, second read settled.
    if (calls.length === 1) return ok({ reference: "R1", payment_status: "pending" })
    return ok({ reference: "R1", payment_status: "success" })
  })
  const settled = await fetchOrderWithSettleRetry("R1", {}, async () => {})
  assert.equal(isPaidOrder(settled), true)
  assert.equal(calls.length, 2)

  stubFetch(t, () => ok({ reference: "R2", payment_status: "paid" }))
  const immediate = await fetchOrderWithSettleRetry("R2", {}, async () => {
    throw new Error("must not wait for a paid order")
  })
  assert.equal(isPaidOrder(immediate), true)
})

// ---------------------------------------------------------------------------
// Analytics: exactly once per state change — retries, remounts, and full
// reloads never double-fire.
// ---------------------------------------------------------------------------

test("Analytics emission: same state emits once across retry and remount", (t) => {
  const { dataLayer } = asBrowserWindow(t)
  const baseline = getEventLog().length
  const key = "ALPHAA-1::flight_payment_completed"

  assert.equal(
    emitVerificationEventOnce(key, "flight_payment_completed", { type: "flight" }),
    true
  )
  assert.equal(
    emitVerificationEventOnce(key, "flight_payment_completed", { type: "flight" }),
    false,
    "retry must not double-fire"
  )
  assert.equal(hasEmittedVerificationEvent(key), true)

  assert.equal(getEventLog().length - baseline, 1)
  assert.equal(dataLayer.length, 1, "one dataLayer push feeds every tag manager")
})

test("Analytics emission: a state change emits again under a new key", (t) => {
  asBrowserWindow(t)
  const baseline = getEventLog().length
  assert.equal(
    emitVerificationEventOnce("R::viewed:pending", "car_confirmation_viewed", {
      type: "pending",
    }),
    true
  )
  assert.equal(
    emitVerificationEventOnce("R::viewed:confirmed", "car_confirmation_viewed", {
      type: "confirmed",
    }),
    true,
    "pending→confirmed is a new state and must emit"
  )
  assert.equal(getEventLog().length - baseline, 2)
})

test("Analytics emission: unknown events throw before anything is marked", (t) => {
  asBrowserWindow(t)
  assert.throws(
    () =>
      emitVerificationEventOnce("R::nope", "not_a_real_event" as never, {}),
    /unknown.*event/i
  )
  assert.equal(hasEmittedVerificationEvent("R::nope"), false)
  assert.equal(
    emitVerificationEventOnce("R::nope", "hotel_payment_completed", { type: "hotel" }),
    true,
    "a typo must not suppress the real event"
  )
})

test("Analytics emission: sessionStorage survives a full reload", (t) => {
  const store = new Map<string, string>()
  asBrowserWindow(t, {
    sessionStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    },
  })
  assert.equal(
    emitVerificationEventOnce("R::completed", "visa_payment_completed", {}),
    true
  )
  // Simulate a full reload: module memory is fresh, storage persists.
  resetVerificationEmissions()
  assert.equal(hasEmittedVerificationEvent("R::completed"), true)
  assert.equal(
    emitVerificationEventOnce("R::completed", "visa_payment_completed", {}),
    false,
    "back navigation after reload must not double-fire"
  )
})

// ---------------------------------------------------------------------------
// Client delegation guards: every booking type's client goes through the
// seam — no re-implemented reads, retries, or analytics.
// ---------------------------------------------------------------------------

test("Flight confirmation records one page view per load", () => {
  const src = readSource("components/flights/flight-verify-client.tsx")
  const canonical = src.match(/"flight_confirmation_viewed"/g) ?? []
  const legacy = src.match(/"booking_confirmation_viewed"/g) ?? []
  assert.equal(canonical.length, 1, "exactly one confirmation-viewed event")
  assert.equal(legacy.length, 0, "the legacy duplicate page view is gone")
})

test("Car confirmation rechecks in place instead of reloading the page", () => {
  const src = readSource("components/cars/car-confirmation-client.tsx")
  assert.doesNotMatch(src, /window\.location\.reload/, "no full-page reload on retry")
  assert.match(src, /setAttempt/, "manual recheck re-runs verification in place")
})

test("Session clearing drops keys without a window and tolerates private mode", (t) => {
  // Server render: no window, no throw.
  assert.doesNotThrow(() => clearSessionKeys(["alphaa:test-key:v1"]))
  // Private-mode storage that throws on every call.
  asBrowserWindow(t, {
    sessionStorage: {
      getItem: () => {
        throw new Error("denied")
      },
      setItem: () => {
        throw new Error("denied")
      },
      removeItem: () => {
        throw new Error("denied")
      },
    },
  })
  assert.doesNotThrow(() => clearSessionKeys(["alphaa:test-key:v1"]))
  assert.equal(hasEmittedVerificationEvent("missing"), false)
})
