import { getCountryByDial } from "./data/countries.ts"

/**
 * Phone helpers shared by every PhoneField.
 * No external dependency: E.164 handling is digits-only so it stays
 * SSR-safe, offline, and bundle-light. Existing Zod schemas
 * (`nigerianPhoneSchema`) remain the validation authority — these helpers
 * only shape display values and split dial vs national parts.
 */

/** Strip everything except digits. */
export function phoneDigits(value: string): string {
  return (value ?? "").replace(/\D/g, "")
}

/**
 * Split a stored value into dial + national display parts.
 * Accepts E.164 ("+2348031234567"), dial-prefixed ("2348031234567"),
 * trunk-prefixed ("08031234567"), or bare national numbers.
 */
export function splitPhoneValue(
  value: string,
  fallbackDial = "234"
): { dial: string; national: string } {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return { dial: fallbackDial, national: "" }

  const digits = phoneDigits(trimmed)
  if (!digits) return { dial: fallbackDial, national: "" }

  // Longest dial match first (e.g. 1684 before 1).
  const { dial, national } = matchDial(digits, fallbackDial)
  return { dial, national }
}

function matchDial(
  digits: string,
  fallbackDial: string
): { dial: string; national: string } {
  // Try 4→1 digit dial prefixes against the known catalogue via lookup.
  for (let len = 4; len >= 1; len -= 1) {
    const prefix = digits.slice(0, len)
    const country = getCountryByDial(prefix)
    // getCountryByDial falls back to NG — only accept when it truly matches.
    if (country.dial === prefix) {
      const national = digits.slice(len)
      // A national part must remain; otherwise keep scanning shorter dials.
      if (national.length > 0) return { dial: prefix, national }
    }
  }
  // Nigerian trunk "0..." → strip trunk, keep fallback dial.
  if (digits.startsWith("0")) {
    return { dial: fallbackDial, national: digits.replace(/^0+/, "") }
  }
  return { dial: fallbackDial, national: digits }
}

/** Combine dial + national digits into E.164 ("+2348031234567"). */
export function toE164(dial: string, national: string): string {
  const cleanDial = phoneDigits(dial)
  const cleanNational = phoneDigits(national).replace(/^0+/, "")
  if (!cleanDial && !cleanNational) return ""
  if (!cleanNational) return `+${cleanDial}`
  return `+${cleanDial}${cleanNational}`
}

/** Human grouping for the national part (3-3-4 style, best effort). */
export function formatNationalDisplay(national: string): string {
  const digits = phoneDigits(national).replace(/^0+/, "")
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 10)
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10, 15)}`.trim()
}
