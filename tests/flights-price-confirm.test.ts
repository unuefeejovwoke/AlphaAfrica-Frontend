import test from "node:test";
import assert from "node:assert/strict";
import { resolvePriceConfirmation } from "../lib/api/flights.ts";

// ---------------------------------------------------------------------------
// Seam: price-confirmation machine (Phase 3, ticket 05 — spec stories 12–15).
// input = { selected_offer, revalidated_offer } → same | changed | expired.
// Pure function, not React. ONE test, THREE branch cases, independent literals.
// ---------------------------------------------------------------------------

test("Price confirmation machine: same fare, changed fare, and expired offer branches", () => {
  // Branch 1 — same: revalidated total equals the selected total.
  // Numeric equality, so "450000" and "450000.00" are the same fare.
  const same = resolvePriceConfirmation({
    selected_offer: { id: "offer-1", total_amount: "450000.00", currency: "NGN" },
    revalidated_offer: { id: "offer-1", total_amount: "450000", currency: "NGN" },
  });
  assert.equal(same.status, "same", "Equal totals must resolve to same");
  if (same.status === "same") {
    assert.equal(same.total, "450000.00", "Same branch must carry the confirmed total");
    assert.equal(same.currency, "NGN", "Currency stays NGN in v1");
  } else {
    assert.fail("Expected same branch");
  }

  // Branch 2 — changed: airline updated the fare; carry previous, new, difference.
  const changed = resolvePriceConfirmation({
    selected_offer: { id: "offer-2", total_amount: "450000.00", currency: "NGN" },
    revalidated_offer: { id: "offer-2", total_amount: "475000.00", currency: "NGN" },
  });
  assert.equal(changed.status, "changed", "Different totals must resolve to changed");
  if (changed.status === "changed") {
    assert.equal(changed.previousTotal, "450000.00", "Changed branch must carry the previous amount");
    assert.equal(changed.newTotal, "475000.00", "Changed branch must carry the new amount");
    assert.equal(changed.difference, "25000.00", "Changed branch must carry the absolute difference");
    assert.equal(changed.increased, true, "Upward move must flag increased");
    assert.equal(changed.currency, "NGN", "Currency stays NGN in v1");
  } else {
    assert.fail("Expected changed branch");
  }

  // Branch 3 — expired: no revalidated offer (or no selected offer) never books.
  const expired = resolvePriceConfirmation({
    selected_offer: { id: "offer-3", total_amount: "450000.00", currency: "NGN" },
    revalidated_offer: null,
  });
  assert.equal(expired.status, "expired", "Missing revalidated offer must resolve to expired");

  const noSelection = resolvePriceConfirmation({
    selected_offer: null,
    revalidated_offer: { id: "offer-3", total_amount: "450000.00", currency: "NGN" },
  });
  assert.equal(noSelection.status, "expired", "Missing selected offer must also resolve to expired");
});
