import test from "node:test"
import assert from "node:assert/strict"
import {
  oneWayFlightSearchSchema,
  toFlightSearchRequest,
  normalizeFlightOffer,
  searchAirports,
  airportResultCache,
  airportPendingRequests,
  __clearAirportCache,
  getRecentAirports,
  addRecentAirport,
  RECENT_AIRPORTS_KEY,
} from "../lib/api/flights.ts"
import { futureDateStringSchema } from "../lib/api/validation.ts"
import { sanitizeProps } from "../lib/analytics.ts"

// ---------------------------------------------------------------------------
// Seam 1: Search validation — legs shape, origin!=destination, date guards, composition
// Vertical slice: one failing test then minimal implementation
// ---------------------------------------------------------------------------

test("One-way search validation: valid passes, origin==destination fails, past date fails, zero adults fails", () => {
  const future = new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10)
  const past = "2000-01-01"
  const impossible = "2026-02-30"

  // Valid search should pass (trip_type locked one_way, cabin ECONOMY default, currency NGN)
  const valid = oneWayFlightSearchSchema.safeParse({
    origin: "LOS",
    destination: "LHR",
    departureDate: future,
    adults: 1,
    children: 0,
    infants: 0,
    cabin: "ECONOMY",
    currency: "NGN",
    non_stop: false,
    max_stops: null,
    trip_type: "one_way",
  })
  assert.equal(valid.success, true, "Valid one-way search must pass validation")
  if (valid.success) {
    assert.equal(valid.data.origin, "LOS")
    assert.equal(valid.data.destination, "LHR")
    assert.equal(valid.data.cabin, "ECONOMY")
    assert.equal(valid.data.currency, "NGN")
    assert.equal(valid.data.trip_type, "one_way")
    // Contract maps to legs correctly
    const req = toFlightSearchRequest(valid.data)
    assert.equal(req.trip_type, "one_way")
    assert.equal(req.legs.length, 1)
    assert.equal(req.legs[0].origin, "LOS")
    assert.equal(req.legs[0].destination, "LHR")
    assert.equal(req.legs[0].date, future)
  }

  // origin == destination must fail on destination path
  const same = oneWayFlightSearchSchema.safeParse({
    origin: "LOS",
    destination: "LOS",
    departureDate: future,
    adults: 1,
    children: 0,
    infants: 0,
  })
  assert.equal(same.success, false, "Same origin/destination must fail")
  if (!same.success) {
    const destIssue = same.error.issues.find(
      (i) => i.path.join(".") === "destination"
    )
    assert.ok(
      destIssue,
      "Must have error on destination when origin==destination"
    )
    assert.match(destIssue!.message, /different/i)
  }

  // Past date must fail (futureDateStringSchema guard)
  const pastResult = oneWayFlightSearchSchema.safeParse({
    origin: "LOS",
    destination: "LHR",
    departureDate: past,
    adults: 1,
    children: 0,
    infants: 0,
  })
  assert.equal(pastResult.success, false, "Past departure date must fail")
  if (!pastResult.success) {
    assert.ok(
      pastResult.error.issues.some((i) => /past/i.test(i.message)),
      "Must report past date"
    )
  }

  // Impossible date must fail
  const impossibleResult = oneWayFlightSearchSchema.safeParse({
    origin: "LOS",
    destination: "LHR",
    departureDate: impossible,
    adults: 1,
    children: 0,
    infants: 0,
  })
  assert.equal(impossibleResult.success, false, "Impossible date must fail")

  // Zero adults must fail (adults ≥1)
  const zeroAdults = oneWayFlightSearchSchema.safeParse({
    origin: "LOS",
    destination: "LHR",
    departureDate: future,
    adults: 0,
    children: 1,
    infants: 0,
  })
  assert.equal(zeroAdults.success, false, "Zero adults must fail")

  // Infants > adults must fail
  const infantsExceed = oneWayFlightSearchSchema.safeParse({
    origin: "LOS",
    destination: "LHR",
    departureDate: future,
    adults: 1,
    children: 0,
    infants: 2,
  })
  assert.equal(
    infantsExceed.success,
    false,
    "Infants exceeding adults must fail"
  )

  // Total >9 must fail
  const totalExceed = oneWayFlightSearchSchema.safeParse({
    origin: "LOS",
    destination: "LHR",
    departureDate: future,
    adults: 5,
    children: 5,
    infants: 0,
  })
  assert.equal(totalExceed.success, false, "Total travellers >9 must fail")

  // max_stops out of range must fail
  const badStops = oneWayFlightSearchSchema.safeParse({
    origin: "LOS",
    destination: "LHR",
    departureDate: future,
    adults: 1,
    children: 0,
    infants: 0,
    max_stops: 5,
  })
  assert.equal(badStops.success, false, "max_stops >3 must fail")
})

