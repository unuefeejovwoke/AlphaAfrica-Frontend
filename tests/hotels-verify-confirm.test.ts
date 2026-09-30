import test from "node:test"
import assert from "node:assert/strict"

// Ticket 06 — Verification with confirmation and recovery.
//
// Verification resolves the backend Hotel Booking status without ever
// assuming that a return from Paystack means success; only a verified
// `confirmed` status renders the premium confirmation, and every other
// outcome keeps the Payment Reference with reassurance copy.
//
// Vertical tracer slices: one failing test, then minimal implementation.

import {
  buildHotelConfirmationUrl,
  hotelBookingFromOrder,
  hotelBookingSchema,
  normalizeHotelBookingCreateResult,
  resolveHotelVerificationState,
} from "../lib/api/hotels.ts"

test("Verification states: confirmed, pending, cancelled, failed — unknown stays pending", () => {
  assert.equal(
    resolveHotelVerificationState({ status: "confirmed" }),
    "confirmed"
  )
  assert.equal(resolveHotelVerificationState({ status: "pending" }), "pending")
  assert.equal(
    resolveHotelVerificationState({ status: "cancelled" }),
    "cancelled"
  )
  assert.equal(resolveHotelVerificationState({ status: "failed" }), "failed")
  // A return from Paystack proves nothing: unrecognized states keep the
  // guest checking instead of assuming success or failure.
  assert.equal(resolveHotelVerificationState({ status: "weird" }), "pending")
  assert.equal(resolveHotelVerificationState({}), "pending")
  assert.equal(
    resolveHotelVerificationState({ status: " CONFIRMED " }),
    "confirmed"
  )
  // The universal order lookup reports money movement as success/paid;
  // those count as confirmed so an order-first flow never shows a paid
  // booking as "still processing".
  assert.equal(resolveHotelVerificationState({ status: "success" }), "confirmed")
  assert.equal(resolveHotelVerificationState({ status: "paid" }), "confirmed")
})

test("Verified Hotel Booking carries reference, stay, amounts, and payment state", () => {
  const parsed = hotelBookingSchema.safeParse({
    id: 3,
    reference: "HOTEL-ABC123",
    hotel_name: "Eko Hotels & Suites",
    room_type_name: "Deluxe King",
    guest_name: "Adaeze Okonkwo",
    guest_email: "adaeze@example.com",
    guest_phone: "+2348031234567",
    check_in: "2026-05-01",
    check_out: "2026-05-04",
    nights: 3,
    num_rooms: 2,
    num_guests: 3,
    price_per_night: "85000.00",
    total_amount: "510000.00",
    status: "confirmed",
    created_at: "2026-04-01T10:00:00Z",
  })
  assert.equal(parsed.success, true, "Full Hotel Booking must parse")
  if (!parsed.success) return
  assert.equal(parsed.data.reference, "HOTEL-ABC123")
  assert.equal(parsed.data.nights, 3)
  assert.equal(parsed.data.status, "confirmed")

  // Sparse rows still parse: only the reference is required and renderers
  // read the rest defensively.
  const sparse = hotelBookingSchema.safeParse({ reference: "HOTEL-XYZ" })
  assert.equal(sparse.success, true, "Reference-only rows must parse")
})

test("Confirmation URL carries only the Payment Reference — never PII", () => {
  const url = buildHotelConfirmationUrl("HOTEL-ABC123")
  assert.equal(url, "/hotels/confirmation?reference=HOTEL-ABC123")
  assert.ok(!url.includes("@"), "No email may travel in the URL")
  assert.ok(!url.toLowerCase().includes("token"), "No token in the URL")
  assert.ok(!url.toLowerCase().includes("phone"), "No phone in the URL")
})

test("Create result: flat shape and live { booking, payment } envelope both normalize", () => {
  // Flat shape (apidoc).
  assert.deepEqual(
    normalizeHotelBookingCreateResult({
      reference: "HOTEL-FLAT",
      authorization_url: "https://paystack.test/pay/flat",
    }),
    {
      reference: "HOTEL-FLAT",
      authorization_url: "https://paystack.test/pay/flat",
    }
  )
  // Live envelope (guide §5).
  assert.deepEqual(
    normalizeHotelBookingCreateResult({
      booking: { reference: "HOTEL-ENV", status: "pending" },
      payment: {
        reference: "HOTEL-ENV",
        authorization_url: "https://paystack.test/pay/env",
        access_code: "abc",
        amount: "510000.00",
      },
    }),
    {
      reference: "HOTEL-ENV",
      authorization_url: "https://paystack.test/pay/env",
    }
  )
  // Neither shape without both halves is usable — never redirect broken.
  assert.equal(
    normalizeHotelBookingCreateResult({ booking: { reference: "X" } }),
    null
  )
  assert.equal(normalizeHotelBookingCreateResult({}), null)
  assert.equal(normalizeHotelBookingCreateResult(null), null)
})

test("Order fallback: embedded order details build a renderable booking", () => {
  const booking = hotelBookingFromOrder("HOTEL-ABC123", {
    order: { hotel_name: "Eko Hotels", status: "confirmed", nights: 3 },
  })
  assert.ok(booking, "Embedded details must build a booking")
  assert.equal(booking?.reference, "HOTEL-ABC123")
  assert.equal(booking?.hotel_name, "Eko Hotels")
  // No embedded details: reference-only booking still renders safely.
  const sparse = hotelBookingFromOrder("HOTEL-XYZ", { order: null })
  assert.ok(sparse)
  assert.equal(sparse?.reference, "HOTEL-XYZ")
})
