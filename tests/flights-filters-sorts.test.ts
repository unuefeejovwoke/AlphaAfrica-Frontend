import test from "node:test"
import assert from "node:assert/strict"
import type { FlightOffer, FlightOfferDisplay } from "../lib/api/flights.ts"
import {
  DEFAULT_FILTERS,
  filterOffers,
  sortOffers,
} from "../lib/api/flight-filters.ts"

// ---------------------------------------------------------------------------
// Seam: filter/sort selectors (Phase 3, ticket 04 — spec stories 9–11).
// Pure functions over accumulated FlightOfferDisplay cards. ONE filter test,
// ONE sort test, known literal inputs — never computed expectations.
// ---------------------------------------------------------------------------

function card(overrides: Partial<FlightOfferDisplay>): FlightOfferDisplay {
  return {
    id: "offer",
    airline: "Arik Air",
    departureAt: "08:30",
    arrivalAt: "09:45",
    duration: "1h 15m",
    stops: 0,
    stopsLabel: "Non-stop",
    origin: "LOS",
    destination: "ABV",
    airportsLabel: "LOS → ABV",
    cabin: "ECONOMY",
    baggage: null,
    price: "185000",
    currency: "NGN",
    journeys: [],
    raw: {} as FlightOffer,
    ...overrides,
  }
}

const OFFER_A = card({ id: "offer-a", airline: "Arik Air", price: "185000" })
const OFFER_B = card({
  id: "offer-b",
  airline: "Air Peace",
  price: "240000",
  stops: 1,
  stopsLabel: "1 stop",
  duration: "2h 5m",
  departureAt: "14:00",
  arrivalAt: "16:05",
})
const OFFER_C = card({
  id: "offer-c",
  airline: "Ibom Air",
  price: "520000",
  duration: "1h 10m",
  departureAt: "19:30",
  arrivalAt: "20:40",
})
const OFFERS = [OFFER_A, OFFER_B, OFFER_C]

test("filterOffers: price excludes over-budget, stops excludes connections, airline narrows", () => {
  // Price: ₦520,000 exceeds a ₦300,000 ceiling.
  const byPrice = filterOffers(OFFERS, {
    ...DEFAULT_FILTERS,
    maxPriceNgn: 300_000,
  })
  assert.deepEqual(
    byPrice.map((d) => d.id),
    ["offer-a", "offer-b"],
    "Over-budget cards must be excluded"
  )

  // Stops: non-stop-only drops the 1-stop connection.
  const nonstop = filterOffers(OFFERS, { ...DEFAULT_FILTERS, stops: [0] })
  assert.deepEqual(
    nonstop.map((d) => d.id),
    ["offer-a", "offer-c"],
    "Stops filter must exclude connections when only non-stop is allowed"
  )

  // Airline: multi-select keeps only the chosen carrier.
  const byAirline = filterOffers(OFFERS, {
    ...DEFAULT_FILTERS,
    airlines: ["Air Peace"],
  })
  assert.deepEqual(
    byAirline.map((d) => d.id),
    ["offer-b"],
    "Airline filter must keep only the selected carrier"
  )

  // Default filters pass everything through.
  assert.deepEqual(
    filterOffers(OFFERS, DEFAULT_FILTERS).map((d) => d.id),
    ["offer-a", "offer-b", "offer-c"],
    "Default filters must not hide any card"
  )
})

test("sortOffers: cheapest lowest first, fastest shortest first, recommended keeps order", () => {
  const shuffled = [OFFER_C, OFFER_A, OFFER_B]

  const cheapest = sortOffers(shuffled, "cheapest")
  assert.deepEqual(
    cheapest.map((d) => d.id),
    ["offer-a", "offer-b", "offer-c"],
    "Cheapest must order ₦185,000 → ₦240,000 → ₦520,000"
  )

  const fastest = sortOffers(shuffled, "fastest")
  assert.deepEqual(
    fastest.map((d) => d.id),
    ["offer-c", "offer-a", "offer-b"],
    "Fastest must order 1h 10m → 1h 15m → 2h 5m"
  )

  const earliest = sortOffers(shuffled, "earliest")
  assert.deepEqual(
    earliest.map((d) => d.id),
    ["offer-a", "offer-b", "offer-c"],
    "Earliest must order 08:30 → 14:00 → 19:30 departures"
  )

  const recommended = sortOffers(shuffled, "recommended")
  assert.deepEqual(
    recommended.map((d) => d.id),
    ["offer-c", "offer-a", "offer-b"],
    "Recommended must preserve accumulation order"
  )

  assert.notEqual(cheapest, shuffled, "Sorting must not mutate the input array")
})
