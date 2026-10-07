import { test } from "node:test"
import assert from "node:assert/strict"
import {
  flightBookingSchema,
  resolveFlightVerificationState,
} from "../lib/api/flight-bookings.ts"

test("Flight verification: booking status resolves to paid, reserved, pending, failed, or cancelled", () => {
  assert.equal(resolveFlightVerificationState({ status: "paid" }), "paid")
  assert.equal(resolveFlightVerificationState({ status: "pending" }), "pending")
  assert.equal(resolveFlightVerificationState({ status: "failed" }), "failed")
  assert.equal(
    resolveFlightVerificationState({ status: "cancelled" }),
    "cancelled"
  )
  // Documented branches: `confirmed` means the airline order exists, and
  // anything unrecognized stays pending so the customer keeps checking.
  assert.equal(resolveFlightVerificationState({ status: "confirmed" }), "paid")
  assert.equal(
    resolveFlightVerificationState({ status: "unknown-status" }),
    "pending"
  )
  assert.equal(resolveFlightVerificationState({}), "pending")
})

test("Flight verification: a reservation is its own outcome, never pending or paid", () => {
  // A Reservation is a deliberate hold the Customer chose; `pending` is the
  // warning copy for a payment that may not have completed. Collapsing one
  // into the other either alarms a Customer about a fine state or renders an
  // unpaid Booking as settled (ADR-0007).
  for (const status of ["reserved", "RESERVED", " reserved "]) {
    assert.equal(resolveFlightVerificationState({ status }), "reserved")
  }
  assert.notEqual(
    resolveFlightVerificationState({ status: "reserved" }),
    "pending"
  )
  assert.notEqual(resolveFlightVerificationState({ status: "reserved" }), "paid")
})

test("Flight booking payload accepts structured travelers and flight details", () => {
  // The live API returns structured JSON for both fields even though the
  // apidoc types them as strings — accepting strings here would fail every
  // verification that reached the backend.
  const parsed = flightBookingSchema.parse({
    reference: "ALPHAA-TEST",
    status: "pending",
    pnr: "",
    num_adults: 1,
    total_amount: "758338.35",
    currency: "NGN",
    flight_details: { airline_code: "ET", itineraries: [] },
    travelers: [{ first_name: "TORI", last_name: "DEV", type: "ADULT" }],
  })

  assert.equal(parsed.reference, "ALPHAA-TEST")
  assert.deepEqual(parsed.travelers, [
    { first_name: "TORI", last_name: "DEV", type: "ADULT" },
  ])
  assert.deepEqual(parsed.flight_details, {
    airline_code: "ET",
    itineraries: [],
  })
  assert.equal(
    parsed.pnr,
    "",
    "An empty PNR string is a real value, not a missing one"
  )
  assert.equal(parsed.ticketing_deadline, null)
  assert.equal(parsed.ticket_numbers, null)
})

test("Flight booking payload keeps the reservation and ticketing fields", () => {
  // The live API returns ticketing_deadline and ticket_numbers on the booking
  // and we were dropping both. A confirmed booking whose e-ticket is not yet
  // issued carries a null ticket_numbers, which is a different state from a
  // parse failure — the document must say "being issued", not "error".
  const confirmed = flightBookingSchema.parse({
    reference: "ALPHAA-TEST",
    status: "confirmed",
    pnr: "7OO6W2",
    amadeus_order_id: "eJzTd9c39_c3CzcCAArEAjo",
    ticketing_deadline: "2026-09-05",
    ticket_numbers: null,
    total_amount: "705165.30",
    currency: "NGN",
  })
  assert.equal(confirmed.pnr, "7OO6W2")
  assert.equal(confirmed.amadeus_order_id, "eJzTd9c39_c3CzcCAArEAjo")
  assert.equal(confirmed.ticketing_deadline, "2026-09-05")
  assert.equal(confirmed.ticket_numbers, null)

  const ticketed = flightBookingSchema.parse({
    reference: "ALPHAA-TEST",
    status: "confirmed",
    ticket_numbers: ["0742401234567"],
  })
  assert.deepEqual(ticketed.ticket_numbers, ["0742401234567"])
})
