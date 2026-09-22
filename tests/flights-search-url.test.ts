import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFlightSearchParams,
  buildFlightSearchQuery,
  parseFlightSearchPayload,
  parseFlightSearchUrl,
} from "../lib/api/flight-search-url.ts";
import { tripTypeSchema } from "../lib/api/flights.ts";

function isoDate(offsetDays: number): string {
  return new Date(Date.now() + 86400000 * offsetDays).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Ticket 01 — Shared flight search URL contract (navigation seam)
// External behavior only: exact params, flag round-trip, invalid rejection.
// ---------------------------------------------------------------------------

test("One-way payload builds exact shareable params (no opaque blobs)", () => {
  const departure = isoDate(14);
  const parsed = tripTypeSchema.safeParse({
    trip_type: "one_way",
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
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  const params = buildFlightSearchParams(parsed.data);
  assert.equal(params.get("trip_type"), "one_way");
  assert.equal(params.get("origin"), "LOS");
  assert.equal(params.get("destination"), "LHR");
  assert.equal(params.get("departureDate"), departure);
  assert.equal(params.get("returnDate"), null);
  assert.equal(params.get("legs"), null);
  assert.equal(params.get("adults"), "1");
  assert.equal(params.get("cabin"), "ECONOMY");
  assert.equal(params.get("non_stop"), null);
  assert.equal(params.get("max_stops"), null);

  const query = buildFlightSearchQuery(parsed.data);
  assert.ok(!query.includes("flight_offer"), "Opaque blobs must never enter the URL");
  assert.ok(!query.includes("token"), "Tokens must never enter the URL");
});

test("Round-trip payload builds returnDate and parses back to identical form state", () => {
  const departure = isoDate(14);
  const ret = isoDate(21);
  const parsed = tripTypeSchema.safeParse({
    trip_type: "round_trip",
    origin: "LOS",
    destination: "LHR",
    departureDate: departure,
    returnDate: ret,
    adults: 2,
    children: 1,
    infants: 1,
    cabin: "BUSINESS",
    currency: "NGN",
    non_stop: true,
    max_stops: 1,
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  const query = buildFlightSearchQuery(parsed.data);
  const back = parseFlightSearchUrl(new URLSearchParams(query));
  assert.equal(back.isValid, true);
  assert.equal(back.values.trip_type, "round_trip");
  assert.equal(back.values.origin, "LOS");
  assert.equal(back.values.destination, "LHR");
  assert.equal(back.values.departureDate, departure);
  assert.equal(back.values.returnDate, ret);
  assert.equal(back.values.adults, 2);
  assert.equal(back.values.children, 1);
  assert.equal(back.values.infants, 1);
  assert.equal(back.values.cabin, "BUSINESS");
  assert.equal(back.values.non_stop, true);
  assert.equal(back.values.max_stops, 1);

  // Hydrated airports mirror the IATA so the form can submit without re-typing
  assert.equal(back.originAirport?.iata_code, "LOS");
  assert.equal(back.destinationAirport?.iata_code, "LHR");

  // Re-validates through the domain union — same rules as the form
  const reparsed = parseFlightSearchPayload({
    trip_type: back.values.trip_type,
    origin: back.values.origin,
    destination: back.values.destination,
    departureDate: back.values.departureDate,
    returnDate: back.values.returnDate,
    adults: back.values.adults,
    children: back.values.children,
    infants: back.values.infants,
    cabin: back.values.cabin,
    non_stop: back.values.non_stop,
    max_stops: back.values.max_stops,
  });
  assert.equal(reparsed.success, true);
});

test("Multi-city trip flag round-trips through the shared parser (legs blob, no top-level route)", () => {
  const d1 = isoDate(14);
  const d2 = isoDate(16);
  const parsed = tripTypeSchema.safeParse({
    trip_type: "multi_city",
    legs: [
      { origin: "LOS", destination: "LHR", date: d1 },
      { origin: "LHR", destination: "DXB", date: d2 },
    ],
    adults: 1,
    children: 0,
    infants: 0,
    cabin: "ECONOMY",
    currency: "NGN",
    non_stop: false,
    max_stops: null,
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  const params = buildFlightSearchParams(parsed.data);
  assert.equal(params.get("trip_type"), "multi_city");
  const legsRaw = params.get("legs");
  assert.ok(legsRaw, "Multi-city legs must ride in one legs param");
  assert.equal(params.get("origin"), null);
  assert.equal(params.get("destination"), null);

  const back = parseFlightSearchUrl(new URLSearchParams(params.toString()));
  assert.equal(back.isValid, true);
  assert.equal(back.values.trip_type, "multi_city");
  assert.equal(back.legAirports.length, 2);
  assert.equal(back.legAirports[0]?.origin?.iata_code, "LOS");
  assert.equal(back.legAirports[1]?.destination?.iata_code, "DXB");
});

test("Invalid or partial URL state is rejected without triggering a search", () => {
  const departure = isoDate(14);

  // Empty — no route/dates
  assert.equal(parseFlightSearchUrl(new URLSearchParams("")).isValid, false);

  // Partial one-way — missing destination
  assert.equal(
    parseFlightSearchUrl(new URLSearchParams(`trip_type=one_way&origin=LOS&departureDate=${departure}`))
      .isValid,
    false,
  );

  // Same airport — domain rule rejects
  assert.equal(
    parseFlightSearchUrl(
      new URLSearchParams(`trip_type=one_way&origin=LOS&destination=LOS&departureDate=${departure}`),
    ).isValid,
    false,
  );

  // Return before departure — domain rule rejects
  assert.equal(
    parseFlightSearchUrl(
      new URLSearchParams(
        `trip_type=round_trip&origin=LOS&destination=LHR&departureDate=${isoDate(14)}&returnDate=${isoDate(7)}&adults=1`,
      ),
    ).isValid,
    false,
  );

  // Past departure — domain rule rejects
  assert.equal(
    parseFlightSearchUrl(
      new URLSearchParams(`trip_type=one_way&origin=LOS&destination=LHR&departureDate=2000-01-01`),
    ).isValid,
    false,
  );

  // Corrupt legs blob — never throws, never valid
  assert.equal(
    parseFlightSearchUrl(new URLSearchParams(`trip_type=multi_city&legs=not-json`)).isValid,
    false,
  );

  // Single-leg multi-city — below the 2-leg floor
  const singleLeg = encodeURIComponent(JSON.stringify([{ origin: "LOS", destination: "LHR", date: departure }]));
  assert.equal(
    parseFlightSearchUrl(new URLSearchParams(`trip_type=multi_city&legs=${singleLeg}`)).isValid,
    false,
  );

  // Unknown trip_type falls back to one_way shape and still requires route/dates
  assert.equal(
    parseFlightSearchUrl(new URLSearchParams(`trip_type=bogus&origin=LOS`)).isValid,
    false,
  );
});
