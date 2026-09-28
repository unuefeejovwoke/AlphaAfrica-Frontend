import test from "node:test"
import assert from "node:assert/strict"
import { normalizeFlightOffer } from "../lib/api/flights.ts"

// ---------------------------------------------------------------------------
// Full itinerary details — every necessary fact from the live API response.
// Fixture mirrors the live `/api/flights/search/` clean card (Royal Air Maroc
// LOS → LHR via CMN) with its opaque `raw_offer` Amadeus blob.
// ---------------------------------------------------------------------------

function liveOffer() {
  return {
    offer_id: "1",
    airline: "ROYAL AIR MAROC",
    airline_code: "AT",
    cabin: "ECONOMY",
    itineraries: [
      {
        duration: "10h 50m",
        stops: 1,
        segments: [
          {
            departure_airport: "LOS",
            departure_time: "2026-11-20T07:00:00",
            arrival_airport: "CMN",
            arrival_time: "2026-11-20T11:30:00",
            carrier_code: "AT",
            carrier_name: "ROYAL AIR MAROC",
            flight_number: "AT554",
            aircraft: "789",
            duration: "5h 30m",
          },
          {
            departure_airport: "CMN",
            departure_time: "2026-11-20T13:40:00",
            arrival_airport: "LHR",
            arrival_time: "2026-11-20T16:50:00",
            carrier_code: "AT",
            carrier_name: "ROYAL AIR MAROC",
            flight_number: "AT800",
            aircraft: "7M8",
            duration: "3h 10m",
          },
        ],
      },
    ],
    stops_per_itinerary: [1],
    is_direct: false,
    seats_available: 9,
    base_fare: "517656.00",
    markup: "25882.80",
    price: "543538.80",
    currency: "NGN",
    raw_offer: {
      type: "flight-offer",
      id: "1",
      numberOfBookableSeats: 9,
      lastTicketingDate: "2026-11-20",
      itineraries: [
        {
          duration: "PT10H50M",
          segments: [
            {
              departure: {
                iataCode: "LOS",
                terminal: "2I",
                at: "2026-11-20T07:00:00",
              },
              arrival: {
                iataCode: "CMN",
                terminal: "2",
                at: "2026-11-20T11:30:00",
              },
              carrierCode: "AT",
              number: "554",
              aircraft: { code: "789" },
              operating: { carrierCode: "AT" },
              duration: "PT5H30M",
              id: "3",
            },
            {
              departure: {
                iataCode: "CMN",
                terminal: "1",
                at: "2026-11-20T13:40:00",
              },
              arrival: {
                iataCode: "LHR",
                terminal: "4",
                at: "2026-11-20T16:50:00",
              },
              carrierCode: "AT",
              number: "800",
              aircraft: { code: "7M8" },
              operating: { carrierCode: "AT" },
              duration: "PT3H10M",
              id: "4",
            },
          ],
        },
      ],
      validatingAirlineCodes: ["AT"],
      travelerPricings: [
        {
          travelerId: "1",
          fareOption: "STANDARD",
          travelerType: "ADULT",
          fareDetailsBySegment: [
            {
              segmentId: "3",
              cabin: "ECONOMY",
              fareBasis: "OA0WE1IA",
              brandedFare: "EESSENTIAL",
              brandedFareLabel: "ECO ESSENTIAL",
              class: "O",
              includedCheckedBags: { quantity: 1 },
              includedCabinBags: { quantity: 1 },
              amenities: [
                {
                  description: "MEAL BEVERAGE",
                  isChargeable: false,
                  amenityType: "MEAL",
                },
                {
                  description: "PRE RESERVATION SEAT ASSIGNMEN",
                  isChargeable: true,
                  amenityType: "PRE_RESERVED_SEAT",
                },
              ],
            },
            {
              segmentId: "4",
              cabin: "ECONOMY",
              fareBasis: "OA0WE1IA",
              brandedFareLabel: "ECO ESSENTIAL",
              class: "O",
              includedCheckedBags: { quantity: 1 },
              includedCabinBags: { quantity: 1 },
            },
          ],
        },
      ],
      fareRules: {
        rules: [
          { category: "EXCHANGE", maxPenaltyAmount: "196723" },
          { category: "REFUND", notApplicable: true },
          { category: "REVALIDATION", notApplicable: true },
        ],
      },
    },
  } as never
}

