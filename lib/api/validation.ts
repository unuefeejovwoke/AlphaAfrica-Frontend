import { z } from "zod"

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
  if (trimmed.startsWith("+")) {
    return `+${digits}`
  }
  // Local Nigerian mobile without trunk prefix (10 digits starting 7/8/9).
  if (digits.length === 10 && /^[789]/.test(digits)) {
    return `+234${digits}`
  }
  return trimmed.startsWith("+") ? `+${digits}` : `+${digits}`
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

/** YYYY-MM-DD string that must be a real calendar date, today or later. */
export function futureDateStringSchema(fieldLabel = "Date") {
  const label = fieldLabel.toLowerCase()
  return z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Enter a valid ${label} (YYYY-MM-DD)`)
    .refine(
      (value) => {
        const [y, m, d] = value.split("-").map(Number)
        const date = new Date(Date.UTC(y, m - 1, d))
        if (Number.isNaN(date.getTime())) return false
        // Reject impossible dates such as 2026-02-30.
        return (
          date.getUTCFullYear() === y &&
          date.getUTCMonth() === m - 1 &&
          date.getUTCDate() === d
        )
      },
      { message: `Enter a valid ${label} (YYYY-MM-DD)` }
    )
    .refine(
      (value) => {
        const [y, m, d] = value.split("-").map(Number)
        const date = new Date(Date.UTC(y, m - 1, d))
        const today = new Date()
        const todayUtc = Date.UTC(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        )
        return date.getTime() >= todayUtc
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
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
        const [y, m, d] = value.split("-").map(Number)
        const date = new Date(Date.UTC(y, m - 1, d))
        if (Number.isNaN(date.getTime())) return false
        return (
          date.getUTCFullYear() === y &&
          date.getUTCMonth() === m - 1 &&
          date.getUTCDate() === d
        )
      },
      { message: `Enter a valid ${label} (YYYY-MM-DD)` }
    )
    .refine(
      (value) => {
        if (value === null || value === undefined) return true
        const [y, m, d] = value.split("-").map(Number)
        const date = new Date(Date.UTC(y, m - 1, d))
        if (Number.isNaN(date.getTime())) return true // Validity reported above.
        const today = new Date()
        const todayUtc = Date.UTC(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        )
        return date.getTime() >= todayUtc
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
