import { parseNairaAmount } from "./api/flight-filters.ts"

/**
 * Shared money utilities for backend display strings and kobo comparisons.
 * One parser and one formatter keep fare-diff math identical wherever it runs
 * (results-page fare confirmation and checkout price review).
 *
 * The currency is NGN-only in v1 (ADR-0004); callers may pass a currency for
 * display but never convert.
 */

/** Naira display string or number → integer kobo, or null when unreadable. */
export function moneyToKobo(value: string | number): number | null {
  const naira = parseNairaAmount(String(value))
  if (naira === null) return null
  return Math.round(naira * 100)
}

/** Integer kobo → "1234.56" display string. */
export function koboToMoneyString(kobo: number): string {
  return (kobo / 100).toFixed(2)
}

/** Display-ready same-currency difference between two kobo amounts. */
export interface MoneyChange {
  previousTotal: string
  newTotal: string
  difference: string
  increased: boolean
  currency: string
}

export function resolveMoneyChange(
  previousKobo: number,
  newKobo: number,
  currency = "NGN"
): MoneyChange {
  const diffKobo = newKobo - previousKobo
  return {
    previousTotal: koboToMoneyString(previousKobo),
    newTotal: koboToMoneyString(newKobo),
    difference: koboToMoneyString(Math.abs(diffKobo)),
    increased: diffKobo > 0,
    currency,
  }
}
