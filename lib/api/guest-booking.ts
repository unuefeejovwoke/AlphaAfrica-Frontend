import type { AnalyticsEvent, AnalyticsProps } from "../analytics.ts"
import type { BookingCreateResult } from "./shared.ts"
import {
  buildCarBookingPayload,
  createCarBooking,
  getCarSupportWhatsAppUrl,
  CAR_PAYMENT_REFERENCE_SESSION_KEY,
  PENDING_CAR_BOOKING_SESSION_KEY,
  type VehicleDetail,
} from "./cars.ts"
import {
  buildHotelBookingPayload,
  calculateNights,
  checkRoomCapacity,
  createHotelBooking,
  getHotelSupportWhatsAppUrl,
  HOTEL_PAYMENT_REFERENCE_SESSION_KEY,
  PENDING_HOTEL_BOOKING_SESSION_KEY,
  type RoomType,
} from "./hotels.ts"
import type { GuestContactInput } from "./validation.ts"

/**
 * The booking-specific seam behind the one shared Guest Booking form
 * (production hardening, ticket 16).
 *
 * Hotel and Car share a single form component
 * (`components/shared/guest-booking-form.tsx`): one phase machine, one field
 * set, one validation and error-handling path, one payment reassurance
 * voice. What differs per booking type — payload building, creation,
 * session reuse keys, analytics, the final pre-payment gate, and the
 * customer-facing vocabulary — is supplied to that form as the plain data
 * built here, instead of living in two drifting form copies.
 *
 * The book pages are server components, so this seam is pure over
 * serializable inputs: the page passes the stay/hire data, and the form
 * resolves its adapter from it. No HTTP runs here — creation delegates to
 * the domain modules, which own their endpoints and error copy.
 */

/** Server-side message that maps to no single field — review and retry. */
export const NEEDS_ATTENTION_COPY =
  "Some details need attention before we can continue."

/** Guest contact fields the shared form owns. */
export type GuestContactField = "guest_name" | "guest_email" | "guest_phone"

/**
 * Backend field names that map onto guest contact inputs; stay- or
 * hire-level fields surface as the form-level alert with a way back instead.
 */
const GUEST_FIELD_MAP: Record<string, GuestContactField> = {
  guest_name: "guest_name",
  guest_email: "guest_email",
  guest_phone: "guest_phone",
  phone: "guest_phone",
  email: "guest_email",
  name: "guest_name",
}

/**
 * Map backend field errors onto guest contact fields in backend order.
 * Unmapped fields and empty message lists are dropped — they belong to the
 * form-level alert, not an input.
 */
export function mapGuestFieldErrors(
  fieldErrors: Record<string, string[]>
): { field: GuestContactField; message: string }[] {
  const mapped: { field: GuestContactField; message: string }[] = []
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const target = GUEST_FIELD_MAP[field]
    if (target && messages.length > 0) {
      mapped.push({ field: target, message: messages[0] })
    }
  }
  return mapped
}

/** Per-booking vocabulary the shared form renders verbatim. */
export interface GuestBookingCopy {
  /** Accessible name of the form element. */
  ariaLabel: string
  heading: string
  intro: string
  /** Phone helper text naming this booking's contact role. */
  phoneHelperText: string
  /** Submit label while creation runs. */
  submitPendingLabel: string
  backLabel: string
  /** Status copy on the Paystack handoff screen. */
  redirectBody: string
}

/**
 * The booking-specific behaviour supplied to the shared form. The payload
 * is opaque between {@link GuestBookingMachine.buildPayload} and
 * {@link GuestBookingMachine.createBooking} (and is digested for reuse
 * identity), so adapters keep their concrete payload types internally.
 */
export interface GuestBookingMachine {
  /** Build the creation payload from validated guest contact values. */
  buildPayload(values: GuestContactInput): object
  /** Create the booking from a payload this machine's buildPayload built. */
  createBooking(payload: object): Promise<BookingCreateResult>
  /** Stored-creation session key for identical-retry reuse. */
  pendingSessionKey: string
  /** Payment Reference persistence key (refresh/back survival). */
  referenceSessionKey: string
  /** Allowlisted payment-initiated event with coarse funnel props. */
  analyticsEvent: AnalyticsEvent
  analyticsProps: AnalyticsProps
  /**
   * Final pre-payment gate: return the customer-safe message that must
   * block payment, or null to proceed. Absent when the booking step was
   * already validated before the form rendered.
   */
  prePaymentIssue?(): string | null
}

/** Serializable Hotel Booking inputs the book page passes down. */
export interface HotelGuestBookingData {
  hotel: { id: number; name: string; city: string }
  room: Pick<RoomType, "id" | "max_guests">
  stay: { check_in: string; check_out: string; guests: number; rooms: number }
}

/** Serializable Car Booking inputs the book page passes down. */
export interface CarGuestBookingData {
  vehicle: Pick<VehicleDetail, "id" | "name">
  hire: {
    pickup_location: string
    dropoff_location: string
    pickup_datetime: string
    num_hours: number
  }
}

