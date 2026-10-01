import test from "node:test"
import assert from "node:assert/strict"

// Ticket 12 (expand) — the shared listing/booking-session/pagination
// modules beside the existing code. No production component imports them
// yet; this suite pins shared-vs-domain parity so the migrate tickets can
// rewire call sites without changing behaviour.

import {
  countActiveHotelFilters,
  findReusableHotelBooking,
  getHotelPageItems,
  getHotelPagination,
  hashHotelBookingKey,
  hasHotelSearchParams,
  normalizeHotelBookingCreateResult,
  HOTEL_SEARCH_PARAM_KEYS,
} from "../lib/api/hotels.ts"
import {
  countActiveCarFilters,
  findReusableCarBooking,
  getCarPageItems,
  getCarPagination,
  hashCarBookingKey,
  hasCarSearchParams,
  normalizeCarBookingCreateResult,
  CAR_SEARCH_PARAM_KEYS,
} from "../lib/api/cars.ts"
import {
  countActiveFilters,
  extractSlugs,
  findReusableBookingRecord,
  getPageItems,
  getPagination,
  hashPayloadKey,
  hasListingSearchParams,
  normalizeBookingCreateResult,
  parseBoundedInt,
  parseOrderingValue,
  parsePriceCeiling,
  readSessionRecord,
  readSessionString,
  clearSessionRecord,
  saveSessionRecord,
  saveSessionString,
  selectFeaturedItems,
} from "../lib/api/shared.ts"

test("pagination ranges match both domains, including honest last pages", () => {
  const inputs = [
    { page: 1, totalCount: 30, pageSize: 10, visibleCount: 10 },
    { page: 3, totalCount: 25, pageSize: 10, visibleCount: 5 },
    { page: 1, totalCount: 0, pageSize: 10, visibleCount: 0 },
  ]
  for (const input of inputs) {
    assert.deepEqual(getPagination(input), getHotelPagination(input))
    assert.deepEqual(getPagination(input), getCarPagination(input))
  }
  assert.deepEqual(getPagination(inputs[1]), {
    totalPages: 3,
    start: 21,
    end: 25,
  })
})

test("page-item windows match both domains", () => {
  for (const [page, total] of [
    [2, 5],
    [1, 10],
    [5, 10],
    [10, 10],
  ] as const) {
    assert.deepEqual(getPageItems(page, total), getHotelPageItems(page, total))
    assert.deepEqual(getPageItems(page, total), getCarPageItems(page, total))
  }
  assert.deepEqual(getPageItems(1, 0), [])
})

test("creation envelopes normalize like both domains", () => {
  const shapes: unknown[] = [
    { reference: "R1", authorization_url: "https://pay.test/1" },
    {
      booking: { reference: "R2", status: "pending" },
      payment: { reference: "R2", authorization_url: "https://pay.test/2" },
    },
    { booking: { reference: "X" } },
    {},
    null,
  ]
  for (const raw of shapes) {
    assert.deepEqual(
      normalizeBookingCreateResult(raw),
      normalizeHotelBookingCreateResult(raw)
    )
    assert.deepEqual(
      normalizeBookingCreateResult(raw),
      normalizeCarBookingCreateResult(raw)
    )
  }
})

