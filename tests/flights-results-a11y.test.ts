import test from "node:test"
import assert from "node:assert/strict"
import {
  describeSortSelection,
  isFilterPressed,
  isSortPressed,
  SORT_LABELS,
} from "../lib/api/flight-filters.ts"
import {
  describePriceOutcome,
  resolvePriceConfirmation,
} from "../lib/api/flights.ts"

/**
 * Flights results accessibility seam (ticket 18): the interactive decisions
 * — what selected state a control is in, what the live region announces —
 * live in pure functions. Nothing is rendered here.
 */

test("Sort pills expose pressed state per key", () => {
  assert.equal(isSortPressed("cheapest", "cheapest"), true)
  assert.equal(isSortPressed("cheapest", "fastest"), false)
  assert.equal(isSortPressed("recommended", "recommended"), true)
  assert.equal(isSortPressed("recommended", "cheapest"), false)
})

test("Sort labels cover every sort key", () => {
  assert.deepEqual(Object.keys(SORT_LABELS).sort(), [
    "cheapest",
    "earliest",
    "fastest",
    "recommended",
  ])
})

test("Active sort is announced with the visible count", () => {
  assert.equal(
    describeSortSelection("cheapest", 12),
    "Sorted by cheapest — 12 flights shown."
  )
  assert.equal(
    describeSortSelection("fastest", 1),
    "Sorted by fastest — 1 flight shown."
  )
  assert.equal(
    describeSortSelection("recommended", 3),
    "Showing 3 flights in recommended order."
  )
})

test("Toggle filters expose pressed state, missing lists read unpressed", () => {
  assert.equal(isFilterPressed(["BA", "AF"], "BA"), true)
  assert.equal(isFilterPressed(["BA", "AF"], "LH"), false)
  assert.equal(isFilterPressed(null, "BA"), false)
  assert.equal(isFilterPressed(undefined, "BA"), false)
  assert.equal(isFilterPressed([], "BA"), false)
})

test("Same fare needs no announcement; changed and expired fares do", () => {
  assert.equal(
    describePriceOutcome({ status: "same", total: "185000", currency: "NGN" }),
    null
  )
  const changed = describePriceOutcome({
    status: "changed",
    previousTotal: "185000",
    newTotal: "195000",
    difference: "10000",
    increased: true,
    currency: "NGN",
  })
  assert.ok(changed, "Changed fare must announce")
  assert.match(changed, /updated this fare/)
  assert.match(changed, /increased/)
  const decreased = describePriceOutcome({
    status: "changed",
    previousTotal: "195000",
    newTotal: "185000",
    difference: "10000",
    increased: false,
    currency: "NGN",
  })
  assert.match(decreased ?? "", /decreased/)
  assert.equal(
    describePriceOutcome({ status: "expired" }),
    "This fare is no longer available. Nothing was booked and no payment was taken."
  )
})

test("Announcement text follows the price machine outcome", () => {
  const offer = (total: string) => ({ total_price: total }) as never
  const same = resolvePriceConfirmation({
    selected_offer: offer("185000.00"),
    revalidated_offer: offer("185000.00"),
  })
  assert.equal(describePriceOutcome(same), null)
  const gone = resolvePriceConfirmation({
    selected_offer: offer("185000.00"),
    revalidated_offer: null,
  })
  assert.equal(gone.status, "expired")
  assert.match(describePriceOutcome(gone) ?? "", /no longer available/)
})
