/**
 * Date helpers shared across domains (production hardening, 23).
 *
 * One local-today anchor, one strict calendar-date parser, and the YMD
 * string arithmetic the nearby-dates UI and its tests need. Everything is
 * UTC-midnight based so day-precision comparisons never drift with the time
 * of day; "today" is the host's local calendar day expressed as a UTC
 * timestamp. No DOM, no fetch — pure seams.
 */

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Parse a YYYY-MM-DD string into a UTC-midnight date, or null when impossible. */
export function parseCalendarDate(value: string): Date | null {
  if (!YMD_PATTERN.test(value)) return null
  const [y, m, d] = value.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (Number.isNaN(date.getTime())) return null
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null
  }
  return date
}

/** Start of today (local calendar day) as a UTC timestamp — day-precision comparisons. */
export function startOfTodayUtc(): number {
  const now = new Date()
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Lenient YMD triple: missing parts fall back to the current year, then January 1. */
export function parseYMD(dateStr: string): [number, number, number] {
  const parts = dateStr.split("-").map(Number)
  const currentYear = new Date().getFullYear()
  return [parts[0] || currentYear, parts[1] || 1, parts[2] || 1]
}

/** Format year/month/day (1-based) into a zero-padded YYYY-MM-DD string. */
function formatYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Today (local calendar day) as a YYYY-MM-DD string. */
export function todayYMD(): string {
  const now = new Date()
  return formatYMD(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

const MS_PER_DAY = 86_400_000

/** Offset a YYYY-MM-DD string by whole days (UTC arithmetic, noon anchor). */
export function addDays(baseDateStr: string, days: number): string {
  const [y, m, d] = parseYMD(baseDateStr)
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0))
  return formatYMD(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

/** Whole-day difference between two YYYY-MM-DD strings (UTC arithmetic). */
export function diffDays(d1: string, d2: string): number {
  const [y1, m1, day1] = parseYMD(d1)
  const [y2, m2, day2] = parseYMD(d2)
  const t1 = Date.UTC(y1, m1 - 1, day1)
  const t2 = Date.UTC(y2, m2 - 1, day2)
  return Math.floor((t1 - t2) / MS_PER_DAY)
}