test("Full itinerary: terminals, aircraft, flight numbers, and carrier survive normalization", () => {
  const display = normalizeFlightOffer(liveOffer(), 0)
  const segments = display.journeys[0].segments
  assert.equal(segments.length, 2)
  assert.equal(segments[0].departureTerminal, "2I")
  assert.equal(segments[0].arrivalTerminal, "2")
  assert.equal(segments[1].departureTerminal, "1")
  assert.equal(segments[1].arrivalTerminal, "4")
  assert.equal(segments[0].aircraft, "789")
  assert.equal(segments[1].aircraft, "7M8")
  assert.equal(segments[0].flightNumber, "AT554")
  assert.equal(segments[1].flightNumber, "AT800")
  assert.equal(segments[0].carrierName, "ROYAL AIR MAROC")
  assert.equal(display.airlineCode, "AT")
  assert.equal(display.validatingAirline, "AT")
})

test("Layover: connection airport and duration computed from real segment times", () => {
  const display = normalizeFlightOffer(liveOffer(), 0)
  const layovers = display.journeys[0].layovers
  assert.equal(layovers.length, 1)
  assert.equal(layovers[0].airport, "CMN")
  assert.equal(layovers[0].durationMinutes, 130)
  assert.equal(layovers[0].durationLabel, "2h 10m")
  assert.equal(layovers[0].overnight, false)
  // Terminal 2 → Terminal 1 change is surfaced, never hidden
  assert.equal(layovers[0].terminalChange, "2 → 1")
})

test("Baggage: opaque travelerPricings surface per-segment allowances and amenities", () => {
  const display = normalizeFlightOffer(liveOffer(), 0)
  assert.ok(
    display.baggage && display.baggage.includes("1"),
    "Summary baggage must surface the airline allowance"
  )
  assert.equal(display.checkedBags, 1)
  assert.equal(display.cabinBags, 1)
  const segments = display.journeys[0].segments
  assert.equal(segments[0].checkedBags, 1)
  assert.equal(segments[0].cabinBags, 1)
  assert.equal(segments[0].bookingClass, "O")
  assert.equal(segments[0].fareBasis, "OA0WE1IA")
  assert.equal(segments[0].brandedFare, "ECO ESSENTIAL")
  assert.equal(display.fareBrand, "ECO ESSENTIAL")
  assert.ok(display.amenities && display.amenities.length >= 2)
  const meal = display.amenities.find((a) => a.type === "MEAL")
  assert.ok(meal, "Meal amenity must be surfaced")
  assert.equal(meal.chargeable, false)
})

test("Fare rules: non-refundable + exchange penalty + ticketing deadline are truthful", () => {
  const display = normalizeFlightOffer(liveOffer(), 0)
  assert.ok(display.fareRules, "Fare rules must be extracted")
  assert.equal(display.fareRules?.refundable, false)
  assert.equal(display.fareRules?.exchangeAllowed, true)
  assert.equal(display.fareRules?.exchangePenalty, "196723")
  assert.equal(display.fareRules?.revalidationAllowed, false)
  assert.equal(display.fareRules?.ticketDeadline, "2026-11-20")
  assert.equal(display.lastTicketingDate, "2026-11-20")
  assert.equal(display.seatsAvailable, 9)
})

test("Price breakdown: base fare + markup + total preserved, never zero-filled", () => {
  const display = normalizeFlightOffer(liveOffer(), 0)
  assert.ok(display.priceBreakdown, "Price breakdown must be extracted")
  assert.equal(display.priceBreakdown?.baseFare, "517656.00")
  assert.equal(display.priceBreakdown?.markup, "25882.80")
  assert.equal(display.priceBreakdown?.total, "543538.80")
  assert.equal(display.price, "543538.80")
})

test("Missing fare facts stay null — never fabricated", () => {
  const sparse = normalizeFlightOffer(
    {
      id: "sparse",
      price: "100000",
      origin: "LOS",
      destination: "ABV",
    } as never,
    0
  )
  assert.equal(sparse.fareRules, null)
  assert.equal(sparse.priceBreakdown, null)
  assert.equal(sparse.seatsAvailable, null)
  assert.equal(sparse.lastTicketingDate, null)
  assert.equal(sparse.journeys[0].layovers.length, 0)
  assert.equal(sparse.baggage, null)
})

