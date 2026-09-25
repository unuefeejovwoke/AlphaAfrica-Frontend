import test from "node:test"
import assert from "node:assert/strict"

// Ticket 07 — Support, mobile, accessibility, and analytics polish.
//
// Hotel conversion funnel without sensitive data: every event carries only
// coarse, non-personal props (counts, booleans, backend place facts). Names,
// emails, phones, references, and payment material must never reach the
// pipeline — the sanitizer drops those keys before dispatch.

import {
  ANALYTICS_EVENTS,
  sanitizeProps,
  track,
} from "../lib/analytics.ts"

test("Analytics allowlist covers the hotel funnel events", () => {
  for (const event of [
    "hotel_search",
    "hotel_viewed",
    "hotel_booking_started",
    "hotel_payment_initiated",
    "hotel_payment_completed",
    "hotel_confirmation_viewed",
  ]) {
    assert.ok(
      (ANALYTICS_EVENTS as readonly string[]).includes(event),
      `${event} must be an allowlisted analytics event`
    )
  }
})

test("Hotel analytics props carry no personal, reference, or payment data", () => {
  const clean = sanitizeProps({
    has_destination: true,
    has_dates: true,
    guests: 2,
    rooms: 1,
    city: "Lagos",
    stars: 5,
    nights: 3,
    currency: "NGN",
    type: "hotel",
    outcome: "confirmed",
    // Everything below must be stripped before dispatch.
    guest_email: "adaeze@example.com",
    guest_phone: "+2348031234567",
    reference: "HOTEL-ABC123",
    authorization_url: "https://paystack.test/pay/abc123",
    total_amount: "510000.00",
  })
  assert.equal(clean.guests, 2)
  assert.equal(clean.nights, 3)
  assert.equal(clean.city, "Lagos")
  assert.equal(clean.outcome, "confirmed")
  for (const key of Object.keys(clean)) {
    assert.doesNotMatch(
      key,
      /passport|payment|card|token|email|phone|auth|reference|order|amount/i,
      `Sensitive key must be stripped: ${key}`
    )
  }
})

test("track() accepts hotel events and still rejects unknown ones", () => {
  assert.doesNotThrow(() => track("hotel_search", { has_destination: true }))
  assert.throws(() => track("hotel_card_hovered" as never), /unknown.*event/i)
})
