import test from "node:test"
import assert from "node:assert/strict"
import {
  buildCarHireParams,
  buildCarSearchParams,
  carHireSchema,
  combinePickupDateTime,
  countActiveCarFilters,
  findReusableCarBooking,
  formatCarHourlyRate,
  getCarPageItems,
  getCarPagination,
  hashCarBookingKey,
  normalizeCarBookingCreateResult,
  parseCarHireParams,
  parseCarSearchParams,
  previewHireTotal,
  resolveCarVerificationState,
  toVehicleCardDisplay,
} from "../lib/api/cars.ts"

// --- pricing display: hourly only, null on unusable ---

test("formatCarHourlyRate locks ₦X/hr copy, null on bad input", () => {
  assert.equal(formatCarHourlyRate("25000.00"), "₦25,000/hr")
  assert.equal(formatCarHourlyRate(null), null)
  assert.equal(formatCarHourlyRate("0.00"), null)
  assert.equal(formatCarHourlyRate("abc"), null)
})

test("previewHireTotal multiplies rate × hours, null on bad input", () => {
  assert.equal(
    previewHireTotal({ hourlyRate: "25000.00", numHours: 5 }),
    125000
  )
  assert.equal(previewHireTotal({ hourlyRate: "0", numHours: 5 }), null)
  assert.equal(previewHireTotal({ hourlyRate: "25000", numHours: 0 }), null)
})

// --- URL state round-trip ---

test("car search params parse/build round-trips", () => {
  const query = parseCarSearchParams({
    vehicle_type: "suv_executive",
    max_rate: "150000",
    ordering: "-rate",
    page: "2",
  })
  assert.equal(query.vehicle_type, "suv_executive")
  assert.equal(query.max_rate, 150000)
  assert.equal(query.ordering, "-rate")
  assert.equal(query.page, 2)
  const params = buildCarSearchParams(query)
  assert.match(params, /vehicle_type=suv_executive/)
  assert.match(params, /max_rate=150000/)
})

test("car search drops invalid filters, never throws", () => {
  const query = parseCarSearchParams({
    vehicle_type: "spaceship",
    max_rate: "-5",
    ordering: "bogus",
    page: "0",
  })
  assert.equal(query.vehicle_type, undefined)
  assert.equal(query.max_rate, undefined)
  assert.equal(query.ordering, undefined)
  assert.equal(query.page, 1)
})

// --- hire datetime ---

test("combinePickupDateTime rejects past and impossible pairs", () => {
  const future = combinePickupDateTime("2999-01-15", "09:30")
  assert.ok(future?.endsWith("T09:30:00.000Z"))
  assert.equal(combinePickupDateTime("2020-01-01", "09:00"), null)
  assert.equal(combinePickupDateTime("2026-02-30", "09:00"), null)
  assert.equal(combinePickupDateTime("2999-01-15", "25:00"), null)
})

test("hire handoff carries trip only, hours bounded 1–720", () => {
  const stay = parseCarHireParams({
    pickup_location: "Airport",
    dropoff_location: "Hotel",
    pickup_date: "2999-01-15",
    pickup_time: "09:30",
    num_hours: "5",
  })
  assert.equal(stay.num_hours, 5)
  assert.equal(parseCarHireParams({ num_hours: "0" }).num_hours, undefined)
  const params = buildCarHireParams({
    pickup_location: "Airport",
    dropoff_location: "Hotel",
    pickup_date: "2999-01-15",
    pickup_time: "09:30",
    num_hours: 5,
  })
  assert.match(params, /num_hours=5/)
})

test("carHireSchema enforces locations + hours", () => {
  const parsed = carHireSchema.safeParse({
    pickup_location: "MM Airport, Lagos",
    dropoff_location: "Eko Hotel",
    pickup_date: "2999-01-15",
    pickup_time: "09:30",
    num_hours: 5,
  })
  assert.equal(parsed.success, true)
  const bad = carHireSchema.safeParse({
    pickup_location: "a",
    dropoff_location: "",
    pickup_date: "bad",
    pickup_time: "bad",
    num_hours: 0,
  })
  assert.equal(bad.success, false)
})

// --- cards ---

