import { test } from "node:test"
import assert from "node:assert/strict"
import {
  flightBookingSchema,
  resolveFlightVerificationState,
} from "../lib/api/flight-bookings.ts"

test("Flight verification: booking status resolves to paid, pending, failed, or cancelled", () => {
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
})
