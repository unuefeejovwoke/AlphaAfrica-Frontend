import { z } from "zod"
import { ApiError, apiGet, apiPost } from "./client.ts"
import { digestKey } from "./booking-key.ts"
import {
  clearSessionKeys,
  resolveBookingOutcome,
  VERIFICATION_REQUEST,
} from "./verification.ts"
import { emailSchema } from "./validation.ts"
import { moneyToKobo, resolveMoneyChange, type MoneyChange } from "../money.ts"
import {
  genderSchema,
  travelerTypeSchema,
  type BookingCustomer,
  type BookingTravellerPayload,
} from "../schemas/travel.ts"

/**
 * Pending Booking creation for ticket 07 (spec stories 21–24).
 *
 * A guest with a Confirmed Offer plus validated Travellers creates a Pending
 * Booking exactly once, then hands off to Paystack. Retrying an identical
 * Confirmed Offer plus the same Traveller details and contact reuses the
 * stored pending reference instead of creating a duplicate.
 */

// ---------------------------------------------------------------------------
// Duplicate-prevention seam (pure — unit-tested in tests/flight-booking.test.ts)
// ---------------------------------------------------------------------------

/** A stored Pending Booking creation, keyed by Confirmed Offer + party. */
export interface PendingBookingRecord {
  key: string
  reference: string
  authorization_url: string
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null"
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`
  }
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  const parts = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`
  )
  return `{${parts.join(",")}}`
}

/**
 * Identity of one booking attempt: a digest of the opaque Confirmed Offer
 * blob plus the validated Traveller details and paying contact. Including
 * the travellers is the safety property that matters — an edited name,
 * passport, or contact must never silently reuse a Pending Booking created
 * for different people, because the airline order is built from the
 * booking's stored travellers. Key order is normalized so unchanged retries
 * hash identically. The stored key is a digest, never the readable payload:
 * passport numbers, dates of birth, and contact details must never sit in
 * browser storage.
 */
export function hashBookingKey(
  flightOffer: unknown,
  travelers: readonly BookingTravellerPayload[],
  customer: BookingCustomer
): string {
  return digestKey(
    stableStringify({ flight_offer: flightOffer, travelers, customer })
  )
}

/**
 * Reuse the stored pending reference when the retry matches the stored key,
 * otherwise signal that a new creation is required. Never throws.
 */
export function findReusableBooking(
  stored: PendingBookingRecord | null,
  key: string
): { reference: string; authorization_url: string } | null {
  if (!stored || stored.key !== key) return null
  if (!stored.reference || !stored.authorization_url) return null
  return {
    reference: stored.reference,
    authorization_url: stored.authorization_url,
  }
}

export const PENDING_BOOKING_SESSION_KEY = "alphaa:pending-flight-booking:v1"

/** Persist the created Pending Booking so an identical retry reuses it. */
export function savePendingBooking(record: PendingBookingRecord): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      PENDING_BOOKING_SESSION_KEY,
      JSON.stringify(record)
    )
  } catch {
    // sessionStorage may throw in private mode — the creation still ran
  }
}

