import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

// Ticket 16 — one Guest Booking form for Hotel and Car.
//
// The shared form owns the phase machine, the field map, validation,
// submission states, and the payment reassurance copy once; each book page
// supplies its booking-specific payload building, creation, session reuse
// keys, analytics, and vocabulary as data (lib/api/guest-booking.ts).
// These tests cover that seam at its pure functions for both booking types,
// plus the architecture facts the single-form contract rests on.

import {
  carGuestBooking,
  hotelGuestBooking,
  mapGuestFieldErrors,
  NEEDS_ATTENTION_COPY,
} from "../lib/api/guest-booking.ts"
import { guestContactSchema } from "../lib/api/validation.ts"

function futureDate(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function futureIso(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * 86400000).toISOString()
}

const GUEST = {
  guest_name: "  Adaeze Okonkwo  ",
  guest_email: "ADAEZE@EXAMPLE.COM",
  guest_phone: "0803 123 4567",
}

test("One guest contact schema serves Hotel and Car identically", () => {
  const parsed = guestContactSchema.safeParse(GUEST)
  assert.equal(
    parsed.success,
    true,
    "Hotel Guest / Vehicle guest contact must pass"
  )
  if (!parsed.success) return
  assert.equal(parsed.data.guest_name, "Adaeze Okonkwo")
  assert.equal(parsed.data.guest_email, "ADAEZE@EXAMPLE.COM")
  assert.equal(parsed.data.guest_phone, "+2348031234567")
})

test("Hotel Booking setup: capacity and date gates run before payment", () => {
  const setup = hotelGuestBooking({
    hotel: { id: 7, name: "Lagos Jewel", city: "Lagos" },
    room: { id: 11, max_guests: 2 },
    stay: {
      check_in: futureDate(14),
      check_out: futureDate(17),
      guests: 2,
      rooms: 1,
    },
  })

  // A valid stay passes the pre-payment gate.
  assert.equal(setup.booking.prePaymentIssue?.(), null)

  // Over-capacity parties are blocked with the guidance to add rooms.
  const crowded = hotelGuestBooking({
    hotel: { id: 7, name: "Lagos Jewel", city: "Lagos" },
    room: { id: 11, max_guests: 2 },
    stay: {
      check_in: futureDate(14),
      check_out: futureDate(17),
      guests: 5,
      rooms: 1,
    },
  })
  assert.match(
    crowded.booking.prePaymentIssue?.() ?? "",
    /add 2 more rooms/,
    "Over-capacity stays must be blocked before payment"
  )

  // An unusable stay length is blocked with the way back to the Hotel.
  const undated = hotelGuestBooking({
    hotel: { id: 7, name: "Lagos Jewel", city: "Lagos" },
    room: { id: 11, max_guests: 2 },
    stay: { check_in: "", check_out: "", guests: 2, rooms: 1 },
  })
  assert.equal(
    undated.booking.prePaymentIssue?.(),
    "Review your stay dates on the Hotel page, then continue."
  )
})

test("Hotel Booking payload: stay plus normalized Hotel Guest", () => {
  const setup = hotelGuestBooking({
    hotel: { id: 7, name: "Lagos Jewel", city: "Lagos" },
    room: { id: 11, max_guests: 2 },
    stay: {
      check_in: futureDate(14),
      check_out: futureDate(17),
      guests: 2,
      rooms: 1,
    },
  })

  const payload = setup.booking.buildPayload(GUEST) as Record<string, unknown>
  assert.equal(payload.hotel_id, 7)
  assert.equal(payload.room_type_id, 11)
  assert.equal(payload.num_guests, 2)
  assert.equal(payload.num_rooms, 1)
  assert.equal(payload.guest_name, "Adaeze Okonkwo")
  assert.equal(payload.guest_phone, "+2348031234567")
  assert.equal(payload.guest_email, "ADAEZE@EXAMPLE.COM")
})

test("Hotel Booking setup: reuse keys, funnel, and vocabulary", () => {
  const setup = hotelGuestBooking({
    hotel: { id: 7, name: "Lagos Jewel", city: "Lagos" },
    room: { id: 11, max_guests: 2 },
    stay: {
      check_in: futureDate(14),
      check_out: futureDate(17),
      guests: 2,
      rooms: 1,
    },
  })

  assert.equal(setup.booking.pendingSessionKey, "alphaa:pending-hotel-booking:v1")
  assert.equal(
    setup.booking.referenceSessionKey,
    "alphaa:hotel-payment-reference:v1"
  )
  assert.equal(setup.booking.analyticsEvent, "hotel_payment_initiated")
  assert.deepEqual(setup.booking.analyticsProps, { currency: "NGN", nights: 3 })

  assert.equal(setup.copy.heading, "Who is staying?")
  assert.equal(setup.copy.submitPendingLabel, "Reserving your stay…")
  assert.equal(setup.copy.backLabel, "Back to Hotel")
  assert.match(setup.copy.redirectBody, /Hotel Booking is reserved/)
  assert.match(setup.copy.ariaLabel, /Hotel Guest/)
  assert.match(setup.supportHref, /wa\.me/)
  assert.match(setup.supportHref, /Lagos/, "Stay context rides along (no PII)")
})

