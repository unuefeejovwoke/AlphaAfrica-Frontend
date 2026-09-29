import test from "node:test"
import assert from "node:assert/strict"
import { groupOffersByAirline } from "../lib/api/flight-groups.ts"
import type { FlightOfferDisplay } from "../lib/api/flights.ts"

function makeOffer(
  id: string,
  airline: string,
  airlineCode: string | null
): FlightOfferDisplay {
  return {
    id,
    airline,
    airlineCode,
    departureAt: "08:00",
    arrivalAt: "10:00",
    duration: "2h",
    stops: 0,
    stopsLabel: "Non-stop",
    maxStopsInTrip: 0,
    stopsPerItinerary: null,
    isDirect: true,
    origin: "LOS",
    destination: "ABV",
    airportsLabel: "LOS → ABV",
    cabin: "ECONOMY",
    fareCode: null,
    fareName: null,
    airlineLogo: null,
    baggage: null,
    price: "100000",
    currency: "NGN",
    journeys: [],
    raw: { id },
  }
}

test("Grouping: one group per airline, first-in-sort-order leads", () => {
  const visible = [
    makeOffer("ba-1", "British Airways", "BA"),
    makeOffer("q-1", "Qatar Airways", "QR"),
    makeOffer("ba-2", "British Airways", "BA"),
    makeOffer("q-2", "Qatar Airways", "QR"),
    makeOffer("et-1", "Ethiopian Airlines", "ET"),
  ]
  const groups = groupOffersByAirline(visible)
  assert.equal(groups.length, 3)
  assert.equal(groups[0].airline, "British Airways")
  assert.deepEqual(
    groups[0].offers.map((o) => o.id),
    ["ba-1", "ba-2"]
  )
  assert.deepEqual(
    groups[1].offers.map((o) => o.id),
    ["q-1", "q-2"]
  )
  assert.equal(groups[2].offers.length, 1)
})

test("Grouping: airlineCode is the key, display name survives", () => {
  const visible = [
    makeOffer("a-1", "British Airways", "BA"),
    makeOffer("a-2", "British Airways", "BA"),
  ]
  const groups = groupOffersByAirline(visible)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].key, "BA")
  assert.equal(groups[0].offers.length, 2)
})

test("Grouping: empty list yields no groups", () => {
  assert.deepEqual(groupOffersByAirline([]), [])
})