/** Read back the stored Pending Booking, or null when absent/corrupt. */
export function readPendingBooking(): PendingBookingRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(PENDING_BOOKING_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== "object" || parsed === null) return null
    const record = parsed as Record<string, unknown>
    if (
      typeof record.key !== "string" ||
      typeof record.reference !== "string" ||
      typeof record.authorization_url !== "string"
    ) {
      return null
    }
    return {
      key: record.key,
      reference: record.reference,
      authorization_url: record.authorization_url,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Reference persistence seam (pure URL builder + guarded storage — tested)
// ---------------------------------------------------------------------------

export const PAYMENT_REFERENCE_SESSION_KEY =
  "alphaa:flight-payment-reference:v1"

/**
 * Verify-route URL carrying the Payment Reference as a query param.
 * Targets the order route — the live Paystack return target and the real
 * confirmation surface — so a refresh of a saved reference lands on the
 * confirmation rather than the retired flight verify route (ADR-0007).
 * Only the reference travels in the URL — never tokens, passports, payment
 * data, or passwords.
 */
export function buildFlightVerifyUrl(reference: string): string {
  const params = new URLSearchParams({ reference })
  return `/order?${params.toString()}`
}

/**
 * Pay-later URL — the shape the backend's reservation email links to
 * (guide §9): `/flights/pay?reference=…&email=…&token=…`.
 *
 * Exactly three values travel: the Booking reference, the Customer's email,
 * and the guest secure token that authorises `/pay/`. Nothing else is ever
 * appended — no passport, date of birth, contact detail, or payment data can
 * reach a URL, because this builder accepts nothing that could carry them.
 */
export function buildFlightPayUrl(input: {
  reference: string
  email: string
  token: string
}): string {
  const params = new URLSearchParams({
    reference: input.reference,
    email: input.email,
    token: input.token,
  })
  return `/flights/pay?${params.toString()}`
}

/** Persist the Payment Reference so refresh, back, and new tabs survive. */
export function savePaymentReference(reference: string): void {
  saveStringKey(PAYMENT_REFERENCE_SESSION_KEY, reference)
}

/** Read back the persisted Payment Reference, or null when absent. */
export function readPaymentReference(): string | null {
  return readStringKey(PAYMENT_REFERENCE_SESSION_KEY)
}

/**
 * Drop the stored Pending Booking and Payment Reference once a payment is
 * verified as paid. Back/forward can then never re-enter checkout with a
 * completed trip; the verify page keeps rendering from its fetched booking.
 */
export function clearBookingSession(): void {
  clearSessionKeys([
    PENDING_BOOKING_SESSION_KEY,
    PAYMENT_REFERENCE_SESSION_KEY,
    RESERVATION_REFERENCE_SESSION_KEY,
  ])
}

// ---------------------------------------------------------------------------
// Reservation persistence + deadline seams (pure — tested)
// ---------------------------------------------------------------------------

export const RESERVATION_REFERENCE_SESSION_KEY =
  "alphaa:flight-reservation-reference:v1"

/** What is persisted for a Reservation: the reference plus which offer made it. */
export interface ReservationRecord {
  reference: string
  /** Digest of the reserving offer — lets checkout tell refresh from new search. */
  offerKey: string | null
}

/**
 * Offer-only identity for reservation scoping: a digest of the opaque offer
 * blob, never the readable payload. Two checkouts for the same card hash
 * identically; a new search hashes differently so it is never hijacked.
 */
export function hashOfferKey(offer: unknown): string {
  return digestKey(stableStringify({ flight_offer: offer }))
}

function toReservationRecord(value: unknown): ReservationRecord | null {
  if (typeof value === "string") {
    const reference = value.trim()
    return reference ? { reference, offerKey: null } : null
  }
  if (typeof value !== "object" || value === null) return null
  const rec = value as Record<string, unknown>
  const reference =
    typeof rec.reference === "string" ? rec.reference.trim() : ""
  if (!reference) return null
  return {
    reference,
    offerKey: typeof rec.offerKey === "string" ? rec.offerKey : null,
  }
}

/**
 * Persist the Reservation's Booking reference so refresh and Back navigation
 * return the Customer to their reservation rather than an empty form. The
 * reference plus an offer digest is the ONLY thing stored — no passport, date
 * of birth, contact detail, or payment data may ever reach the device. Every
 * load re-reads the live Booking from the backend; nothing cached is trusted.
 *
 * The offer digest is what stops a stale hold from hijacking a new search:
 * checkout restores only when the current offer matches the reserving offer.
 * Legacy plain-string values (pre-scoping) still read back.
 */
export function saveReservationReference(
  reference: string,
  options: { offer?: unknown } = {}
): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      RESERVATION_REFERENCE_SESSION_KEY,
      JSON.stringify({
        reference,
        offerKey:
          options.offer !== undefined ? hashOfferKey(options.offer) : null,
      })
    )
  } catch {
    // sessionStorage may throw in private mode — the URL copy still works
    saveStringKey(RESERVATION_REFERENCE_SESSION_KEY, reference)
  }
}

/** Read back the persisted Reservation record, or null when absent/corrupt. */
export function readReservationRecord(): ReservationRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(
      RESERVATION_REFERENCE_SESSION_KEY
    )
    if (!raw) return null
    try {
      return toReservationRecord(JSON.parse(raw) as unknown)
    } catch {
      // Legacy plain-string value from before offer scoping.
      return toReservationRecord(raw)
    }
  } catch {
    return null
  }
}

/** Read back the persisted Reservation reference, or null when absent. */
export function readReservationReference(): string | null {
  return readReservationRecord()?.reference ?? null
}

