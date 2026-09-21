import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveFlightVerificationState } from "../lib/api/flight-bookings.ts";

test("Flight verification: booking status resolves to paid, pending, failed, or cancelled", () => {
  assert.equal(resolveFlightVerificationState({ status: "paid" }), "paid");
  assert.equal(resolveFlightVerificationState({ status: "pending" }), "pending");
  assert.equal(resolveFlightVerificationState({ status: "failed" }), "failed");
  assert.equal(resolveFlightVerificationState({ status: "cancelled" }), "cancelled");
  // Documented branches: `confirmed` means the airline order exists, and
  // anything unrecognized stays pending so the customer keeps checking.
  assert.equal(resolveFlightVerificationState({ status: "confirmed" }), "paid");
  assert.equal(resolveFlightVerificationState({ status: "unknown-status" }), "pending");
  assert.equal(resolveFlightVerificationState({}), "pending");
});
