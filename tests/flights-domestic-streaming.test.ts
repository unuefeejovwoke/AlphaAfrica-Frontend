import test from "node:test"
import assert from "node:assert/strict"
import {
  extractSearchId,
  getSseErrorMessage,
  isDomesticResultPayload,
  isDomesticSearch,
  normalizeDomesticCard,
  parseSseEventBlock,
  resolveBookingBranch,
  shouldFallbackToBlocking,
} from "../lib/api/domestic.ts"
import { extractOpaqueOfferBlob } from "../lib/api/flights.ts"

// ---------------------------------------------------------------------------
// Ticket 03 TDD seams (pre-agreed, vertical slices):
// 1. Domestic detection — both-Nigerian origin+destination → domestic stream
// 2. SSE error triggers blocking fallback
// No E2E SSE test in v1 (spec: contract + seam tests cover streaming).
// ---------------------------------------------------------------------------

test("Domestic detection: both-Nigerian airports route to domestic stream, mixed/international do not", () => {
  const lagos = {
    iata_code: "LOS",
    name: "Murtala Muhammed International Airport",
    city: "Lagos",
    country_name: "Nigeria",
    country_code: "NG",
  }
  const abuja = {
    iata_code: "ABV",
    name: "Nnamdi Azikiwe International Airport",
    city: "Abuja",
    country_name: "Nigeria",
    country_code: "NG",
  }
  const london = {
    iata_code: "LHR",
    name: "Heathrow Airport",
    city: "London",
    country_name: "United Kingdom",
    country_code: "GB",
  }

  // Both Nigerian (object + IATA-string forms) → domestic
  assert.equal(
    isDomesticSearch(lagos, abuja),
    true,
    "LOS → ABV must use domestic stream"
  )
  assert.equal(
    isDomesticSearch("LOS", "ABV"),
    true,
    "IATA strings LOS → ABV must use domestic stream"
  )
  assert.equal(
    isDomesticSearch("los", "abv"),
    true,
    "Detection must be case-insensitive"
  )

  // Mixed → international (Amadeus legs path)
  assert.equal(
    isDomesticSearch(lagos, london),
    false,
    "LOS → LHR must not use domestic stream"
  )
  assert.equal(
    isDomesticSearch("LOS", "LHR"),
    false,
    "LOS → LHR strings must not use domestic stream"
  )
  assert.equal(
    isDomesticSearch(london, abuja),
    false,
    "LHR → ABV must not use domestic stream"
  )

  // Both international → international
  assert.equal(
    isDomesticSearch("LHR", "JFK"),
    false,
    "LHR → JFK must not use domestic stream"
  )
})

test("SSE fallback: stream error/timeout falls back to blocking search; clean completion/abort does not", () => {
  assert.equal(
    shouldFallbackToBlocking("error"),
    true,
    "Stream error must trigger blocking fallback"
  )
  assert.equal(
    shouldFallbackToBlocking("timeout"),
    true,
    "Stream timeout must trigger blocking fallback"
  )
  assert.equal(
    shouldFallbackToBlocking("completed"),
    false,
    "Clean completion must not trigger fallback"
  )
  assert.equal(
    shouldFallbackToBlocking("aborted"),
    false,
    "User abort / new search must not trigger fallback"
  )
})

test("Booking branch: the route decides before card shape — flat international cards never go domestic", () => {
  // Live API "clean card": flat snake_case fields, no top-level origin, blob in raw_offer
  const liveInternationalCard = {
    offer_id: "1",
    airline: "ROYAL AIR MAROC",
    price: "545127.45",
    itineraries: [
      {
        segments: [
          {
            departure_airport: "LOS",
            departure_time: "2026-10-20T06:50:00",
            arrival_airport: "LHR",
            arrival_time: "2026-10-20T16:50:00",
          },
        ],
      },
    ],
    raw_offer: { id: "1", type: "flight-offer" },
  }
  assert.equal(
    resolveBookingBranch(null, liveInternationalCard),
    "international",
    "Live international card must take the Amadeus branch"
  )

  // Defensive flat card without itineraries: route still decides
  assert.equal(
    resolveBookingBranch(null, {
      origin: "LOS",
      destination: "LHR",
      price: "100",
    }),
    "international",
    "Flat international card must not be mistaken for domestic"
  )
  assert.equal(
    resolveBookingBranch(null, {
      origin: "LOS",
      destination: "ABV",
      price: "100",
    }),
    "domestic",
    "Flat both-Nigerian card takes the domestic branch"
  )

  // Live search mode wins, and unknown shapes default to international
  assert.equal(
    resolveBookingBranch("domestic", { origin: "LOS", destination: "LHR" }),
    "domestic"
  )
  assert.equal(resolveBookingBranch(null, { price: "100" }), "international")
  assert.equal(resolveBookingBranch(null, null), "international")
})

