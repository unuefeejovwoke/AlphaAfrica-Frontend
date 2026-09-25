import test from "node:test"
import assert from "node:assert/strict"

// Ticket 04 — Room Type choice with capacity and price preview.
//
// Pre-agreed seams (spec Testing Decisions):
//  - capacity rule covering exact-fit, over-capacity, multi-room scaling,
//    and zero-capacity passthrough;
//  - nights calculation plus preview-total arithmetic covering same-day
//    rejection, multi-night spans, and room multipliers.
//
// Vertical tracer slices: one failing test, then minimal implementation.

import {
  buildHotelBookingParams,
  calculateNights,
  checkRoomCapacity,
  parseHotelBookingParams,
  previewStayTotal,
} from "../lib/api/hotels.ts"

function futureDate(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

test("Capacity rule: exact fit passes, over-capacity guides, multi-room scales", () => {
  // Exact fit: 2 guests in a 2-cap room passes.
  assert.deepEqual(checkRoomCapacity({ maxGuests: 2, numGuests: 2, numRooms: 1 }), {
    ok: true,
    capacity: 2,
  })

  // Over-capacity: 5 guests, cap 2, 2 rooms (capacity 4) fails with guidance.
  const over = checkRoomCapacity({ maxGuests: 2, numGuests: 5, numRooms: 2 })
  assert.equal(over.ok, false)
  if (!over.ok) {
    assert.equal(over.capacity, 4)
    assert.equal(over.shortBy, 1)
    assert.equal(
      over.guidance,
      "Only 4 guests fit in 2 rooms of this Room Type — add 1 more room or choose a Room Type that sleeps more."
    )
  }

  // Multi-room scaling: the same party fits in 3 rooms.
  assert.deepEqual(checkRoomCapacity({ maxGuests: 2, numGuests: 5, numRooms: 3 }), {
    ok: true,
    capacity: 6,
  })
})

test("Capacity rule: zero-capacity data rows never block booking", () => {
  const passthrough = checkRoomCapacity({
    maxGuests: 0,
    numGuests: 9,
    numRooms: 1,
  })
  assert.deepEqual(passthrough, { ok: true, capacity: null })
})

test("Nights: multi-night spans count, same-day and impossible stays reject", () => {
  assert.equal(calculateNights(futureDate(14), futureDate(17)), 3)
  assert.equal(calculateNights(futureDate(14), futureDate(15)), 1)
  // Same-day checkout is not a stay.
  assert.equal(calculateNights(futureDate(14), futureDate(14)), null)
  // Backwards dates are not a stay.
  assert.equal(calculateNights(futureDate(17), futureDate(14)), null)
  // Impossible calendar dates are not a stay.
  assert.equal(calculateNights("2026-02-30", futureDate(20)), null)
  assert.equal(calculateNights("", ""), null)
})

test("Preview total: nights times per-night price times rooms; backend owns the charge", () => {
  // ₦85,000 × 3 nights × 2 rooms = ₦510,000 preview.
  assert.equal(
    previewStayTotal({ pricePerNight: "85000.00", nights: 3, numRooms: 2 }),
    510000
  )
  assert.equal(
    previewStayTotal({ pricePerNight: "85000.00", nights: 1, numRooms: 1 }),
    85000
  )
  // Unusable prices and non-stays yield no preview (never ₦0).
  assert.equal(
    previewStayTotal({ pricePerNight: "0.00", nights: 3, numRooms: 2 }),
    null
  )
  assert.equal(
    previewStayTotal({ pricePerNight: "", nights: 3, numRooms: 2 }),
    null
  )
  assert.equal(
    previewStayTotal({ pricePerNight: "85000.00", nights: 0, numRooms: 2 }),
    null
  )
})

test("Booking stay params: room choice plus dates plus party survive the handoff", () => {
  const params = buildHotelBookingParams({
    room_type_id: 11,
    check_in: futureDate(14),
    check_out: futureDate(17),
    guests: 2,
    rooms: 1,
  })
  const parsed = parseHotelBookingParams(
    Object.fromEntries(new URLSearchParams(params).entries())
  )
  assert.equal(parsed.room_type_id, 11)
  assert.equal(parsed.guests, 2)
  assert.equal(parsed.rooms, 1)

  // Invalid room ids never travel (no phantom Room Type on the next step).
  const bad = parseHotelBookingParams({ room_type: "abc" })
  assert.equal(bad.room_type_id, undefined)
})
