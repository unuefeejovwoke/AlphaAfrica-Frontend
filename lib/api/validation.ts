import { z } from "zod"
import { parseCalendarDate, startOfTodayUtc } from "../date.ts"

/**
 * Shared RHF + Zod primitives with Nigerian parity (PRD §10).
 *
 * - Phone: accepts Nigerian formats (080…, +234…, 234…) and valid
 *   international formats; rejects letters. Normalizes to E.164-ish
 *   `+<digits>` before submission.
 * - Dates: rejects impossible dates and past travel dates (day precision).
 * - Counters: mirror backend minimums (adults ≥ 1, applicants ≥ 1,
 *   hours ≥ 1, no negatives).
 */

const PHONE_ALLOWED_CHARS = /^[+0-9\s\-()]+$/

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "")
}

/**
 * Normalize a customer phone number before submission.
 * - `0803 123 4567` → `+2348031234567`
 * - `2348031234567` → `+2348031234567`
 * - `+234 803 123 4567` → `+2348031234567`
 * - Other international input → `+<digits>`
 */
export function normalizeNigerianPhone(value: string): string {
  const trimmed = value.trim()
  const digits = digitsOnly(trimmed)
  if (digits.startsWith("234") && digits.length === 13) {
    return `+${digits}`
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `+234${digits.slice(1)}`
  }
  // Local Nigerian mobile without trunk prefix (10 digits starting 7/8/9).
  if (digits.length === 10 && /^[789]/.test(digits)) {
    return `+234${digits}`
  }
  return `+${digits}`
}

function isNigerianDigits(digits: string): boolean {
  if (digits.startsWith("234") && digits.length === 13) {
    // After country code, Nigerian mobiles start 7/8/9.
    return /^[789]/.test(digits.slice(3, 4))
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return /^[789]/.test(digits.slice(1, 2))
  }
  return false
}

function isPlausibleInternational(digits: string): boolean {
  return digits.length >= 7 && digits.length <= 15
}

export function nigerianPhoneSchema(fieldLabel = "Phone number") {
  return z
    .string()
    .trim()
    .min(7, `${fieldLabel} is too short`)
    .max(20, `${fieldLabel} is too long`)
    .regex(
      PHONE_ALLOWED_CHARS,
      `Enter a valid ${fieldLabel.toLowerCase()} so we can reach you`
    )
    .refine(
      (value) => {
        const digits = digitsOnly(value)
        if (isNigerianDigits(digits)) return true
        // Accept local 10-digit Nigerian mobile without prefix.
        if (digits.length === 10 && /^[789]/.test(digits)) return true
        return isPlausibleInternational(digits)
      },
      {
        message: `Enter a valid ${fieldLabel.toLowerCase()} so we can reach you`,
      }
    )
    .transform((value) => normalizeNigerianPhone(value))
}

/**
 * Phone-shaped input rules without normalization or plausibility checks:
 * the same length floor and allowed characters the full schema enforces,
 * for forms that keep the customer's raw dialing input (contact enquiry,
 * callback request).
 */
export function phoneInputSchema(fieldLabel = "Phone number") {
  return z
    .string()
    .trim()
    .min(7, `${fieldLabel} is too short`)
    .regex(
      PHONE_ALLOWED_CHARS,
      `Enter a valid ${fieldLabel.toLowerCase()} so we can reach you`
    )
}

/** YYYY-MM-DD string that must be a real calendar date, today or later. */
export function futureDateStringSchema(fieldLabel = "Date") {
  const label = fieldLabel.toLowerCase()
  return z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Enter a valid ${label} (YYYY-MM-DD)`)
    .refine((value) => parseCalendarDate(value) !== null, {
      message: `Enter a valid ${label} (YYYY-MM-DD)`,
    })
    .refine(
      (value) => {
        const date = parseCalendarDate(value)
        if (date === null) return false // Validity reported above.
        return date.getTime() >= startOfTodayUtc()
      },
      { message: `${fieldLabel} cannot be in the past` }
    )
}

/** Optional preferred-date: empty stays empty, otherwise same future-date rule. */
export function optionalFutureDateStringSchema(fieldLabel = "Preferred date") {
  const label = fieldLabel.toLowerCase()
  return z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value === "" ? null : (value ?? null)))
    .refine(
      (value) => {
        if (value === null || value === undefined) return true
        return parseCalendarDate(value) !== null
      },
      { message: `Enter a valid ${label} (YYYY-MM-DD)` }
    )
    .refine(
      (value) => {
        if (value === null || value === undefined) return true
        const date = parseCalendarDate(value)
        if (date === null) return true // Validity reported above.
        return date.getTime() >= startOfTodayUtc()
      },
      { message: `${fieldLabel} cannot be in the past` }
    )
}

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .email("Enter a valid email address")
  .max(254, "Email address is too long")

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name")
  .max(150, "Name is too long")

/**
 * The one guest-contact schema for every booking type (ticket 16): Hotel
 * Guest and Vehicle guest both capture one full name plus email plus phone
 * (CONTEXT.md — the single booking contact). Composed from the shared
 * primitives above; the phone transform normalizes Nigerian formats to
 * `+234…` before submission.
 */
export const guestContactSchema = z.object({
  guest_name: fullNameSchema,
  guest_email: emailSchema,
  guest_phone: nigerianPhoneSchema("Phone number"),
})

export type GuestContactInput = z.input<typeof guestContactSchema>