/** Drop the stored Reservation so a new search starts fresh. */
export function clearReservationReference(): void {
  clearSessionKeys([RESERVATION_REFERENCE_SESSION_KEY])
}

/** Guarded sessionStorage string round-trip shared by the reference keys. */
function saveStringKey(key: string, value: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // sessionStorage may throw in private mode — the URL copy still works
  }
}

/** Guarded sessionStorage string read shared by the reference keys. */
function readStringKey(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/** `2026-09-05…` → `[2026, 9, 5]`. Null when absent or not a date prefix. */
function parseDatePrefix(
  value: string | null | undefined
): [number, number, number] | null {
  if (!value) return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/**
 * `2026-09-05` → `5 September 2026`. Returns the input untouched when it is
 * not a date, null when there is nothing to render — never invented.
 */
export function formatTicketingDeadline(
  value: string | null | undefined
): string | null {
  if (!value) return null
  const parts = parseDatePrefix(value)
  if (!parts) return value
  const label = MONTH_NAMES[parts[1] - 1]
  return label ? `${parts[2]} ${label} ${parts[0]}` : value
}

/**
 * Plain-language urgency for a ticketing deadline — "today", "tomorrow",
 * "in 3 days" — alongside the exact date, never as a countdown timer. A timer
 * that runs out on a page left open overnight becomes a false urgency
 * (ADR-0007). Null when the deadline is absent or unparseable.
 */
export function describeTicketingUrgency(
  value: string | null | undefined,
  today: Date = new Date()
): string | null {
  if (!value) return null
  const parts = parseDatePrefix(value)
  if (!parts) return null
  const deadline = new Date(parts[0], parts[1] - 1, parts[2])
  if (Number.isNaN(deadline.getTime())) return null
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  const diffDays = Math.round(
    (deadline.getTime() - startOfToday.getTime()) / 86_400_000
  )
  if (diffDays < 0) return "this hold has expired"
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "tomorrow"
  return `in ${diffDays} days`
}

/**
 * True when a Reservation can no longer be paid: the backend reports a
 * terminal state, or the pay-by date has passed. A released hold is never
 * presented as payable and no payment is attempted against it.
 *
 * Deliberate ceiling, not an oversight (ADR-0007):
 * # ponytail: no client-side hold release — no cancel/release endpoint exists,
 * upgrade path is a backend DELETE/POST cancel endpoint, at which point this
 * becomes a real release call instead of a read-only report.
 */
export function isReservationReleased(booking: {
  status?: string | null
  ticketing_deadline?: string | null
}): boolean {
  const status = (booking.status ?? "").trim().toLowerCase()
  if (["cancelled", "failed", "expired"].includes(status)) return true
  if (status !== "reserved") return false
  const deadline = booking.ticketing_deadline
  if (!deadline) return false
  const parts = parseDatePrefix(deadline)
  if (!parts) return false
  const day = new Date(parts[0], parts[1] - 1, parts[2])
  if (Number.isNaN(day.getTime())) return false
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return day.getTime() < startOfToday.getTime()
}

/**
 * Classify a re-read Reservation for every surface that resumes one
 * (checkout restore, pay-now-anyway, order history): paid routes to the
 * confirmation, released reports the honest reason, reserved renders the
 * hold — and anything else (e.g. a still-settling `pending`) is `unsettled`,
 * never mistaken for a released hold or a payable one.
 */
export type RestoredReservation = "paid" | "reserved" | "released" | "unsettled"

export function resolveRestoredBooking(booking: {
  status?: string | null
  ticketing_deadline?: string | null
}): RestoredReservation {
  if (resolveFlightVerificationState(booking) === "paid") return "paid"
  if (isReservationReleased(booking)) return "released"
  if (resolveFlightVerificationState(booking) === "reserved") return "reserved"
  return "unsettled"
}

// ---------------------------------------------------------------------------
// Creation — mirrors apidoc.yaml FlightBookingCreateRequest + visa.ts shape
// ---------------------------------------------------------------------------

/** One traveller for booking — mirrors apidoc.yaml TravelerRequest. */
export const flightBookingTravelerSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  date_of_birth: z.string().trim().min(1),
  gender: genderSchema,
  email: emailSchema,
  phone_country_code: z.string().trim().min(1).max(4).optional().default("234"),
  phone: z.string().trim().min(1).max(20),
  traveler_type: travelerTypeSchema.optional().default("ADULT"),
  passport_number: z.string().trim().max(30).optional(),
  passport_expiry: z.string().trim().optional(),
  nationality: z.string().trim().max(2).optional(),
})

