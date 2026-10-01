import test from "node:test"
import assert from "node:assert/strict"

// Ticket 05 — Hotel Guest form with creation and Paystack redirect.
//
// Pre-agreed seam (spec Testing Decisions): booking payload building
// covering full-name shape, email validity, and Nigerian phone
// normalization. The single-flight creation guard (identical retries reuse
// the stored reference) is the same seam at the handoff boundary.
//
// Vertical tracer slices: one failing test, then minimal implementation.

import {
  buildHotelBookingPayload,
  findReusableHotelBooking,
  hashHotelBookingKey,
  hotelGuestSchema,
} from "../lib/api/hotels.ts"

function futureDate(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

test("Hotel Guest shape: single full name plus email plus normalized NG phone", () => {
  const parsed = hotelGuestSchema.safeParse({
    guest_name: "Adaeze Okonkwo",
    guest_email: "adaeze@example.com",
    guest_phone: "0803 123 4567",
  })
  assert.equal(parsed.success, true, "Valid Hotel Guest must pass")
  if (!parsed.success) return
  assert.equal(parsed.data.guest_name, "Adaeze Okonkwo")
  assert.equal(parsed.data.guest_email, "adaeze@example.com")
  assert.equal(parsed.data.guest_phone, "+2348031234567")

  // International format normalizes without a country-code guess.
  const intl = hotelGuestSchema.safeParse({
    guest_name: "Adaeze Okonkwo",
    guest_email: "adaeze@example.com",
    guest_phone: "+1 415 555 2671",
  })
  assert.equal(intl.success, true)
  if (intl.success) assert.equal(intl.data.guest_phone, "+14155552671")

  // Letters in the phone never pass, however plausible the rest is.
  const letters = hotelGuestSchema.safeParse({
    guest_name: "Adaeze Okonkwo",
    guest_email: "adaeze@example.com",
    guest_phone: "0803-CALL-NOW",
  })
  assert.equal(letters.success, false, "Phone numbers cannot contain letters")

  // A bad email fails even with a perfect name and phone.
  const badEmail = hotelGuestSchema.safeParse({
    guest_name: "Adaeze Okonkwo",
    guest_email: "not-an-email",
    guest_phone: "08031234567",
  })
  assert.equal(badEmail.success, false, "Invalid email must fail")
})

test("Booking payload: Hotel plus Room Type plus stay plus Hotel Guest", () => {
  const payload = buildHotelBookingPayload({
    hotel_id: 7,
    room_type_id: 11,
    check_in: futureDate(14),
    check_out: futureDate(17),
    num_rooms: 2,
    num_guests: 3,
    guest_name: "  Adaeze Okonkwo  ",
    guest_email: "ADAEZE@EXAMPLE.COM",
    guest_phone: "2348031234567",
  })
  assert.equal(payload.hotel_id, 7)
  assert.equal(payload.room_type_id, 11)
  assert.equal(payload.num_rooms, 2)
  assert.equal(payload.num_guests, 3)
  assert.equal(payload.guest_name, "Adaeze Okonkwo")
  assert.equal(payload.guest_phone, "+2348031234567")
  // Email trims; case is preserved for the backend (never lowercased here).
  assert.equal(payload.guest_email, "ADAEZE@EXAMPLE.COM")
})

test("Creation guard: identical retries reuse the reference, new stays create", () => {
  const key = hashHotelBookingKey({
    hotel_id: 7,
    room_type_id: 11,
    check_in: "2026-05-01",
    check_out: "2026-05-04",
    num_rooms: 1,
    num_guests: 2,
    guest_name: "Adaeze Okonkwo",
    guest_email: "adaeze@example.com",
    guest_phone: "+2348031234567",
  })
  assert.match(key, /^[0-9a-f]{16}$/, "The stored key must be a hex digest")
  assert.equal(
    key.includes("adaeze@example.com"),
    false,
    "The digest must not leak readable guest contact data"
  )
  const stored = {
    key,
    reference: "HOTEL-ABC123",
    authorization_url: "https://paystack.test/pay/abc123",
  }

  // Identical retry reuses — no duplicate Hotel Booking is created.
  assert.deepEqual(findReusableHotelBooking(stored, key), {
    reference: "HOTEL-ABC123",
    authorization_url: "https://paystack.test/pay/abc123",
  })

  // A changed stay (one more guest) is a new booking, never a reuse.
  const changedKey = hashHotelBookingKey({
    hotel_id: 7,
    room_type_id: 11,
    check_in: "2026-05-01",
    check_out: "2026-05-04",
    num_rooms: 1,
    num_guests: 3,
    guest_name: "Adaeze Okonkwo",
    guest_email: "adaeze@example.com",
    guest_phone: "+2348031234567",
  })
  assert.equal(
    findReusableHotelBooking(stored, changedKey),
    null,
    "Changed stays must create, never reuse"
  )

  // Corrupt storage never blocks a fresh creation.
  assert.equal(findReusableHotelBooking(null, key), null)
})
