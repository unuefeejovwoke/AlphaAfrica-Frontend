import test from "node:test"
import assert from "node:assert/strict"

// Pay-later (`POST /api/flights/bookings/{reference}/pay/`) result seam.
//
// This is the crash-prevention boundary of the whole feature. Verified live:
// the endpoint answers an already-paid Booking with HTTP 200 carrying a
// human-readable `detail` and the full Booking, and NO authorization_url —
// not the 409 the integration guide documents. Because the status is 200 the
// request succeeds, so a client reading `authorization_url` unconditionally
// gets `undefined` and redirects to nothing. That is a hard crash on a path a
// Customer reaches by opening an old email twice, and typecheck cannot catch
// it. Hence a discriminated result with three branches, each tested below.

import {
  fetchFlightTickets,
  normalizeFlightPayResult,
  payFlightBooking,
} from "../lib/api/flight-bookings.ts"

/** A Reservation that is still payable: the create call's own checkout link. */
const CHECKOUT_RESPONSE = {
  reference: "ALPHAA-TEST",
  authorization_url: "https://checkout.paystack.com/test",
  amount: "705165.30",
  currency: "NGN",
  ticketing_deadline: "2026-09-05",
  booking: {
    reference: "ALPHAA-TEST",
    status: "reserved",
    pnr: "7OO6W2",
    ticketing_deadline: "2026-09-05",
    total_amount: "705165.30",
    currency: "NGN",
  },
}

/**
 * What the live API returns for an already-paid Booking. HTTP 200, a
 * `detail`, the full Booking, and no authorization_url anywhere.
 */
const ALREADY_PAID_RESPONSE = {
  detail: "This booking has already been paid.",
  reference: "ALPHAA-TEST",
  booking: {
    reference: "ALPHAA-TEST",
    status: "confirmed",
    pnr: "7OO6W2",
    ticketing_deadline: "2026-09-05",
    ticket_numbers: ["0742401234567"],
    total_amount: "705165.30",
    currency: "NGN",
  },
}

test("Pay-later: a checkout link yields the checkout branch", () => {
  const result = normalizeFlightPayResult(CHECKOUT_RESPONSE)
  assert.equal(result?.kind, "checkout")
  if (result?.kind !== "checkout") return
  assert.equal(result.authorization_url, CHECKOUT_RESPONSE.authorization_url)
  assert.equal(result.reference, "ALPHAA-TEST")
  assert.equal(result.ticketing_deadline, "2026-09-05")
  // The payable page shows the Booking before any redirect — route, amount,
  // and pay-by date come from what is actually held.
  assert.equal(result.booking?.reference, "ALPHAA-TEST")
  assert.equal(result.booking?.pnr, "7OO6W2")
})

test("Pay-later: a 200 already-paid response yields the terminal branch with the Booking", () => {
  // This is the branch that exists because the endpoint answers 200, not 409.
  // Reading authorization_url unconditionally here is the crash.
  const result = normalizeFlightPayResult(ALREADY_PAID_RESPONSE)
  assert.equal(result?.kind, "already_paid")
  if (result?.kind !== "already_paid") return
  assert.equal(
    result.message,
    "This booking has already been paid.",
    "The backend's own message is the honest source of the customer's copy"
  )
  assert.equal(result.booking.reference, "ALPHAA-TEST")
  assert.equal(result.booking.status, "confirmed")
  assert.equal(result.booking.pnr, "7OO6W2")
  assert.deepEqual(result.booking.ticket_numbers, ["0742401234567"])
  assert.equal(
    "authorization_url" in result,
    false,
    "The terminal branch must carry no checkout link — it is never chargeable"
  )
})

test("Pay-later: a response with neither a checkout link nor a Booking yields neither branch", () => {
  // Neither branch is a failure state the caller renders honestly. Crucially
  // this is never a redirect target — returning the raw response would let a
  // caller read a missing authorization_url and crash.
  for (const raw of [{}, { detail: "Not available." }, { booking: {} }, null, "nope"]) {
    const result = normalizeFlightPayResult(raw)
    assert.equal(result, null, `Expected no branch for ${JSON.stringify(raw)}`)
  }
})

