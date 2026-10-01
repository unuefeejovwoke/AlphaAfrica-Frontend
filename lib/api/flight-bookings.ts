import { z } from "zod"
import { ApiError, apiGet, apiPost } from "./client.ts"
import { digestKey } from "./booking-key.ts"
import { resolveBookingOutcome, VERIFICATION_REQUEST } from "./verification.ts"
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
 * Verify-route URL carrying the Payment Reference as a query param
 * (ticket-08 contract). Only the reference travels in the URL — never
 * tokens, passports, payment data, or passwords.
 */
export function buildFlightVerifyUrl(reference: string): string {
  return `/flights/verify?reference=${encodeURIComponent(reference)}`
}

/** Persist the Payment Reference so refresh, back, and new tabs survive. */
export function savePaymentReference(reference: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(PAYMENT_REFERENCE_SESSION_KEY, reference)
  } catch {
    // sessionStorage may throw in private mode — the URL copy still works
  }
}

/** Read back the persisted Payment Reference, or null when absent. */
export function readPaymentReference(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(PAYMENT_REFERENCE_SESSION_KEY)
  } catch {
    return null
  }
}

/**
 * Drop the stored Pending Booking and Payment Reference once a payment is
 * verified as paid. Back/forward can then never re-enter checkout with a
 * completed trip; the verify page keeps rendering from its fetched booking.
 */
export function clearBookingSession(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(PENDING_BOOKING_SESSION_KEY)
    window.sessionStorage.removeItem(PAYMENT_REFERENCE_SESSION_KEY)
  } catch {
    // sessionStorage may throw in private mode — nothing to clear, nothing to do
  }
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
})

export type FlightBookingCreateResult = z.infer<
  typeof flightBookingCreateResultSchema
>

/** Either live shape: flat (apidoc) or the `{ booking, payment }` envelope. */
const flightBookingCreateEnvelopeSchema = z
  .object({
    reference: z.string().optional(),
    authorization_url: z.string().optional(),
    total_amount: z.union([z.string(), z.number()]).optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    currency: z.string().optional(),
    booking: z
      .object({
        reference: z.string().optional(),
        total_amount: z.union([z.string(), z.number()]).optional(),
        currency: z.string().optional(),
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
  return {
    reference,
    authorization_url,
    ...(total_amount !== undefined ? { total_amount } : null),
    ...(currency !== undefined ? { currency } : null),
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
 * (apidoc FlightBookingStatusEnum: pending, paid, confirmed, cancelled,
 * failed). Delegates to the shared verification seam: `confirmed` means the
 * airline order exists, so it counts as paid; anything unrecognized stays
 * pending so the customer keeps checking instead of assuming failure — a
 * return from Paystack proves nothing by itself.
 */
export type FlightVerificationOutcome =
  "paid" | "pending" | "failed" | "cancelled"

export function resolveFlightVerificationState(booking: {
  status?: string | null
}): FlightVerificationOutcome {
  const outcome = resolveBookingOutcome("flight", booking.status)
  return outcome === "confirmed" ? "paid" : outcome
}

/**
 * A verified flight Booking (apidoc FlightBooking). Permissive beyond
 * `reference`: only the reference is required and renderers read the rest
 * defensively. `travelers` and `flight_details` arrive as structured JSON —
 * the live API returns arrays/objects even though the apidoc types them as
 * strings — and are never rendered raw (the summary uses party counts only).
 * The PNR is present only after successful payment verification creates the
 * airline order, so renderers must show it only when non-empty.
 */
export const flightBookingSchema = z.object({
  reference: z.string(),
  pnr: z.string().nullable().optional(),
  amadeus_order_id: z.string().optional(),
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