test("vehicle card links to /cars and never invents prices", () => {
  const display = toVehicleCardDisplay({
    id: 1,
    name: "Toyota Camry 2022",
    slug: "toyota-camry-2022",
    vehicle_type: "sedan_executive",
    vehicle_type_display: "Sedan Executive",
    hourly_rate: "25000.00",
    capacity: 4,
    city: "Abuja",
    main_image: "",
  })
  assert.equal(display.href, "/cars/toyota-camry-2022")
  assert.equal(display.priceLabel, "₦25,000/hr")
  const noPrice = toVehicleCardDisplay({
    id: 2,
    name: "Van",
    slug: "van",
    vehicle_type: "others",
    vehicle_type_display: "",
    hourly_rate: "0.00",
    capacity: 0,
    city: "",
    main_image: "",
  })
  assert.equal(noPrice.priceLabel, null)
  assert.equal(noPrice.capacityLabel, null)
})

// --- creation envelope + dedupe ---

test("normalizeCarBookingCreateResult accepts flat and envelope shapes", () => {
  const flat = normalizeCarBookingCreateResult({
    reference: "ALPHAA-1",
    authorization_url: "https://paystack.test/x",
  })
  assert.deepEqual(flat, {
    reference: "ALPHAA-1",
    authorization_url: "https://paystack.test/x",
  })
  const envelope = normalizeCarBookingCreateResult({
    booking: { reference: "ALPHAA-2" },
    payment: {
      reference: "ALPHAA-2",
      authorization_url: "https://paystack.test/y",
    },
  })
  assert.deepEqual(envelope, {
    reference: "ALPHAA-2",
    authorization_url: "https://paystack.test/y",
  })
  assert.equal(normalizeCarBookingCreateResult({ nope: true }), null)
})

test("identical car payload reuses pending reference, changed payload does not", () => {
  const payload = {
    vehicle_id: 1,
    pickup_location: "Airport",
    dropoff_location: "Hotel",
    pickup_datetime: "2999-01-15T09:30:00.000Z",
    num_hours: 5,
    guest_name: "Ada Okafor",
    guest_email: "ada@example.com",
    guest_phone: "+2348012345678",
  }
  const key = hashCarBookingKey(payload)
  const stored = {
    key,
    reference: "ALPHAA-9",
    authorization_url: "https://paystack.test/z",
  }
  assert.deepEqual(findReusableCarBooking(stored, key), {
    reference: "ALPHAA-9",
    authorization_url: "https://paystack.test/z",
  })
  assert.equal(findReusableCarBooking(stored, "other"), null)
})

test("car verification resolves unknown states to pending", () => {
  assert.equal(
    resolveCarVerificationState({ status: "confirmed" }),
    "confirmed"
  )
  assert.equal(resolveCarVerificationState({ status: "weird" }), "pending")
  assert.equal(resolveCarVerificationState({}), "pending")
})

// --- sidebar listing: active-filter count ---

test("countActiveCarFilters counts type + rate + sort groups", () => {
  assert.equal(countActiveCarFilters({}), 0)
  assert.equal(countActiveCarFilters({ vehicle_type: "coaster" }), 1)
  assert.equal(
    countActiveCarFilters({ vehicle_type: "coaster", max_rate: 50000 }),
    2
  )
  assert.equal(
    countActiveCarFilters({
      vehicle_type: "coaster",
      max_rate: 50000,
      ordering: "rate",
    }),
    3
  )
})

// --- numbered pagination: honest ranges over count/next/previous shapes ---

test("getCarPagination derives total pages and honest last-page ranges", () => {
  assert.deepEqual(
    getCarPagination({
      page: 1,
      totalCount: 25,
      pageSize: 10,
      visibleCount: 10,
    }),
    { totalPages: 3, start: 1, end: 10 }
  )
  // Last page never reads `21–30 of 25`.
  assert.deepEqual(
    getCarPagination({
      page: 3,
      totalCount: 25,
      pageSize: 10,
      visibleCount: 5,
    }),
    { totalPages: 3, start: 21, end: 25 }
  )
  assert.deepEqual(
    getCarPagination({ page: 1, totalCount: 0, pageSize: 10, visibleCount: 0 }),
    { totalPages: 0, start: 0, end: 0 }
  )
  assert.deepEqual(
    getCarPagination({ page: 1, totalCount: 4, pageSize: 10, visibleCount: 4 }),
    { totalPages: 1, start: 1, end: 4 }
  )
})

test("getCarPageItems windows with ellipsis, all pages when few", () => {
  assert.deepEqual(getCarPageItems(1, 0), [])
  assert.deepEqual(getCarPageItems(2, 5), [1, 2, 3, 4, 5])
  assert.deepEqual(getCarPageItems(1, 10), [1, 2, "ellipsis", 10])
  assert.deepEqual(getCarPageItems(5, 10), [
    1,
    "ellipsis",
    4,
    5,
    6,
    "ellipsis",
    10,
  ])
  assert.deepEqual(getCarPageItems(10, 10), [1, "ellipsis", 9, 10])
})