// ---------------------------------------------------------------------------
// Seam 2: Autocomplete debounce/cache behavior
// Spec: 2-char minimum, 300ms debounce (component), request dedup, result cache via Map, recent searches versioned in localStorage
// Test focuses on the module-level cache/dedup seam (pure behavior, no timers in test)
// ---------------------------------------------------------------------------

test("Airport autocomplete: 2-char minimum, dedup, result cache in module-level Map, versioned recent searches", async () => {
  __clearAirportCache()
  // Mock fetch for /api/flights/airports/
  const originalFetch = globalThis.fetch
  let fetchCalls = 0
  const fakeAirports = [
    {
      iata_code: "LOS",
      name: "Murtala Muhammed International Airport",
      city: "Lagos",
      country_name: "Nigeria",
      country_code: "NG",
    },
    {
      iata_code: "LOV",
      name: "Monclova",
      city: "Monclova",
      country_name: "Mexico",
      country_code: "MX",
    },
  ]

  globalThis.fetch = (async (url: string) => {
    fetchCalls++
    // Verify base URL never leaks via direct assertion? We just handle the URL.
    assert.ok(
      url.includes("/api/flights/airports/"),
      "Must call via centralized airports endpoint"
    )
    return new Response(JSON.stringify(fakeAirports), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }) as typeof fetch

  try {
    // 1) Below minimum — must short-circuit without fetch
    const short = await searchAirports("L")
    assert.deepEqual(short, [], "Single char must return empty without fetch")
    assert.equal(fetchCalls, 0, "Must not fetch for <2 chars")

    // 2) Valid query — first call fetches, second hits cache without new fetch
    const first = await searchAirports("LO")
    assert.equal(fetchCalls, 1, "First valid query must fetch")
    assert.equal(first.length, 2)
    assert.equal(first[0].iata_code, "LOS")

    // Verify Map cache was populated
    assert.ok(
      airportResultCache.has("lo"),
      "Result must be cached in module-level Map"
    )
    assert.deepEqual(airportResultCache.get("lo"), fakeAirports)

    const second = await searchAirports("LO")
    assert.equal(
      fetchCalls,
      1,
      "Second identical query must be served from cache (no new fetch)"
    )
    assert.deepEqual(second, fakeAirports)

    // 3) Deduplication — concurrent calls share the same pending promise (one fetch)
    __clearAirportCache()
    fetchCalls = 0
    // Make fetch slower to ensure concurrency window
    globalThis.fetch = (async () => {
      fetchCalls++
      await new Promise((r) => setTimeout(r, 20))
      return new Response(JSON.stringify(fakeAirports), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }) as typeof fetch

    const [a, b] = await Promise.all([
      searchAirports("LOS"),
      searchAirports("LOS"),
    ])
    assert.equal(
      fetchCalls,
      1,
      "Concurrent duplicate queries must deduplicate to one fetch"
    )
    assert.deepEqual(a, fakeAirports)
    assert.deepEqual(b, fakeAirports)
    assert.equal(
      airportPendingRequests.size,
      0,
      "Pending map must clear after resolution"
    )

    // 4) Different query — must fetch again (not dedup across keys)
    const third = await searchAirports("LA")
    assert.equal(fetchCalls, 2, "Different query must trigger a new fetch")

    // 5) Recent searches: versioned key, max 5, dedup by IATA, most recent first
    // Mock localStorage for Node
    const store = new Map<string, string>()
    // Patch global window/localStorage shape
    // @ts-ignore
    globalThis.window = globalThis.window || {}
    // @ts-ignore
    globalThis.window.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    } as Storage
    // Also ensure global localStorage for helpers that read from window.localStorage
    store.clear()
    // Seed
    for (let i = 0; i < 7; i++) {
      addRecentAirport({
        iata_code: `T${i}0`,
        name: `Test ${i}`,
        city: `City${i}`,
        country_name: "Nigeria",
        country_code: "NG",
      })
    }
    const recent = getRecentAirports()
    assert.equal(recent.length, 5, "Recent searches must cap at 5")
    assert.equal(recent[0].iata_code, "T60", "Most recent must be first")
    // Re-adding existing moves it to front without duplication
    addRecentAirport({
      iata_code: "T60",
      name: "Test 6",
      city: "City6",
      country_name: "Nigeria",
      country_code: "NG",
    })
    const recent2 = getRecentAirports()
    assert.equal(recent2.length, 5)
    assert.equal(recent2[0].iata_code, "T60")
    // Key must be versioned
    assert.ok(
      store.has(RECENT_AIRPORTS_KEY),
      "Must persist under versioned key"
    )
    assert.match(RECENT_AIRPORTS_KEY, /:v1$/, "Key must be versioned")

    // Clean up window mock
    // @ts-ignore
    delete globalThis.window
  } finally {
    globalThis.fetch = originalFetch
    __clearAirportCache()
  }
})

// ---------------------------------------------------------------------------
// Seam 3: Results rendering — Flight Offer cards defensive normalization
// ---------------------------------------------------------------------------

test("Flight Offer rendering: normalize covers airline, departure, arrival, duration, stops, airports, cabin, baggage, price in NGN", () => {
  // Typical Amadeus-shaped offer with itineraries
  const amadeusOffer = {
    id: "1",
    price: { total: "450000.00", currency: "NGN" },
    validatingAirlineCodes: ["BA"],
    itineraries: [
      {
        duration: "PT7H30M",
        segments: [
          {
            departure: { iataCode: "LOS", at: "2026-10-10T08:30:00" },
            arrival: { iataCode: "LHR", at: "2026-10-10T16:00:00" },
            carrierCode: "BA",
            duration: "PT7H30M",
            cabin: "ECONOMY",
          },
        ],
      },
    ],
    cabin: "ECONOMY",
  }

  // Flat fallback shape (e.g. mocked or simplified)
  const flatOffer = {
    id: "2",
    total_amount: "380000.00",
    currency: "NGN",
    airline: "Arik Air",
    departure: "2026-10-11T10:00:00",
    arrival: "2026-10-11T12:00:00",
    duration: "2h",
    stops: 0,
    origin: "LOS",
    destination: "ACC",
    cabin: "ECONOMY",
    baggage: "23kg checked",
  }

  // Missing fields — defensive
  const sparseOffer = {
    id: "3",
    price: "—",
  }

  const d1 = normalizeFlightOffer(amadeusOffer as never, 0)
  assert.equal(
    d1.airline,
    "BA",
    "Must extract airline from validatingAirlineCodes"
  )
  assert.equal(d1.origin, "LOS")
  assert.equal(d1.destination, "LHR")
  assert.equal(d1.airportsLabel, "LOS → LHR")
  assert.equal(d1.cabin, "ECONOMY")
  assert.equal(d1.stops, 0)
  assert.equal(d1.stopsLabel, "Non-stop")
  assert.match(d1.duration, /7h|PT/, "Must format ISO duration")
  assert.equal(d1.currency, "NGN")
  assert.equal(d1.price, "450000.00")

  const d2 = normalizeFlightOffer(flatOffer as never, 1)
  assert.equal(d2.airline, "Arik Air")
  assert.equal(d2.stopsLabel, "Non-stop")
  assert.equal(
    d2.baggage,
    "23kg checked",
    "Must surface baggage where available"
  )
  assert.equal(d2.price, "380000.00")
  assert.equal(d2.currency, "NGN")

  const d3 = normalizeFlightOffer(sparseOffer as never, 2)
  assert.equal(
    d3.airline,
    "Airline",
    "Missing airline must fallback gracefully"
  )
  assert.equal(d3.price, "—", "Missing price must not crash")
  assert.ok(d3.airportsLabel, "Must handle missing airports without throwing")

  // Stops label for 1 stop
  const oneStop = normalizeFlightOffer(
    {
      id: "4",
      price: "500000",
      currency: "NGN",
      itineraries: [
        {
          segments: [
            {
              departure: { iataCode: "LOS", at: "2026-10-10T08:00:00" },
              arrival: { iataCode: "ACC", at: "2026-10-10T09:00:00" },
              carrierCode: "AR",
            },
            {
              departure: { iataCode: "ACC", at: "2026-10-10T11:00:00" },
              arrival: { iataCode: "LHR", at: "2026-10-10T16:00:00" },
              carrierCode: "AR",
            },
          ],
        },
      ],
    } as never,
    3
  )
  assert.equal(oneStop.stops, 1)
  assert.equal(oneStop.stopsLabel, "1 stop")

  // Ensure opaque blob is preserved on raw but not leaked into display price/label fields or analytics
  const rawBlob = {
    id: "5",
    price: "100000",
    flight_offer: { blob: "SECRET_OPAQUE" },
  } as never
  const d5 = normalizeFlightOffer(rawBlob, 4)
  assert.equal(
    (d5.raw as Record<string, unknown>).flight_offer !== undefined,
    true,
    "Raw must retain opaque blob internally"
  )
  const displaySummary = {
    price: d5.price,
    currency: d5.currency,
    airline: d5.airline,
    airportsLabel: d5.airportsLabel,
  }
  assert.equal(
    JSON.stringify(displaySummary).includes("SECRET_OPAQUE"),
    false,
    "Display summary must not serialize opaque blob"
  )
  // Analytics sanitization must drop opaque keys if leaked into props
  const polluted = sanitizeProps({
    flight_offer: "SECRET_OPAQUE",
    price: "100000",
  } as unknown as never)
  assert.equal(
    "flight_offer" in polluted,
    false,
    "Analytics must strip opaque blob keys"
  )
})

// ---------------------------------------------------------------------------
// Backend shape variants — search must render times/details for every
// documented card shape (flat snake_case, wrapped flight_offer, nested nodes)
// ---------------------------------------------------------------------------

test("normalize survives flat snake_case, wrapped, and nested backend shapes without inventing data", () => {
  const future = new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10)
  const req = toFlightSearchRequest(
    oneWayFlightSearchSchema.parse({
      origin: "LOS",
      destination: "LHR",
      departureDate: future,
      adults: 1,
      children: 0,
      infants: 0,
      cabin: "BUSINESS",
      trip_type: "one_way",
    })
  )
  assert.equal(
    "cabin" in req,
    false,
    "Cabin must ride per leg only (apidoc FlightSearchRequest has no top-level cabin)"
  )
  assert.equal(req.legs[0].cabin, "BUSINESS")

  // Flat snake_case "clean card"
  const flat = normalizeFlightOffer(
    {
      id: "flat-1",
      airline_name: "Air Peace",
      departure_at: "2026-10-10 08:30:00",
      arrival_at: "2026-10-10 10:15:00",
      origin: "LOS",
      destination: "ABV",
      duration: "1h 45m",
      stops: "0",
      total_price: "185000.00",
    } as never,
    0
  )
  assert.equal(flat.airline, "Air Peace")
  assert.equal(flat.departureAt, "08:30", "Must read snake_case departure_at")
  assert.equal(flat.arrivalAt, "10:15", "Must read snake_case arrival_at")
  assert.equal(flat.departureDate, "2026-10-10")
  assert.equal(flat.arrivalDayOffset, 0)
  assert.equal(flat.duration, "1h 45m")
  assert.equal(flat.price, "185000.00")
  assert.equal(
    flat.baggage,
    null,
    "Missing baggage must stay null — never fabricated"
  )
  assert.equal(
    flat.journeys.length,
    1,
    "Flat cards still expand a real timeline"
  )
  assert.equal(flat.journeys[0].segments[0].departureAt, "08:30")

  // Overnight flight: real dates derive the +1 offset
  const overnight = normalizeFlightOffer(
    {
      id: "flat-2",
      airline: "British Airways",
      departure_at: "2026-10-10T23:30:00",
      arrival_at: "2026-10-11T05:10:00",
    } as never,
    1
  )
  assert.equal(overnight.arrivalDayOffset, 1)

  // Wrapped flight_offer blob (opaque pass-through still renders)
  const wrapped = normalizeFlightOffer(
    {
      id: "wrap-1",
      total_amount: "500000",
      flight_offer: {
        itineraries: [
          {
            duration: "PT6H",
            segments: [
              {
                departure: { iataCode: "LOS", at: "2026-10-10T08:00:00" },
                arrival: { iataCode: "ACC", at: "2026-10-10T10:00:00" },
                carrierCode: "AR",
                flight_number: "AR123",
                cabin: "ECONOMY",
              },
            ],
          },
        ],
        validatingAirlineCodes: ["AR"],
      },
    } as never,
    2
  )
  assert.equal(wrapped.origin, "LOS")
  assert.equal(wrapped.destination, "ACC")
  assert.equal(wrapped.departureAt, "08:00", "Wrapped blobs must render times")
  assert.equal(wrapped.airline, "AR")
  assert.equal(wrapped.price, "500000")
  assert.equal(wrapped.journeys.length, 1)
  assert.equal(wrapped.journeys[0].segments[0].flightNumber, "AR123")

  // Amadeus baggage is surfaced only when the airline provides it
  const withBaggage = normalizeFlightOffer(
    {
      id: "bag-1",
      itineraries: [
        {
          segments: [
            {
              departure: { iataCode: "LOS", at: "2026-10-10T08:00:00" },
              arrival: { iataCode: "LHR", at: "2026-10-10T16:00:00" },
            },
          ],
        },
      ],
      travelerPricings: [
        {
          fareDetailsBySegment: [
            {
              includedCheckedBags: {
                quantity: 2,
                weight: 23,
                weightUnit: "KG",
              },
            },
          ],
        },
      ],
    } as never,
    3
  )
  assert.equal(withBaggage.baggage, "2 × 23kg checked")
})