test("Round-trip: return-leg segments take return-leg fares, never the outbound fares", () => {
  const offer = {
    offer_id: "rt-1",
    airline: "Test Air",
    price: "600000.00",
    itineraries: [
      {
        duration: "7h",
        segments: [
          {
            departure_airport: "LOS",
            departure_time: "2026-11-20T08:00:00",
            arrival_airport: "LHR",
            arrival_time: "2026-11-20T15:00:00",
            carrier_code: "TA",
            flight_number: "TA100",
          },
        ],
      },
      {
        duration: "7h",
        segments: [
          {
            departure_airport: "LHR",
            departure_time: "2026-11-27T10:00:00",
            arrival_airport: "LOS",
            arrival_time: "2026-11-27T17:00:00",
            carrier_code: "TA",
            flight_number: "TA101",
          },
        ],
      },
    ],
    raw_offer: {
      travelerPricings: [
        {
          fareDetailsBySegment: [
            {
              segmentId: "out-1",
              cabin: "ECONOMY",
              class: "O",
              includedCheckedBags: { quantity: 1 },
            },
            {
              segmentId: "ret-1",
              cabin: "BUSINESS",
              class: "J",
              includedCheckedBags: { quantity: 2 },
            },
          ],
        },
      ],
      itineraries: [
        {
          segments: [
            {
              departure: { iataCode: "LOS", at: "2026-11-20T08:00:00" },
              arrival: { iataCode: "LHR", at: "2026-11-20T15:00:00" },
              carrierCode: "TA",
              number: "100",
              id: "out-1",
            },
          ],
        },
        {
          segments: [
            {
              departure: { iataCode: "LHR", at: "2026-11-27T10:00:00" },
              arrival: { iataCode: "LOS", at: "2026-11-27T17:00:00" },
              carrierCode: "TA",
              number: "101",
              id: "ret-1",
            },
          ],
        },
      ],
    },
  } as never
  const display = normalizeFlightOffer(offer, 0)
  assert.equal(display.journeys.length, 2)
  assert.equal(display.journeys[0].segments[0].bookingClass, "O")
  assert.equal(display.journeys[0].segments[0].checkedBags, 1)
  assert.equal(display.journeys[1].segments[0].bookingClass, "J")
  assert.equal(display.journeys[1].segments[0].checkedBags, 2)
  assert.equal(display.journeys[1].segments[0].cabin, "BUSINESS")
})

test("Per-segment stops: a connecting leg's own stop count never leaks into its segments", () => {
  const offer = {
    offer_id: "seg-stops-1",
    price: "500000.00",
    itineraries: [
      {
        duration: "11h",
        segments: [
          {
            departure_airport: "LOS",
            departure_time: "2026-11-20T07:00:00",
            arrival_airport: "NBO",
            arrival_time: "2026-11-20T11:30:00",
            carrier_code: "KQ",
            flight_number: "KQ533",
          },
          {
            departure_airport: "NBO",
            departure_time: "2026-11-20T15:50:00",
            arrival_airport: "KGL",
            arrival_time: "2026-11-20T17:20:00",
            carrier_code: "KQ",
            flight_number: "KQ448",
          },
        ],
      },
    ],
    raw_offer: {
      itineraries: [
        {
          segments: [
            {
              departure: { iataCode: "LOS", at: "2026-11-20T07:00:00" },
              arrival: { iataCode: "NBO", at: "2026-11-20T11:30:00" },
              carrierCode: "KQ",
              number: "533",
              id: "s1",
              numberOfStops: 0,
            },
            {
              departure: { iataCode: "NBO", at: "2026-11-20T15:50:00" },
              arrival: { iataCode: "KGL", at: "2026-11-20T17:20:00" },
              carrierCode: "KQ",
              number: "448",
              id: "s2",
              numberOfStops: 0,
            },
          ],
        },
      ],
    },
  } as never
  const display = normalizeFlightOffer(offer, 0)
  // Journey level still reports the connection…
  assert.equal(display.stops, 1)
  assert.equal(display.journeys[0].stops, 1)
  // …but each segment is its own non-stop flight.
  assert.equal(display.journeys[0].segments[0].segmentStops, 0)
  assert.equal(display.journeys[0].segments[1].segmentStops, 0)
  // A same-plane direct with an en-route stop keeps its own count.
  const direct = normalizeFlightOffer(
    {
      offer_id: "seg-stops-2",
      price: "100000",
      itineraries: [
        {
          segments: [
            {
              departure_airport: "LOS",
              departure_time: "2026-11-20T07:00:00",
              arrival_airport: "KGL",
              arrival_time: "2026-11-20T12:00:00",
              carrier_code: "KQ",
              flight_number: "KQ100",
              numberOfStops: 1,
            },
          ],
        },
      ],
    } as never,
    1
  )
  assert.equal(direct.journeys[0].stops, 0)
  assert.equal(direct.journeys[0].segments[0].segmentStops, 1)
})
