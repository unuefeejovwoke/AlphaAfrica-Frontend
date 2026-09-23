import test from "node:test"
import assert from "node:assert/strict"
import {
  tripTypeSchema,
  toFlightSearchRequest,
  createEmptyLeg,
  canAddLeg,
  canRemoveLeg,
  MIN_MULTI_CITY_LEGS,
  MAX_LEGS,
} from "../lib/api/flights.ts"

// ---------------------------------------------------------------------------
// Seam: trip-type validation (round-trip return≥departure, multi-city chain)
// Vertical slices: one failing test → minimal implementation per cycle
// ---------------------------------------------------------------------------

function isoDate(offsetDays: number): string {
  return new Date(Date.now() + 86400000 * offsetDays).toISOString().slice(0, 10)
}

test("Round-trip validation: return before departure fails, same-day and later pass", () => {
  const departure = isoDate(14)
  const before = isoDate(7)
  const sameDay = departure
  const after = isoDate(21)
  const past = "2000-01-01"

  const base = {
    trip_type: "round_trip",
    origin: "LOS",
    destination: "LHR",
    departureDate: departure,
    adults: 1,
    children: 0,
    infants: 0,
    cabin: "ECONOMY",
    currency: "NGN",
    non_stop: false,
    max_stops: null,
  }

  // Return before departure must fail on returnDate with readable copy
  const early = tripTypeSchema.safeParse({ ...base, returnDate: before })
  assert.equal(early.success, false, "Return before departure must fail")
  if (!early.success) {
    const returnIssue = early.error.issues.find(
      (i) => i.path.join(".") === "returnDate"
    )
    assert.ok(
      returnIssue,
      "Must have error on returnDate when return < departure"
    )
    assert.match(returnIssue!.message, /on or after/i)
  }

  // Same-day return passes (on or after departure)
  const same = tripTypeSchema.safeParse({ ...base, returnDate: sameDay })
  assert.equal(same.success, true, "Same-day return must pass")

  // Later return passes and maps to outbound + return legs
  const later = tripTypeSchema.safeParse({ ...base, returnDate: after })
  assert.equal(later.success, true, "Later return must pass")
  if (later.success) {
    assert.equal(later.data.trip_type, "round_trip")
    const req = toFlightSearchRequest(later.data)
    assert.equal(req.trip_type, "round_trip")
    assert.equal(req.legs.length, 2)
    assert.equal(req.legs[0].origin, "LOS")
    assert.equal(req.legs[0].destination, "LHR")
    assert.equal(req.legs[0].date, departure)
    assert.equal(req.legs[1].origin, "LHR")
    assert.equal(req.legs[1].destination, "LOS")
    assert.equal(req.legs[1].date, after)
    // Global cabin applies to every leg; contract stays per-leg capable
    assert.equal(req.legs[0].cabin, "ECONOMY")
    assert.equal(req.legs[1].cabin, "ECONOMY")
  }

  // Past return date must fail
  const pastReturn = tripTypeSchema.safeParse({ ...base, returnDate: past })
  assert.equal(pastReturn.success, false, "Past return date must fail")

  // Origin == destination must fail
  const sameAirport = tripTypeSchema.safeParse({
    ...base,
    origin: "LOS",
    destination: "LOS",
    returnDate: after,
  })
  assert.equal(sameAirport.success, false, "Same origin/destination must fail")

  // Party rules still apply to round-trip
  const infantsExceed = tripTypeSchema.safeParse({
    ...base,
    returnDate: after,
    adults: 1,
    infants: 2,
  })
  assert.equal(
    infantsExceed.success,
    false,
    "Infants exceeding adults must fail"
  )
})

