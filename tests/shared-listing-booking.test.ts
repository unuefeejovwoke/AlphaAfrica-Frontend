import test from "node:test"
import assert from "node:assert/strict"

// Tickets 12 + 15 — the shared listing, booking-session and pagination
// modules are the single home for this logic. These tests exercise that
// single implementation directly; the Hotel and Car domain tests exercise
// the parts of it their flows actually use.

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
  stableStringify,
} from "../lib/api/shared.ts"

test("pagination derives total pages and honest last-page ranges", () => {
  assert.deepEqual(
    getPagination({ page: 3, totalCount: 25, pageSize: 10, visibleCount: 5 }),
    { totalPages: 3, start: 21, end: 25 }
  )
  assert.deepEqual(
    getPagination({ page: 1, totalCount: 30, pageSize: 10, visibleCount: 10 }),
    { totalPages: 3, start: 1, end: 10 }
  )
  // Empty page reports no range, never a fabricated one.
  assert.deepEqual(
    getPagination({ page: 1, totalCount: 0, pageSize: 10, visibleCount: 0 }),
    { totalPages: 0, start: 0, end: 0 }
  )
})

test("page-item windows ellipsis for long runs and list all for short ones", () => {
  assert.deepEqual(getPageItems(1, 0), [])
  assert.deepEqual(getPageItems(2, 5), [1, 2, 3, 4, 5])
  assert.deepEqual(getPageItems(1, 10), [1, 2, "ellipsis", 10])
  assert.deepEqual(getPageItems(10, 10), [1, "ellipsis", 9, 10])
})

test("creation envelopes normalize flat and { booking, payment } shapes", () => {
  assert.deepEqual(
    normalizeBookingCreateResult({
      reference: "R1",
      authorization_url: "https://pay.test/1",
    }),
    { reference: "R1", authorization_url: "https://pay.test/1" }
  )
  assert.deepEqual(
    normalizeBookingCreateResult({
      booking: { reference: "R2", status: "pending" },
      payment: { reference: "R2", authorization_url: "https://pay.test/2" },
    }),
    { reference: "R2", authorization_url: "https://pay.test/2" }
  )
  // Neither shape without both halves is usable — never redirect broken.
  assert.equal(
    normalizeBookingCreateResult({ booking: { reference: "X" } }),
    null
  )
  assert.equal(normalizeBookingCreateResult({}), null)
  assert.equal(normalizeBookingCreateResult(null), null)
})

test("reuse identity is a key-order-normalized digest, never the payload", () => {
  const payload = {
    guest_name: "Ada Okafor",
    guest_email: "ada@example.com",
    guest_phone: "+2348012345678",
    num_hours: 5,
  }
  const reordered = {
    num_hours: 5,
    guest_phone: "+2348012345678",
    guest_email: "ada@example.com",
    guest_name: "Ada Okafor",
  }
  assert.equal(hashPayloadKey(payload), hashPayloadKey(reordered))
  const key = hashPayloadKey(payload)
  assert.match(key, /^[0-9a-f]{16}$/)
  assert.equal(key.includes("ada@example.com"), false)
  assert.equal(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}')

  const stored = {
    key,
    reference: "REF-1",
    authorization_url: "https://pay.test/x",
  }
  assert.deepEqual(findReusableBookingRecord(stored, key), {
    reference: "REF-1",
    authorization_url: "https://pay.test/x",
  })
  assert.equal(findReusableBookingRecord(stored, "other"), null)
  assert.equal(findReusableBookingRecord(null, key), null)
  assert.equal(
    findReusableBookingRecord({ ...stored, reference: "" }, key),
    null
  )
})

test("listing params parse bounded values and drop the invalid", () => {
  assert.equal(
    hasListingSearchParams({ destination: "Lagos" }, ["destination"]),
    true
  )
  assert.equal(hasListingSearchParams({}, ["destination"]), false)
  assert.equal(
    hasListingSearchParams({ destination: "  " }, ["destination"]),
    false
  )
  assert.equal(
    countActiveFilters({ max_price: 100000, min_stars: 4, ordering: "price" }),
    3
  )
  assert.equal(countActiveFilters({}), 0)
  assert.equal(parseBoundedInt("3", 1, 5), 3)
  assert.equal(parseBoundedInt("0", 1), undefined)
  assert.equal(parseBoundedInt("abc", 1), undefined)
  assert.equal(parsePriceCeiling("150,000", 100_000_000), 150000)
  assert.equal(parsePriceCeiling("-5", 100_000_000), undefined)
  assert.equal(parsePriceCeiling("999999999", 100_000_000), undefined)
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

test("session helpers degrade gracefully without a window", () => {
  saveSessionRecord("alphaa:no-window:v1", {
    key: "d",
    reference: "R",
    authorization_url: "u",
  })
  assert.equal(readSessionRecord("alphaa:no-window:v1"), null)
  assert.equal(readSessionString("alphaa:no-window:v1"), null)
})

test("featured selection slices and slug listing maps", () => {
  const rows = [{ slug: "a" }, { slug: "b" }, { slug: "c" }, { slug: "d" }]
  assert.deepEqual(selectFeaturedItems(rows, 3).length, 3)
  assert.deepEqual(selectFeaturedItems(rows, 0).length, 1)
  assert.deepEqual(selectFeaturedItems([], 3), [])
  assert.deepEqual(extractSlugs(rows), ["a", "b", "c", "d"])
})
