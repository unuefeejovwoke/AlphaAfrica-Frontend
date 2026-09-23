/**
 * Display formatting for backend decimal strings (Phase 2).
 * Prices arrive as decimal strings (e.g. `"250000.00"`); cards show whole
 * Naira with grouping (e.g. `₦250,000`). Non-numeric input falls back to
 * the raw string so a formatting bug never hides a price.
 */

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
})

export function formatNaira(amount: string): string {
  const value = Number(amount)
  if (amount.trim().length === 0 || Number.isNaN(value)) {
    return amount
  }
  return nairaFormatter.format(value)
}