export const flightBookingCreateRequestSchema = z.object({
  flight_offer: z.unknown(),
  travelers: z.array(flightBookingTravelerSchema).min(1),
  contact_name: z.string().trim().min(1).max(150),
  contact_email: emailSchema,
  // Optional for backend parity (apidoc requires only contact_email,
  // contact_name, flight_offer, travelers); our Customer always carries one.
  contact_phone: z.string().trim().max(20).optional(),
})

export type FlightBookingCreateRequest = z.infer<
  typeof flightBookingCreateRequestSchema
>

/**
 * Normalized create result consumed by checkout. The live endpoint answers
 * with an envelope (`{ booking, payment }`) while the apidoc only documents a
 * flat `{ reference, authorization_url }`; both shapes normalize to this
 * contract. The final re-priced total is carried whenever the backend returns
 * one, so checkout can hold the Paystack redirect behind a changed-fare
 * consent instead of sending the guest to an amount they never approved.
 */
export const flightBookingCreateResultSchema = z.object({
  reference: z.string().min(1),
  authorization_url: z.string().min(1),
  total_amount: z.union([z.string(), z.number()]).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
  /**
   * International Flight Offers are held with the airline at creation time:
   * the seat sits with the airline and the PNR already exists before any
   * money moves (ADR-0007). Domestic QuickAir offers are unchanged — no hold,
   * `false`, no PNR, no deadline.
   */
  reserved: z.boolean(),
  /** Airline record locator; empty string when the offer was not held. */
  pnr: z.string(),
  /** Last date the held seat can still be paid and ticketed; null when not held. */
  ticketing_deadline: z.string().nullable(),
})

export type FlightBookingCreateResult = z.infer<
  typeof flightBookingCreateResultSchema
>

/** Either live shape: flat (apidoc) or the `{ booking, payment }` envelope. */
/** Reservation fields the live create response carries, at either nesting level. */
const reservationFieldsShape = {
  reserved: z.boolean().optional(),
  pnr: z.string().optional(),
  ticketing_deadline: z.string().nullable().optional(),
}