test("Pay-later: the two branches are unambiguously distinguishable", () => {
  // A checkout response ALWAYS has a link; an already-paid response NEVER
  // does. That invariant is what lets a caller branch without ambiguity.
  const checkout = normalizeFlightPayResult(CHECKOUT_RESPONSE)
  const alreadyPaid = normalizeFlightPayResult(ALREADY_PAID_RESPONSE)
  assert.equal(checkout?.kind, "checkout")
  assert.equal(alreadyPaid?.kind, "already_paid")
  assert.notEqual(checkout?.kind, alreadyPaid?.kind)
})

test("Pay-later: a checkout link is read from the payment block too", () => {
  // The create response nests its checkout under `payment`; be tolerant of
  // either nesting so a shape change upstream cannot silently drop the link.
  const nested = normalizeFlightPayResult({
    reference: "ALPHAA-TEST",
    payment: { authorization_url: "https://checkout.paystack.com/nested" },
  })
  assert.equal(nested?.kind, "checkout")
  if (nested?.kind !== "checkout") return
  assert.equal(nested.authorization_url, "https://checkout.paystack.com/nested")
  assert.equal(
    nested.booking,
    null,
    "No booking was carried, so none is invented — the page falls back to the pay-by date alone"
  )
})

test("Pay-later: an already-paid response without a parseable Booking still resolves", () => {
  // The status is the terminal fact; the Booking is for rendering. Never let a
  // thin payload turn an already-paid Booking into a crash or a retry loop.
  const result = normalizeFlightPayResult({
    detail: "This booking has already been paid.",
    reference: "ALPHAA-TEST",
  })
  assert.equal(result?.kind, "already_paid")
  if (result?.kind !== "already_paid") return
  assert.equal(result.booking.reference, "ALPHAA-TEST")
})

// ---------------------------------------------------------------------------
// Analytics — one reservation event, coarse props only (ticket 08)
// ---------------------------------------------------------------------------

test("Analytics: creating a reservation emits one allowlisted event", async (t) => {
  const { ANALYTICS_EVENTS, sanitizeProps, track } = await import(
    "../lib/analytics.ts"
  )
  assert.ok(
    (ANALYTICS_EVENTS as readonly string[]).includes(
      "flight_reservation_created"
    ),
    "The reservation event must be allowlisted or track() throws loudly"
  )
  // Coarse, non-identifying counts survive; everything identifying is dropped
  // by the existing guard, which is respected rather than widened.
  const clean = sanitizeProps({
    travellers: "2",
    is_international: "true",
    reference: "ALPHAA-TEST",
    pnr: "7OO6W2",
    total_amount: "705165.30",
    email: "ada@example.com",
  })
  assert.equal(clean.travellers, "2")
  assert.equal(clean.is_international, "true")
  for (const key of Object.keys(clean)) {
    assert.doesNotMatch(
      key,
      /passport|payment|card|token|email|phone|auth|reference|order|amount|price|total|pnr|booking/i,
      `Sensitive key must be stripped: ${key}`
    )
  }
  assert.doesNotThrow(() =>
    track("flight_reservation_created", {
      travellers: "2",
      is_international: "true",
    })
  )
  assert.throws(() => track("flight_reservation_creatd" as never))
})

test("Pay-later: an already-paid response with a message but no reference is not payable", () => {
  // No reference and no link means we cannot act on this at all. Reporting
  // "already paid" without knowing which Booking would be a guess.
  const result = normalizeFlightPayResult({ detail: "Already paid." })
  assert.equal(result, null)
})

// ---------------------------------------------------------------------------
// Request shape, at the backend boundary seam (stubbed fetch)
// ---------------------------------------------------------------------------

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
  ;(globalThis as Record<string, unknown>).window = {}
  t.after(() => {
    delete (globalThis as Record<string, unknown>).window
  })
}