/** Everything the shared form renders one booking type with. */
export interface GuestBookingSetup {
  booking: GuestBookingMachine
  copy: GuestBookingCopy
  /** Stay/hire-aware WhatsApp escape hatch (non-personal context only). */
  supportHref: string
}

const HOTEL_GUEST_COPY: GuestBookingCopy = {
  ariaLabel: "Hotel Guest details",
  heading: "Who is staying?",
  intro:
    "One Hotel Guest per Hotel Booking — the contact and stay representative. No account needed.",
  phoneHelperText:
    "Pick your country code, then type your number — WhatsApp-ready.",
  submitPendingLabel: "Reserving your stay…",
  backLabel: "Back to Hotel",
  redirectBody:
    "Your Hotel Booking is reserved and your Payment Reference is saved. Complete payment on the secure Paystack page to confirm your stay.",
}

/**
 * Hotel Booking seam: the stay is re-checked against the capacity and date
 * rules before anything reaches the backend (spec story 22 — the charged
 * total is backend-authoritative, but an invalid stay never leaves the
 * device), and the funnel reports stay length only.
 */
export function hotelGuestBooking(data: HotelGuestBookingData): GuestBookingSetup {
  const nights = calculateNights(data.stay.check_in, data.stay.check_out)
  return {
    booking: {
      buildPayload: (values) =>
        buildHotelBookingPayload({
          hotel_id: data.hotel.id,
          room_type_id: data.room.id,
          check_in: data.stay.check_in,
          check_out: data.stay.check_out,
          num_rooms: data.stay.rooms,
          num_guests: data.stay.guests,
          guest_name: values.guest_name,
          guest_email: values.guest_email,
          guest_phone: values.guest_phone,
        }),
      createBooking: createHotelBooking,
      pendingSessionKey: PENDING_HOTEL_BOOKING_SESSION_KEY,
      referenceSessionKey: HOTEL_PAYMENT_REFERENCE_SESSION_KEY,
      analyticsEvent: "hotel_payment_initiated",
      analyticsProps: { currency: "NGN", nights },
      prePaymentIssue: () => {
        const verdict = checkRoomCapacity({
          maxGuests: data.room.max_guests,
          numGuests: data.stay.guests,
          numRooms: data.stay.rooms,
        })
        if (!verdict.ok) return verdict.guidance
        if (nights === null) {
          return "Review your stay dates on the Hotel page, then continue."
        }
        return null
      },
    },
    copy: HOTEL_GUEST_COPY,
    supportHref: getHotelSupportWhatsAppUrl(
      `the ${data.hotel.name} Hotel stay in ${data.hotel.city}`,
      {
        destination: `${data.hotel.name}, ${data.hotel.city}`,
        check_in: data.stay.check_in,
        check_out: data.stay.check_out,
        guests: data.stay.guests,
        rooms: data.stay.rooms,
      }
    ),
  }
}

const CAR_GUEST_COPY: GuestBookingCopy = {
  ariaLabel: "Guest details for car hire",
  heading: "Who is hiring?",
  intro:
    "One contact per booking — the person the driver meets. No account needed.",
  phoneHelperText:
    "Pick your country code, then type your number — the driver meets this contact.",
  submitPendingLabel: "Reserving your car…",
  backLabel: "Back to vehicle",
  redirectBody:
    "Your car booking is reserved and your payment reference is saved. Complete payment on the secure Paystack page to confirm your hire.",
}

/**
 * Car Booking seam: the hire (locations, future pickup, hours) was already
 * validated before the form rendered, so there is no pre-payment gate; the
 * funnel reports hire length only.
 */
export function carGuestBooking(data: CarGuestBookingData): GuestBookingSetup {
  return {
    booking: {
      buildPayload: (values) =>
        buildCarBookingPayload({
          vehicle_id: data.vehicle.id,
          pickup_location: data.hire.pickup_location,
          dropoff_location: data.hire.dropoff_location,
          pickup_datetime: data.hire.pickup_datetime,
          num_hours: data.hire.num_hours,
          guest_name: values.guest_name,
          guest_email: values.guest_email,
          guest_phone: values.guest_phone,
        }),
      createBooking: createCarBooking,
      pendingSessionKey: PENDING_CAR_BOOKING_SESSION_KEY,
      referenceSessionKey: CAR_PAYMENT_REFERENCE_SESSION_KEY,
      analyticsEvent: "car_payment_initiated",
      analyticsProps: { currency: "NGN", hours: data.hire.num_hours },
    },
    copy: CAR_GUEST_COPY,
    supportHref: getCarSupportWhatsAppUrl(`the ${data.vehicle.name} hire`, {
      vehicle_name: data.vehicle.name,
      pickup_location: data.hire.pickup_location,
      num_hours: data.hire.num_hours,
    }),
  }
}