test("Domestic create payload: no opaque blob, the QuickAir card itself is sent", () => {
  // Documented current contract (apidoc does not yet specify a domestic create
  // shape): Domestic Flight Cards carry no `raw_offer`/`flight_offer`, so the
  // fallback sends the card itself as `flight_offer`.
  const card = {
    id: "dom-1",
    airline: "Air Peace",
    origin: "LOS",
    destination: "ABV",
    total_amount: "85000.00",
  }
  assert.equal(
    extractOpaqueOfferBlob(card),
    card,
    "Domestic cards must fall back to the card itself"
  )

  const wrapped = { ...card, raw_offer: { id: "amadeus-1" } }
  assert.equal(
    extractOpaqueOfferBlob(wrapped),
    wrapped.raw_offer,
    "International cards must keep sending the deepest opaque blob"
  )
})

test("SSE events: meta carries the search id but is never a flight result", () => {
  const meta = parseSseEventBlock('event: meta\ndata: {"search_id":"01M1ZZ"}')
  assert.equal(meta?.event, "meta")
  assert.equal(meta?.searchId, "01M1ZZ")
  assert.equal(
    isDomesticResultPayload(meta?.data),
    false,
    "meta must never render as a card"
  )
})

test("SSE events: result payloads are flight results, error payloads are not", () => {
  const result = parseSseEventBlock(
    'event: result\ndata: {"offer_id":"EE1414-G","airline":"Enugu Air","origin":"LOS","destination":"ABV","price":"122001.00","search_id":"01M1ZZ"}'
  )
  assert.equal(result?.event, "result")
  assert.equal(result?.searchId, "01M1ZZ")
  assert.equal(isDomesticResultPayload(result?.data), true)

  const error = parseSseEventBlock(
    'event: error\ndata: {"error":"upstream timeout"}'
  )
  assert.equal(error?.event, "error")
  assert.equal(isDomesticResultPayload(error?.data), false)
  assert.equal(getSseErrorMessage(error?.data), "upstream timeout")

  assert.equal(
    isDomesticResultPayload({ search_id: "01M1ZZ" }),
    false,
    "bare search-id objects are meta, not cards"
  )
  assert.equal(isDomesticResultPayload("keepalive"), false)
  assert.equal(isDomesticResultPayload(null), false)
})

test("extractSearchId: bare card ids never pollute the search reference", () => {
  assert.equal(extractSearchId({ search_id: " 01M1ZZ " }), "01M1ZZ")
  assert.equal(extractSearchId({ searchId: "abc" }), "abc")
  assert.equal(
    extractSearchId({ id: "dom-1" }),
    null,
    "card id must not become the search ref"
  )
  assert.equal(extractSearchId(null), null)
})

test("Domestic normalize: itinerary stops and fare class survive, nothing defaults to non-stop wrongly", () => {
  const card = normalizeDomesticCard(
    {
      offer_id: "EE1414-G",
      airline: "Enugu Air",
      airline_code: "EE",
      origin: "LOS",
      destination: "ABV",
      price: "122001.00",
      fare_code: "G",
      fare_name: "Economy Promo",
      itineraries: [
        {
          duration: "1h 15m",
          stops: 0,
          segments: [
            {
              departure_airport: "LOS",
              departure_time: "2026-09-15T09:25:00",
              arrival_airport: "ABV",
              arrival_time: "2026-09-15T10:40:00",
              carrier_code: "EE",
              flight_number: "EE1414",
            },
          ],
        },
      ],
    },
    0
  )
  assert.equal(card.stops, 0)
  assert.equal(card.maxStopsInTrip, 0)
  assert.equal(card.isDirect, true)
  assert.equal(card.airlineCode, "EE")
  assert.equal(card.fareCode, "G")
  assert.equal(card.fareName, "Economy Promo")
  assert.equal(card.bookingClass, "G")
  assert.equal(card.fareBrand, "Economy Promo")
})

test("Domestic normalize: stops inside itineraries count even without a flat stops field", () => {
  const card = normalizeDomesticCard(
    {
      offer_id: "P4-1",
      airline: "Air Peace",
      origin: "LOS",
      destination: "KAN",
      price: "95000.00",
      itineraries: [
        {
          duration: "3h",
          segments: [
            {
              departure_airport: "LOS",
              arrival_airport: "ABV",
              carrier_code: "P4",
            },
            {
              departure_airport: "ABV",
              arrival_airport: "KAN",
              carrier_code: "P4",
            },
          ],
        },
      ],
    },
    0
  )
  assert.equal(card.stops, 1)
  assert.equal(card.maxStopsInTrip, 1)
  assert.equal(card.isDirect, false)
  assert.equal(card.stopsLabel, "1 stop")
})