test("Car Booking payload: hire plus normalized guest contact", () => {
  const setup = carGuestBooking({
    vehicle: { id: 3, name: "Lagos Coaster" },
    hire: {
      pickup_location: "Ikeja Airport",
      dropoff_location: "Victoria Island",
      pickup_datetime: futureIso(1),
      num_hours: 5,
    },
  })

  const payload = setup.booking.buildPayload(GUEST) as Record<string, unknown>
  assert.equal(payload.vehicle_id, 3)
  assert.equal(payload.pickup_location, "Ikeja Airport")
  assert.equal(payload.num_hours, 5)
  assert.equal(payload.guest_name, "Adaeze Okonkwo")
  assert.equal(payload.guest_phone, "+2348031234567")

  // Hour counts still enforce the minimum: a zero-hour hire never builds.
  const zeroHours = carGuestBooking({
    vehicle: { id: 3, name: "Lagos Coaster" },
    hire: {
      pickup_location: "Ikeja Airport",
      dropoff_location: "Victoria Island",
      pickup_datetime: futureIso(1),
      num_hours: 0,
    },
  })
  assert.throws(
    () => zeroHours.booking.buildPayload(GUEST),
    "Hire cannot exceed/fall below the hour bounds"
  )
})

test("Car Booking setup: no stay-side gate, reuse keys, funnel, vocabulary", () => {
  const setup = carGuestBooking({
    vehicle: { id: 3, name: "Lagos Coaster" },
    hire: {
      pickup_location: "Ikeja Airport",
      dropoff_location: "Victoria Island",
      pickup_datetime: futureIso(1),
      num_hours: 5,
    },
  })

  // The hire was validated before the form rendered — no pre-payment gate.
  assert.equal(setup.booking.prePaymentIssue, undefined)

  assert.equal(setup.booking.pendingSessionKey, "alphaa:pending-car-booking:v1")
  assert.equal(
    setup.booking.referenceSessionKey,
    "alphaa:car-payment-reference:v1"
  )
  assert.equal(setup.booking.analyticsEvent, "car_payment_initiated")
  assert.deepEqual(setup.booking.analyticsProps, { currency: "NGN", hours: 5 })

  assert.equal(setup.copy.heading, "Who is hiring?")
  assert.equal(setup.copy.submitPendingLabel, "Reserving your car…")
  assert.equal(setup.copy.backLabel, "Back to vehicle")
  assert.match(setup.copy.redirectBody, /car booking is reserved/)
  assert.match(setup.supportHref, /wa\.me/)
  assert.match(
    setup.supportHref,
    /Ikeja%20Airport/,
    "Hire context rides along (no PII)"
  )
})

test("Field map: backend guest fields map inline, stay/hire fields do not", () => {
  const mapped = mapGuestFieldErrors({
    guest_phone: ["Enter a valid phone number so we can reach you"],
    email: ["Enter a valid email address"],
    room_type: ["Room Type no longer exists"],
  })

  assert.deepEqual(mapped, [
    { field: "guest_phone", message: "Enter a valid phone number so we can reach you" },
    { field: "guest_email", message: "Enter a valid email address" },
  ])

  // Empty message lists map to nothing — the alert owns those instead.
  assert.deepEqual(mapGuestFieldErrors({ guest_name: [] }), [])
})

test("One form owns the machine and the reassurance copy; the twins are gone", () => {
  const root = process.cwd()
  const formPath = path.join(root, "components", "shared", "guest-booking-form.tsx")
  assert.ok(fs.existsSync(formPath), "The shared form must exist")

  const form = fs.readFileSync(formPath, "utf-8")
  assert.match(
    form,
    /"idle" \| "creating" \| "redirecting" \| "failed"/,
    "One phase machine serves both booking types"
  )
  assert.match(
    form,
    /getPaymentSafetyCopy\(\)/,
    "The nothing-charged-on-failure reassurance renders on failure"
  )
  assert.match(
    form,
    /NEEDS_ATTENTION_COPY/,
    "The needs-attention error copy lives once, in the shared form"
  )

  assert.equal(
    NEEDS_ATTENTION_COPY,
    "Some details need attention before we can continue."
  )

  // The separate hotel and car forms are deleted.
  assert.equal(
    fs.existsSync(path.join(root, "components", "hotels", "hotel-guest-form.tsx")),
    false,
    "The Hotel form must be deleted"
  )
  assert.equal(
    fs.existsSync(path.join(root, "components", "cars", "car-guest-form.tsx")),
    false,
    "The Car form must be deleted"
  )

  // Both booking steps render the shared form.
  const hotelPage = fs.readFileSync(
    path.join(root, "app", "(checkout)", "hotels", "[slug]", "book", "page.tsx"),
    "utf-8"
  )
  assert.match(hotelPage, /GuestBookingForm/, "Hotel book page uses the shared form")
  assert.match(hotelPage, /kind="hotel"/)

  const carPage = fs.readFileSync(
    path.join(root, "app", "(checkout)", "cars", "[slug]", "book", "page.tsx"),
    "utf-8"
  )
  assert.match(carPage, /GuestBookingForm/, "Car book page uses the shared form")
  assert.match(carPage, /kind="car"/)
})