const flightBookingCreateEnvelopeSchema = z
  .object({
    reference: z.string().optional(),
    authorization_url: z.string().optional(),
    total_amount: z.union([z.string(), z.number()]).optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    currency: z.string().optional(),
    ...reservationFieldsShape,
    booking: z
      .object({
        reference: z.string().optional(),
        total_amount: z.union([z.string(), z.number()]).optional(),
        currency: z.string().optional(),
        ...reservationFieldsShape,
      })
      .passthrough()
      .optional(),
    payment: z
      .object({
        reference: z.string().optional(),
        authorization_url: z.string().optional(),
        amount: z.union([z.string(), z.number()]).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

/**
 * Normalize either create response shape into the checkout contract. Returns
 * null when no usable reference plus checkout link exists — checkout then
 * surfaces an error instead of redirecting to a broken URL.
 */
export function normalizeFlightBookingCreateResult(
  raw: unknown
): FlightBookingCreateResult | null {
  const parsed = flightBookingCreateEnvelopeSchema.safeParse(raw)
  if (!parsed.success) return null
  const { booking, payment } = parsed.data
  const reference =
    payment?.reference ?? parsed.data.reference ?? booking?.reference
  const authorization_url =
    payment?.authorization_url ?? parsed.data.authorization_url
  if (!reference || !authorization_url) return null
  // The payment block owns the amount actually sent to Paystack; fall back to
  // the booking total and then the flat shape's fields.
  const total_amount =
    payment?.amount ??
    booking?.total_amount ??
    parsed.data.total_amount ??
    parsed.data.amount
  const currency = booking?.currency ?? parsed.data.currency
  // The reservation fields are echoed at both levels; the booking block is the
  // one the Booking itself carries, so it wins. Anything the backend omits is
  // reported as "not held" rather than invented (ADR-0007).
  const reserved = booking?.reserved ?? parsed.data.reserved ?? false
  const pnr = booking?.pnr ?? parsed.data.pnr ?? ""
  const ticketing_deadline =
    booking?.ticketing_deadline ?? parsed.data.ticketing_deadline ?? null
  return {
    reference,
    authorization_url,
    ...(total_amount !== undefined ? { total_amount } : null),
    ...(currency !== undefined ? { currency } : null),
    reserved,
    pnr,
    ticketing_deadline,
  }
}

/**
 * Compare the fare the guest approved on checkout with the amount the create
 * call actually re-priced and sent to Paystack.
 *
 * `unknown` means the backend did not return an amount, so checkout proceeds
 * to Paystack with the disclosure copy. `changed` must block the redirect and
 * ask for explicit consent — a fare never changes silently.
 */
export type CreatePriceReview =
  | { status: "unknown" }
  | { status: "same" }
  | ({ status: "changed" } & MoneyChange)

export function resolveCreatePriceReview(input: {
  confirmedTotal: string | null | undefined
  result: FlightBookingCreateResult
}): CreatePriceReview {
  const rawCreateTotal = input.result.total_amount ?? input.result.amount
  const confirmedKobo =
    input.confirmedTotal === null || input.confirmedTotal === undefined
      ? null
      : moneyToKobo(input.confirmedTotal)
  const createKobo =
    rawCreateTotal === undefined ? null : moneyToKobo(rawCreateTotal)
  if (confirmedKobo === null || createKobo === null) {
    return { status: "unknown" }
  }
  if (confirmedKobo === createKobo) return { status: "same" }
  // The currency is NGN-only in v1 (ADR-0004); a backend echo never changes it.
  return {
    status: "changed",
    ...resolveMoneyChange(confirmedKobo, createKobo),
  }
}

export interface CreateFlightBookingInput {
  flight_offer: unknown
  travelers: BookingTravellerPayload[]
  customer: BookingCustomer
}

/**
 * Create one Pending Booking (Guest Booking — no login required; the
 * centralized client sends no auth headers). Validates the payload against
 * the backend contract first; the response is parsed as untrusted input.
 */
export async function createFlightBooking(
  input: CreateFlightBookingInput
): Promise<FlightBookingCreateResult> {
  const body = flightBookingCreateRequestSchema.parse({
    flight_offer: input.flight_offer,
    travelers: input.travelers,
    contact_name: input.customer.name,
    contact_email: input.customer.email,
    contact_phone: input.customer.phone,
  })
  const raw = await apiPost<unknown, Record<string, unknown>>(
    "/api/flights/bookings/create/",
    body as Record<string, unknown>,
    { sameOrigin: true }
  )
  const normalized = normalizeFlightBookingCreateResult(raw)
  if (!normalized) {
    // The booking may exist server-side, but without a checkout link there is
    // nothing to redirect to; never send the guest to a broken URL.
    throw new ApiError(
      "The payment service did not return a checkout link. No booking was made and no payment was taken.",
      { status: 200, code: "server" }
    )
  }
  return normalized
}

// ---------------------------------------------------------------------------
// Verification — mirrors apidoc.yaml FlightBooking + visa.ts verify shape
// ---------------------------------------------------------------------------

/**
 * Terminal verification outcome derived from a FlightBooking status
 * (apidoc FlightBookingStatusEnum: pending, reserved, paid, confirmed,
 * cancelled, failed). Delegates to the shared verification seam: `confirmed`
 * means the airline order exists, so it counts as paid; anything unrecognized
 * stays pending so the customer keeps checking instead of assuming failure — a
 * return from Paystack proves nothing by itself.
 *
 * `reserved` is its own outcome, never collapsed into `pending`: a
 * Reservation is a deliberate hold the Customer chose, while `pending` is the
 * warning copy for a payment that may not have completed. They mean opposite
 * things and must never render the same way (ADR-0007).
 */
export type FlightVerificationOutcome =
  "paid" | "reserved" | "pending" | "failed" | "cancelled"

export function resolveFlightVerificationState(booking: {
  status?: string | null
}): FlightVerificationOutcome {
  if ((booking.status ?? "").trim().toLowerCase() === "reserved") {
    return "reserved"
  }
  const outcome = resolveBookingOutcome("flight", booking.status)
  return outcome === "confirmed" ? "paid" : outcome
}

/**
 * A verified flight Booking (apidoc FlightBooking). Permissive beyond
 * `reference`: only the reference is required and renderers read the rest
 * defensively. `travelers` and `flight_details` arrive as structured JSON —
 * the live API returns arrays/objects even though the apidoc types them as
 * strings — and are never rendered raw (the summary uses party counts only).
 * For an international Flight Offer the PNR exists from creation, before
 * payment (ADR-0007), so PNR presence never implies payment; renderers must
 * branch on `status`. An empty-string PNR is a real value, not a missing one.
 */
export const flightBookingSchema = z.object({
  reference: z.string(),
  pnr: z.string().nullable().optional(),
  amadeus_order_id: z.string().optional(),
  /** Last date a held seat can still be paid and ticketed; null when not held. */
  ticketing_deadline: z.string().nullable().optional().default(null),
  /** Issued e-ticket numbers; null or empty while the agency is still ticketing. */
  ticket_numbers: z.array(z.string()).nullable().optional().default(null),
  contact_name: z.string().optional().default(""),
  origin: z.string().optional().default(""),
  destination: z.string().optional().default(""),
  departure_date: z.string().optional().default(""),
  return_date: z.string().nullable().optional(),
  num_adults: z.number().int().nonnegative().optional().default(0),
  num_children: z.number().int().nonnegative().optional().default(0),
  num_infants: z.number().int().nonnegative().optional().default(0),
  total_amount: z.union([z.string(), z.number()]).optional().default(""),
  currency: z.string().optional().default("NGN"),
  status: z.string().optional().default("pending"),
  travelers: z.unknown().optional(),
  flight_details: z.unknown().optional(),
})

export type FlightBooking = z.infer<typeof flightBookingSchema>

/**
 * Verify the Paystack payment for a reference and fetch the final Booking.
 * Never cached: verification must reflect the live payment state, not a
 * stale pending snapshot. Guest Booking — no login required.
 */
export async function verifyFlightBooking(
  reference: string
): Promise<FlightBooking> {
  const raw = await apiGet<unknown>(
    `/api/flights/bookings/verify/${encodeURIComponent(reference)}/`,
    { ...VERIFICATION_REQUEST }
  )
  return flightBookingSchema.parse(raw)
}

// ---------------------------------------------------------------------------
// Pay-later seam — `POST /api/flights/bookings/{reference}/pay/`
//
// THE CRASH-PREVENTION BOUNDARY OF THE FEATURE. Verified against the live API:
// an already-paid Booking answers HTTP **200** with a human-readable `detail`
// and the full Booking, and NO `authorization_url` — not the 409 the
// integration guide documents. Because the status is 200 the request succeeds
// and `response.ok` is true, so a client reading `authorization_url`
// unconditionally gets `undefined` and redirects to it. A Customer reaches
// that path simply by opening an old payment link twice.
//
// So the result is a discriminated union with three outcomes, not a bare URL:
//   - `checkout`    — there is a Paystack checkout to redirect to
//   - `already_paid`— terminal; carries the Booking to render, never to charge
//   - `null`        — neither; explicitly NOT a redirect target
//
// The branches are unambiguous by construction: a checkout response always
// carries a link, an already-paid response never does. A backend change that
// returns 409 for already-paid would remove the terminal branch; until then it
// stays and stays tested. See ADR-0007.
// ---------------------------------------------------------------------------

/** Either shape `pay/` answers with: flat, or the `{ booking, payment }` envelope. */
const flightPayEnvelopeSchema = z
  .object({
    detail: z.string().optional(),
    reference: z.string().optional(),
    authorization_url: z.string().optional(),
    ticketing_deadline: z.string().nullable().optional(),
    booking: z.unknown().optional(),
    payment: z
      .object({ authorization_url: z.string().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough()

export type FlightPayResult =
  | {
      kind: "checkout"
      authorization_url: string
      reference: string
      ticketing_deadline: string | null
      /** The Reservation being paid for, when the response carries it. */
      booking: FlightBooking | null
    }
  | {
      /** Terminal: the Booking is paid. Render it; never charge it again. */
      kind: "already_paid"
      /** The backend's own words — the honest source of the customer's copy. */
      message: string
      booking: FlightBooking
    }

/**
 * Classify a `/pay/` response into a checkout to redirect to, a terminal
 * already-paid Booking, or neither. Returns null rather than a partial result
 * so a caller can never read a missing `authorization_url` and redirect to it.
 */
export function normalizeFlightPayResult(
  raw: unknown
): FlightPayResult | null {
  const parsed = flightPayEnvelopeSchema.safeParse(raw)
  if (!parsed.success) return null
  const { detail, reference, ticketing_deadline, booking } = parsed.data

  // Branch 1 — a checkout link is present, at either nesting level. Repeated
  // calls return the SAME link by design (one checkout is re-served, not
  // re-minted), so this is safe to redirect to any number of times.
  const authorization_url =
    parsed.data.authorization_url ?? parsed.data.payment?.authorization_url
  if (authorization_url) {
    const checkoutBooking =
      typeof booking === "object" && booking !== null
        ? flightBookingSchema.safeParse({
            ...booking,
            reference:
              (booking as Record<string, unknown>).reference ?? reference ?? "",
          })
        : null
    return {
      kind: "checkout",
      authorization_url,
      reference: reference ?? "",
      ticketing_deadline: ticketing_deadline ?? null,
      booking:
        checkoutBooking && checkoutBooking.success
          ? checkoutBooking.data
          : null,
    }
  }

  // Branch 2 — no link, so this is not payable. Only report the terminal
  // already-paid state when a message names it AND we know which Booking.
  const bookingReference =
    reference ??
    (typeof booking === "object" && booking !== null
      ? ((booking as Record<string, unknown>).reference as
          | string
          | undefined)
      : undefined)
  if (!detail || !bookingReference) return null
  const safeBooking = flightBookingSchema.safeParse({
    ...(typeof booking === "object" && booking !== null ? booking : {}),
    reference: bookingReference,
  })
  if (!safeBooking.success) return null
  return {
    kind: "already_paid",
    message: detail,
    booking: safeBooking.data,
  }
}

export interface PayFlightBookingInput {
  reference: string
  /** Guest secure token from the reservation email; omitted when signed in. */
  token?: string
}

/**
 * Open payment for a Reservation (guide §9). The guest token travels in the
 * request body AND as a query parameter — the API documents both and accepts
 * either. Never cached: this decides whether money can move right now.
 *
 * Throws `ApiError` on a non-OK status (a 403 means an invalid or expired
 * secure link — callers give that its own copy rather than the shared
 * "please log in" message, which is wrong for a Guest holding a valid
 * Booking).
 */
export async function payFlightBooking(
  input: PayFlightBookingInput
): Promise<FlightPayResult> {
  const raw = await apiPost<unknown, Record<string, unknown>>(
    `/api/flights/bookings/${encodeURIComponent(input.reference)}/pay/`,
    input.token ? { token: input.token } : {},
    { sameOrigin: true, ...(input.token ? { query: { token: input.token } } : {}) }
  )
  const result = normalizeFlightPayResult(raw)
  if (!result) {
    // Neither branch: the reservation is not payable and the backend said
    // nothing actionable. Never redirect on this.
    throw new ApiError(
      "We could not open payment for this reservation. No payment was taken — open your reservation link again, or contact Alphaa.",
      { status: 200, code: "server" }
    )
  }
  return result
}

/**
 * E-ticket numbers for a Booking (guide §9). A confirmed Booking whose
 * ticket the agency has not yet issued answers `{ticketed: false,
 * ticket_numbers: []}` — that is "still being processed", NOT a failure, and
 * must never be rendered as an error.
 */
export const flightTicketResponseSchema = z.object({
  reference: z.string().optional(),
  pnr: z.string().nullable().optional(),
  ticketed: z.boolean(),
  ticket_numbers: z.array(z.string()),
  booking: flightBookingSchema.optional(),
})

export type FlightTicketResponse = z.infer<typeof flightTicketResponseSchema>

/**
 * Fetch e-ticket numbers once, on demand — never polled. The backend emails
 * the Customer the moment numbers first appear, so a continuous poll would
 * burn requests to learn nothing. A malformed response throws rather than
 * reporting "not yet issued", so a genuine failure is never confused with a
 * ticket that is merely still being processed.
 */
export async function fetchFlightTickets(input: {
  reference: string
  token?: string
}): Promise<FlightTicketResponse> {
  const raw = await apiGet<unknown>(
    `/api/flights/bookings/${encodeURIComponent(input.reference)}/tickets/`,
    {
      ...VERIFICATION_REQUEST,
      ...(input.token ? { query: { token: input.token } } : {}),
    }
  )
  return flightTicketResponseSchema.parse(raw)
}