function ok(body: unknown): Promise<Response> {
  return Promise.resolve(
    Response.json(body, { status: 200, headers: { "content-type": "application/json" } })
  )
}

test("Pay-later: the guest token travels in the body AND the query, same-origin POST", async (t) => {
  asBrowser(t)
  const seen: { url: string; init?: RequestInit }[] = []
  stubFetch(t, (url, init) => {
    seen.push({ url: String(url), init })
    return ok(CHECKOUT_RESPONSE)
  })

  await payFlightBooking({ reference: "ALPHAA-TEST", token: "secure-token-123" })

  assert.equal(seen.length, 1)
  const call = seen[0]
  assert.equal(call.init?.method, "POST")
  assert.match(
    call.url,
    /^\/api\/flights\/bookings\/ALPHAA-TEST\/pay(\?|$)/,
    "Same-origin path mirrors the existing booking proxy, which Next matches without a redirect"
  )
  assert.equal(
    call.url.includes("api.alphaaafrica.com"),
    false,
    "Browser calls stay same-origin through the proxy — no CORS"
  )
  assert.match(
    call.url,
    /token=secure-token-123/,
    "The API accepts the guest token as a query parameter"
  )
  assert.deepEqual(JSON.parse(String(call.init?.body)), { token: "secure-token-123" })

  // A signed-in user has no guest token; nothing blank may be appended.
  seen.length = 0
  await payFlightBooking({ reference: "ALPHAA-TEST" })
  assert.equal(seen[0].url.includes("token"), false)
  assert.deepEqual(JSON.parse(String(seen[0].init?.body)), {})
})

test("Pay-later: a neither-branch response throws rather than yielding a redirect target", async (t) => {
  asBrowser(t)
  stubFetch(t, () => ok({}))
  // 200 with nothing usable must NOT resolve to a checkout the caller can
  // redirect to — the honest failure is an error the caller renders.
  await assert.rejects(() =>
    payFlightBooking({ reference: "ALPHAA-TEST", token: "t" })
  )
})

// ---------------------------------------------------------------------------
// E-ticket numbers — fetched once, never polled
// ---------------------------------------------------------------------------

test("E-ticket: issued numbers parse into a list", async (t) => {
  asBrowser(t)
  stubFetch(t, () =>
    ok({
      reference: "ALPHAA-TEST",
      pnr: "9IVDV9",
      ticketed: true,
      ticket_numbers: ["0742401234567"],
      booking: { reference: "ALPHAA-TEST", status: "confirmed" },
    })
  )

  const tickets = await fetchFlightTickets({ reference: "ALPHAA-TEST" })
  assert.equal(tickets.ticketed, true)
  assert.deepEqual(tickets.ticket_numbers, ["0742401234567"])
  assert.equal(tickets.booking?.status, "confirmed")
})

test("E-ticket: not-yet-issued is explicitly not ticketed, not a parse failure", async (t) => {
  asBrowser(t)
  stubFetch(t, () =>
    ok({ reference: "ALPHAA-TEST", ticketed: false, ticket_numbers: [] })
  )

  // This is the live response for a confirmed, paid, not-yet-ticketed
  // Booking. It must read as "being issued" — a Customer shown an error for a
  // ticket that is merely still processing would be alarmed for no reason.
  const tickets = await fetchFlightTickets({ reference: "ALPHAA-TEST" })
  assert.equal(tickets.ticketed, false)
  assert.deepEqual(tickets.ticket_numbers, [])
})

test("E-ticket: a malformed response throws, so a failure is never read as 'not issued'", async (t) => {
  asBrowser(t)
  stubFetch(t, () => ok({ reference: "ALPHAA-TEST" }))
  // No `ticketed` field at all is a broken response, not "still processing".
  // Swallowing it would tell a Customer with a real problem that we are
  // merely waiting for their ticket.
  await assert.rejects(() => fetchFlightTickets({ reference: "ALPHAA-TEST" }))
})