test("Multi-city validation: chronological chain enforced, 2-6 legs", () => {
  const d1 = isoDate(14)
  const d2 = isoDate(16)
  const d3 = isoDate(18)
  const past = "2000-01-01"

  const party = {
    trip_type: "multi_city",
    adults: 1,
    children: 0,
    infants: 0,
    cabin: "BUSINESS",
    currency: "NGN",
    non_stop: false,
    max_stops: null,
  }

  // Fewer than 2 legs must fail
  const oneLeg = tripTypeSchema.safeParse({
    ...party,
    legs: [{ origin: "LOS", destination: "LHR", date: d1 }],
  })
  assert.equal(oneLeg.success, false, "Single-leg multi-city must fail")

  // More than 6 legs must fail
  const sevenLegs = tripTypeSchema.safeParse({
    ...party,
    legs: Array.from({ length: 7 }, (_, i) => ({
      origin: "LOS",
      destination: "LHR",
      date: isoDate(14 + i),
    })),
  })
  assert.equal(sevenLegs.success, false, "Seven-leg multi-city must fail")

  // Non-chronological chain must fail
  const unordered = tripTypeSchema.safeParse({
    ...party,
    legs: [
      { origin: "LOS", destination: "LHR", date: d2 },
      { origin: "LHR", destination: "DXB", date: d1 },
    ],
  })
  assert.equal(unordered.success, false, "Out-of-order leg dates must fail")
  if (!unordered.success) {
    assert.ok(
      unordered.error.issues.some((i) =>
        /chronological|after|order/i.test(i.message)
      ),
      "Must report chronological chain violation"
    )
  }

  // Same airport within a leg must fail
  const sameAirportLeg = tripTypeSchema.safeParse({
    ...party,
    legs: [
      { origin: "LOS", destination: "LOS", date: d1 },
      { origin: "LOS", destination: "LHR", date: d2 },
    ],
  })
  assert.equal(
    sameAirportLeg.success,
    false,
    "Leg with same origin/destination must fail"
  )

  // Past leg date must fail
  const pastLeg = tripTypeSchema.safeParse({
    ...party,
    legs: [
      { origin: "LOS", destination: "LHR", date: past },
      { origin: "LHR", destination: "DXB", date: d2 },
    ],
  })
  assert.equal(pastLeg.success, false, "Past leg date must fail")

  // Valid 2-leg chain passes and maps each leg with the global cabin
  const valid = tripTypeSchema.safeParse({
    ...party,
    legs: [
      { origin: "LOS", destination: "LHR", date: d1 },
      { origin: "LHR", destination: "DXB", date: d2 },
    ],
  })
  assert.equal(valid.success, true, "Valid 2-leg chain must pass")
  if (valid.success) {
    assert.equal(valid.data.trip_type, "multi_city")
    const req = toFlightSearchRequest(valid.data)
    assert.equal(req.trip_type, "multi_city")
    assert.equal(req.legs.length, 2)
    assert.equal(req.legs[0].origin, "LOS")
    assert.equal(req.legs[1].destination, "DXB")
    assert.ok(
      req.legs.every((leg) => leg.cabin === "BUSINESS"),
      "Global cabin must apply to every leg"
    )
  }

  // Valid 3-leg chain passes
  const threeLegs = tripTypeSchema.safeParse({
    ...party,
    legs: [
      { origin: "LOS", destination: "LHR", date: d1 },
      { origin: "LHR", destination: "DXB", date: d2 },
      { origin: "DXB", destination: "LOS", date: d3 },
    ],
  })
  assert.equal(threeLegs.success, true, "Valid 3-leg chain must pass")
})

test("LegFields add/remove: starts at 2 legs, adds up to 6, removes down to 2", () => {
  assert.equal(MIN_MULTI_CITY_LEGS, 2, "Multi-city must start at 2 legs")
  assert.equal(MAX_LEGS, 6, "Multi-city must cap at 6 legs")

  const empty = createEmptyLeg()
  assert.deepEqual(
    empty,
    { origin: "", destination: "", date: "" },
    "New leg must start blank"
  )

  // Add guard: allowed below max, refused at max
  assert.equal(canAddLeg(2), true, "Must allow adding a third leg")
  assert.equal(canAddLeg(5), true, "Must allow adding a sixth leg")
  assert.equal(canAddLeg(6), false, "Must refuse adding beyond 6 legs")

  // Remove guard: refused at minimum, allowed above it
  assert.equal(canRemoveLeg(2), false, "Must refuse removing below 2 legs")
  assert.equal(canRemoveLeg(3), true, "Must allow removing down toward 2 legs")
  assert.equal(canRemoveLeg(6), true, "Must allow removing from 6 legs")
})
