import test from "node:test"
import assert from "node:assert/strict"
import {
  DOMESTIC_OFFER_TTL_MS,
  isConfirmedOfferStale,
  isOfferExpiredError,
  resolvePriceConfirmation,
} from "../lib/api/flights.ts"
import { ApiError } from "../lib/api/client.ts"

// ---------------------------------------------------------------------------
// Seam: price-confirmation machine (Phase 3, ticket 05 — spec stories 12–15).
// input = { selected_offer, revalidated_offer } → same | changed | expired.
// Pure function, not React. ONE test, THREE branch cases, independent literals.
// ---------------------------------------------------------------------------

test("Price confirmation machine: same fare, changed fare, and expired offer branches", () => {
  // Branch 1 — same: revalidated total equals the selected total.
  // Numeric equality, so "450000" and "450000.00" are the same fare.
  const same = resolvePriceConfirmation({
    selected_offer: {
      id: "offer-1",
      total_amount: "450000.00",
      currency: "NGN",
    },
    revalidated_offer: {
      id: "offer-1",
      total_amount: "450000",
      currency: "NGN",
    },
  })
  assert.equal(same.status, "same", "Equal totals must resolve to same")
  if (same.status === "same") {
    assert.equal(
      same.total,
      "450000.00",
      "Same branch must carry the confirmed total"
    )
    assert.equal(same.currency, "NGN", "Currency stays NGN in v1")
  } else {
    assert.fail("Expected same branch")
  }

  // Branch 2 — changed: airline updated the fare; carry previous, new, difference.
  const changed = resolvePriceConfirmation({
    selected_offer: {
      id: "offer-2",
      total_amount: "450000.00",
      currency: "NGN",
    },
    revalidated_offer: {
      id: "offer-2",
      total_amount: "475000.00",
      currency: "NGN",
    },
  })
  assert.equal(
    changed.status,
    "changed",
    "Different totals must resolve to changed"
  )
  if (changed.status === "changed") {
    assert.equal(
      changed.previousTotal,
      "450000.00",
      "Changed branch must carry the previous amount"
    )
    assert.equal(
      changed.newTotal,
      "475000.00",
      "Changed branch must carry the new amount"
    )
    assert.equal(
      changed.difference,
      "25000.00",
      "Changed branch must carry the absolute difference"
    )
    assert.equal(changed.increased, true, "Upward move must flag increased")
    assert.equal(changed.currency, "NGN", "Currency stays NGN in v1")
  } else {
    assert.fail("Expected changed branch")
  }

  // Branch 3 — expired: no revalidated offer (or no selected offer) never books.
  const expired = resolvePriceConfirmation({
    selected_offer: {
      id: "offer-3",
      total_amount: "450000.00",
      currency: "NGN",
    },
    revalidated_offer: null,
  })
  assert.equal(
    expired.status,
    "expired",
    "Missing revalidated offer must resolve to expired"
  )

  const noSelection = resolvePriceConfirmation({
    selected_offer: null,
    revalidated_offer: {
      id: "offer-3",
      total_amount: "450000.00",
      currency: "NGN",
    },
  })
  assert.equal(
    noSelection.status,
    "expired",
    "Missing selected offer must also resolve to expired"
  )
})

test("Offer expiry: QuickAir 502 reserve failures map to expired, generic 502 stays retryable", () => {
  assert.equal(
    isOfferExpiredError(
      new ApiError("Could not reserve the flight", { status: 502 })
    ),
    true,
    "Guide 502 reserve copy must route to re-search, never blind retry"
  )
  assert.equal(
    isOfferExpiredError(
      new ApiError("Upstream error", { status: 502, code: "server" })
    ),
    false,
    "Generic 502 without expiry copy stays retryable"
  )
  assert.equal(
    isOfferExpiredError(new ApiError("Gone", { status: 410 })),
    true,
    "410 stays expired"
  )
  assert.equal(
    isOfferExpiredError(new Error("boom")),
    false,
    "Non-API errors are never expiry"
  )
})

test("Domestic offer freshness: aged offers must re-search, fresh/unknown stay bookable", () => {
  const now = Date.now()
  assert.equal(
    isConfirmedOfferStale(now - DOMESTIC_OFFER_TTL_MS - 1, now),
    true,
    "Offers past the TTL must re-search"
  )
  assert.equal(
    isConfirmedOfferStale(now - 60_000, now),
    false,
    "Minute-old offers stay bookable"
  )
  assert.equal(
    isConfirmedOfferStale(null, now),
    false,
    "Pre-sidecar sessions never hard-block — the 502 path still guards them"
  )
})