test("one digest helper covers both reuse keys, leaking no guest data", () => {
  const hotelPayload = {
    hotel_id: 1,
    room_type_id: 2,
    check_in: "2999-01-15",
    check_out: "2999-01-17",
    num_rooms: 1,
    num_guests: 2,
    guest_name: "Ada Okafor",
    guest_email: "ada@example.com",
    guest_phone: "+2348012345678",
  }
  const carPayload = {
    vehicle_id: 1,
    pickup_location: "Airport",
    dropoff_location: "Hotel",
    pickup_datetime: "2999-01-15T09:30:00.000Z",
    num_hours: 5,
    guest_name: "Ada Okafor",
    guest_email: "ada@example.com",
    guest_phone: "+2348012345678",
  }
  assert.equal(hashPayloadKey(hotelPayload), hashHotelBookingKey(hotelPayload))
  assert.equal(hashPayloadKey(carPayload), hashCarBookingKey(carPayload))
  for (const key of [hashPayloadKey(hotelPayload), hashPayloadKey(carPayload)]) {
    assert.match(key, /^[0-9a-f]{16}$/)
    assert.equal(key.includes("ada@example.com"), false)
  }
  const stored = {
    key: hashPayloadKey(carPayload),
    reference: "REF-1",
    authorization_url: "https://pay.test/x",
  }
  assert.deepEqual(findReusableBookingRecord(stored, stored.key), {
    reference: "REF-1",
    authorization_url: "https://pay.test/x",
  })
  assert.deepEqual(
    findReusableBookingRecord(stored, stored.key),
    findReusableCarBooking(stored, stored.key)
  )
  assert.deepEqual(
    findReusableBookingRecord(stored, stored.key),
    findReusableHotelBooking(stored, stored.key)
  )
  assert.equal(findReusableBookingRecord(stored, "other"), null)
  assert.equal(findReusableBookingRecord(null, stored.key), null)
})

test("listing params match both domains and drop invalid values", () => {
  assert.equal(
    hasListingSearchParams({ destination: "Lagos" }, HOTEL_SEARCH_PARAM_KEYS),
    hasHotelSearchParams({ destination: "Lagos" })
  )
  assert.equal(
    hasListingSearchParams({ max_rate: "50000" }, CAR_SEARCH_PARAM_KEYS),
    hasCarSearchParams({ max_rate: "50000" })
  )
  assert.equal(hasListingSearchParams({}, HOTEL_SEARCH_PARAM_KEYS), false)
  assert.equal(
    countActiveFilters({ max_price: 100000, min_stars: 4, ordering: "price" }),
    countActiveHotelFilters({
      max_price: 100000,
      min_stars: 4,
      ordering: "price",
    })
  )
  assert.equal(
    countActiveFilters({ vehicle_type: "coaster", max_rate: 50000 }),
    countActiveCarFilters({ vehicle_type: "coaster", max_rate: 50000 })
  )
  assert.equal(parseBoundedInt("3", 1, 5), 3)
  assert.equal(parseBoundedInt("0", 1), undefined)
  assert.equal(parsePriceCeiling("150,000", 100_000_000), 150000)
  assert.equal(parsePriceCeiling("-5", 100_000_000), undefined)
  assert.equal(parseOrderingValue("price", ["price", "name"] as const), "price")
  assert.equal(
    parseOrderingValue("bogus", ["price", "name"] as const),
    undefined
  )
})

test("session records round-trip, reject corruption, and clear", () => {
  const backing = new Map<string, string>()
  ;(globalThis as { window?: unknown }).window = {
    sessionStorage: {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => void backing.set(key, value),
      removeItem: (key: string) => void backing.delete(key),
    },
  }
  try {
    const key = "alphaa:test-record:v1"
    assert.equal(readSessionRecord(key), null)
    saveSessionRecord(key, {
      key: "digest",
      reference: "REF-9",
      authorization_url: "https://pay.test/9",
    })
    assert.deepEqual(readSessionRecord(key), {
      key: "digest",
      reference: "REF-9",
      authorization_url: "https://pay.test/9",
    })
    backing.set(key, "{corrupt")
    assert.equal(readSessionRecord(key), null)
    backing.set(key, JSON.stringify({ key: "digest" }))
    assert.equal(readSessionRecord(key), null)
    saveSessionString("alphaa:test-string:v1", "PAY-REF")
    assert.equal(readSessionString("alphaa:test-string:v1"), "PAY-REF")
    clearSessionRecord(key)
    assert.equal(readSessionRecord(key), null)
  } finally {
    delete (globalThis as { window?: unknown }).window
  }
})

test("featured selection slices and slug listing maps", () => {
  const rows = [{ slug: "a" }, { slug: "b" }, { slug: "c" }, { slug: "d" }]
  assert.deepEqual(selectFeaturedItems(rows, 3).length, 3)
  assert.deepEqual(selectFeaturedItems(rows, 0).length, 1)
  assert.deepEqual(selectFeaturedItems([], 3), [])
  assert.deepEqual(extractSlugs(rows), ["a", "b", "c", "d"])
})
