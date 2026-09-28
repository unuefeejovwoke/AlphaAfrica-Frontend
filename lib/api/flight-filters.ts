import type { FlightOfferDisplay } from "./flights.ts"

/**
 * Live filter/sort selectors — Phase 3, ticket 04 (spec stories 9–11).
 *
 * Client-side over accumulated FlightOfferDisplay cards (international
 * offers and domestic cards share this shape after normalize), so filters
 * apply instantly — including to cards that arrive mid-stream — with no
 * backend refetch per change. Pure functions; the TDD seam is filterOffers
 * and sortOffers over known literal card inputs.
 *
 * Defensive rule: a card missing the filtered field (unknown price,
 * duration, departure, airline, cabin) always passes that predicate.
 * Missing domestic fields must never hide a bookable option or crash.
 */

export type FlightSortKey = "recommended" | "cheapest" | "fastest" | "earliest"

export const FLIGHT_SORT_KEYS: readonly FlightSortKey[] = [
  "recommended",
  "cheapest",
  "fastest",
  "earliest",
]

/** Named departure windows in airport-local wall-clock hours. */
export type DepartureWindow = "morning" | "afternoon" | "evening" | "night"

/** Preset price ceilings stay as shortcuts; live maxima extend them for long-haul. */
export interface PriceCeilingOption {
  label: string
  value: number | null
}

export const PRESET_PRICE_CEILINGS: readonly PriceCeilingOption[] = [
  { label: "Any price", value: null },
  { label: "Under ₦150k", value: 150_000 },
  { label: "Under ₦300k", value: 300_000 },
  { label: "Under ₦600k", value: 600_000 },
]

export interface DurationCeilingOption {
  label: string
  value: number | null
}

export const PRESET_DURATION_CEILINGS: readonly DurationCeilingOption[] = [
  { label: "Any duration", value: null },
  { label: "Under 2 hrs", value: 120 },
  { label: "Under 5 hrs", value: 300 },
  { label: "Under 10 hrs", value: 600 },
]

function formatNairaCeiling(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    const text = Number.isInteger(m) ? String(m) : m.toFixed(1)
    return `Under ₦${text}M`
  }
  return `Under ₦${Math.round(value / 1000)}k`
}

function formatDurationCeiling(minutes: number): string {
  if (minutes < 60) return `Under ${minutes} min`
  const hours = minutes / 60
  const text = Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
  return `Under ${text} hrs`
}

/** Round a maximum up to a nice 1/2/5 × 10ⁿ step so ceilings read cleanly. */
function roundUpNice(value: number): number {
  if (value <= 0) return value
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

interface CeilingOption {
  label: string
  value: number | null
}

/**
 * Shared ceiling derivation: scan the live maximum, keep presets when it fits
 * domestic scale, otherwise extend with nice dynamic steps up to the rounded
 * maximum. Unknown values never shrink the list.
 */
function deriveCeilings<T extends CeilingOption>(args: {
  displays: FlightOfferDisplay[]
  readValue: (display: FlightOfferDisplay) => number | null
  presets: readonly T[]
  presetMax: number
  candidates: readonly number[]
  formatLabel: (value: number) => string
}): T[] {
  const { displays, readValue, presets, presetMax, candidates, formatLabel } =
    args
  const out = [...presets]
  let max: number | null = null
  for (const display of displays) {
    const value = readValue(display)
    if (value !== null && (max === null || value > max)) max = value
  }
  if (max === null || max <= presetMax) return out
  const roundedMax = roundUpNice(max)
  for (const candidate of candidates) {
    if (candidate < roundedMax) {
      out.push({ label: formatLabel(candidate), value: candidate } as T)
    }
  }
  out.push({ label: formatLabel(roundedMax), value: roundedMax } as T)
  return out
}

/**
 * Price ceilings derived from live results so international fares stay
 * refinable. Existing preset labels remain as shortcuts; when the live
 * maximum exceeds the domestic-scale presets, nice dynamic ceilings extend
 * the list up to the rounded maximum. Unknown prices never shrink the list.
 */
export function derivePriceCeilings(
  displays: FlightOfferDisplay[]
): PriceCeilingOption[] {
  return deriveCeilings({
    displays,
    readValue: (display) => parseNairaAmount(display.price),
    presets: PRESET_PRICE_CEILINGS,
    presetMax: 600_000,
    candidates: [1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000],
    formatLabel: formatNairaCeiling,
  })
}

/**
 * Duration ceilings derived from live results. Presets remain; longer
 * itineraries (connections, long-haul) extend the list to the rounded max.
 */
export function deriveDurationCeilings(
  displays: FlightOfferDisplay[]
): DurationCeilingOption[] {
  return deriveCeilings({
    displays,
    readValue: (display) => parseDurationMinutes(display.duration),
    presets: PRESET_DURATION_CEILINGS,
    presetMax: 600,
    candidates: [720, 900, 1200, 1500, 1800, 2400],
    formatLabel: formatDurationCeiling,
  })
}

/** [startHourInclusive, endHourExclusive) — night wraps past midnight. */
const DEPARTURE_WINDOW_RANGES: Record<DepartureWindow, [number, number]> = {
  morning: [5, 12],
  afternoon: [12, 17],
  evening: [17, 21],
  night: [21, 5],
}

export const DEPARTURE_WINDOWS: readonly DepartureWindow[] = [
  "morning",
  "afternoon",
  "evening",
  "night",
]

const DEPARTURE_WINDOW_TITLES: Record<DepartureWindow, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
}

function formatClockHour(hour: number): string {
  return `${String(((hour % 24) + 24) % 24).padStart(2, "0")}:00`
}

/**
 * Single source for departure-window labels: copy is derived from the same
 * ranges the filter uses, so the UI can never contradict the behaviour.
 */
export const DEPARTURE_WINDOW_SLOTS: readonly {
  key: DepartureWindow
  title: string
  time: string
}[] = DEPARTURE_WINDOWS.map((key) => {
  const [start, end] = DEPARTURE_WINDOW_RANGES[key]
  const wraps = end <= start
  return {
    key,
    title: DEPARTURE_WINDOW_TITLES[key],
    time: `${formatClockHour(start)} - ${formatClockHour(end)}${wraps ? " (next day)" : ""}`,
  }
})

export interface FlightFilters {
  /** NGN ceiling; null = any price. */
  maxPriceNgn: number | null
  /** Duration ceiling in minutes; null = any duration. */
  maxDurationMin: number | null
  /**
   * Allowed stop counts. `2` means two or more stops (exact match, or
   * stops > 2 when 2 is allowed). Null/empty = any stops.
   */
  stops: number[] | null
  /** Allowed departure windows; null/empty = all day. */
  departureWindows: DepartureWindow[] | null
  /** Allowed airlines (exact display-name match); null/empty = all. */
  airlines: string[] | null
  /** Required cabin (case-insensitive); null = any cabin. */
  cabin: string | null
}

export const DEFAULT_FILTERS: FlightFilters = {
  maxPriceNgn: null,
  maxDurationMin: null,
  stops: null,
  departureWindows: null,
  airlines: null,
  cabin: null,
}

export const DEFAULT_SORT: FlightSortKey = "recommended"

/** True when at least one filter narrows the accumulated results. */
export function hasActiveFilters(filters: FlightFilters): boolean {
  return (
    filters.maxPriceNgn !== null ||
    filters.maxDurationMin !== null ||
    (filters.stops !== null && filters.stops.length > 0) ||
    (filters.departureWindows !== null &&
      filters.departureWindows.length > 0) ||
    (filters.airlines !== null && filters.airlines.length > 0) ||
    (filters.cabin !== null && filters.cabin !== "")
  )
}

// ---------------------------------------------------------------------------
// Defensive numeric parsers — display strings back to comparable numbers.
// Every parser returns null for the "—" placeholder or anything it cannot
// read; callers treat null as "unknown, never exclude".
// ---------------------------------------------------------------------------

/** "₦185,000" / "NGN 185000" / "185000.00" / 185000 → 185000; "—" → null. */
export function parseNairaAmount(price: string): number | null {
  if (typeof price !== "string") return null
  const cleaned = price.replace(/^(NGN|₦)\s*/i, "").replace(/[₦,\s]/g, "")
  if (!cleaned || cleaned === "—" || cleaned === "-") return null
  const value = Number(cleaned)
  return Number.isFinite(value) && value >= 0 ? value : null
}

const DURATION_TOKEN = /(\d+(?:\.\d+)?)\s*([hHmM])/g

/** "1h 15m" / "PT2H35M" / "45m" → minutes; "—" → null. */
export function parseDurationMinutes(duration: string): number | null {
  if (typeof duration !== "string") return null
  const trimmed = duration.trim()
  if (!trimmed || trimmed === "—") return null
  DURATION_TOKEN.lastIndex = 0
  let total = 0
  let matched = false
  for (
    let m = DURATION_TOKEN.exec(trimmed);
    m !== null;
    m = DURATION_TOKEN.exec(trimmed)
  ) {
    matched = true
    const value = Number(m[1])
    if (!Number.isFinite(value)) return null
    total += m[2].toLowerCase() === "h" ? value * 60 : value
  }
  if (matched) return total
  // Bare number — treat as minutes (some domestic cards emit "95").
  const bare = Number(trimmed)
  return Number.isFinite(bare) && bare >= 0 ? bare : null
}

/**
 * "08:30" / "08:30:00" → minutes since midnight; "—" → null.
 * Also reads the wall-clock time out of raw ISO datetimes
 * ("2026-10-10T08:30:00") so unformatted domestic cards sort and filter
 * instead of sinking to the end.
 */
export function parseDepartureMinutes(departureAt: string): number | null {
  if (typeof departureAt !== "string") return null
  const text = departureAt.trim()
  const isoTime = text.match(/T(\d{1,2}):(\d{2})/)
  const match = isoTime ?? text.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function inWindow(minutes: number, window: DepartureWindow): boolean {
  const [start, end] = DEPARTURE_WINDOW_RANGES[window]
  const hour = Math.floor(minutes / 60) % 24
  return start <= end
    ? hour >= start && hour < end
    : hour >= start || hour < end
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/**
 * Single-pass filter (js-combine-iterations): every predicate runs in one
 * loop over the accumulated cards. Unknown fields pass their predicate.
 */
export function filterOffers(
  displays: FlightOfferDisplay[],
  filters: FlightFilters
): FlightOfferDisplay[] {
  if (!hasActiveFilters(filters)) return [...displays]
  const allowedStops =
    filters.stops !== null && filters.stops.length > 0
      ? new Set(filters.stops)
      : null
  const allowedWindows =
    filters.departureWindows !== null && filters.departureWindows.length > 0
      ? new Set(filters.departureWindows)
      : null
  const allowedAirlines =
    filters.airlines !== null && filters.airlines.length > 0
      ? new Set(filters.airlines)
      : null
  const requiredCabin = filters.cabin
    ? filters.cabin.trim().toUpperCase()
    : null

  const out: FlightOfferDisplay[] = []
  for (const display of displays) {
    if (filters.maxPriceNgn !== null) {
      const price = parseNairaAmount(display.price)
      if (price !== null && price > filters.maxPriceNgn) continue
    }
    if (filters.maxDurationMin !== null) {
      const minutes = parseDurationMinutes(display.duration)
      if (minutes !== null && minutes > filters.maxDurationMin) continue
    }
    if (allowedStops) {
      // Trip-wide stop count (guide `max_stops_in_trip`): a mixed 0-stop +
      // 1-stop round trip filters as 1 stop, never Direct.
      const stops = display.maxStopsInTrip ?? display.stops
      const exact = allowedStops.has(stops)
      const twoPlus = allowedStops.has(2) && stops > 2
      if (!exact && !twoPlus) continue
    }
    if (allowedWindows) {
      const minutes = parseDepartureMinutes(display.departureAt)
      if (minutes !== null) {
        let inAny = false
        for (const window of allowedWindows) {
          if (inWindow(minutes, window)) {
            inAny = true
            break
          }
        }
        if (!inAny) continue
      }
    }
    if (allowedAirlines && !allowedAirlines.has(display.airline)) continue
    if (
      requiredCabin &&
      display.cabin &&
      display.cabin.trim().toUpperCase() !== requiredCabin
    )
      continue
    out.push(display)
  }
  return out
}

/**
 * Immutable sort (js-tosorted-immutable): recommended preserves
 * accumulation order; unparseable values sink to the end, never crash.
 */
export function sortOffers(
  displays: FlightOfferDisplay[],
  sort: FlightSortKey
): FlightOfferDisplay[] {
  if (sort === "recommended") return [...displays]
  return displays.toSorted((a, b) => {
    if (sort === "cheapest") {
      const pa = parseNairaAmount(a.price)
      const pb = parseNairaAmount(b.price)
      if (pa === null && pb === null) return 0
      if (pa === null) return 1
      if (pb === null) return -1
      return pa - pb
    }
    if (sort === "fastest") {
      const da = parseDurationMinutes(a.duration)
      const db = parseDurationMinutes(b.duration)
      if (da === null && db === null) return 0
      if (da === null) return 1
      if (db === null) return -1
      return da - db
    }
    const ea = parseDepartureMinutes(a.departureAt)
    const eb = parseDepartureMinutes(b.departureAt)
    if (ea === null && eb === null) return 0
    if (ea === null) return 1
    if (eb === null) return -1
    return ea - eb
  })
}

// ---------------------------------------------------------------------------
// URL codec — filter/sort state rides safe primitives in searchParams so
// back, refresh, and share preserve refinement (story 30). Never opaque
// blobs, tokens, or PII. Invalid values are dropped, never thrown.
// ---------------------------------------------------------------------------

/** Cabin codes the UI offers — anything else in the URL is dropped, never applied. */
const KNOWN_CABINS: readonly string[] = [
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
]

/** Param keys owned by filters — excluded from the auto-search needle. */
export const FILTER_PARAM_KEYS = [
  "sort",
  "f_max_price",
  "f_max_dur",
  "f_stops",
  "f_dep",
  "f_air",
  "f_cabin",
] as const

export interface FilterUrlState {
  filters: FlightFilters
  sort: FlightSortKey
}

function parsePositiveInt(raw: string | null): number | null {
  if (raw === null || raw === "") return null
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : null
}

function parseCsv(raw: string | null): string[] | null {
  if (raw === null || raw === "") return null
  const values = raw
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v !== "")
  return values.length > 0 ? values : null
}

/** Read filter/sort state from URL — tolerant, never throws. */
export function readFilterState(searchParams: URLSearchParams): FilterUrlState {
  const sortRaw = searchParams.get("sort")
  const sort: FlightSortKey = (FLIGHT_SORT_KEYS as readonly string[]).includes(
    sortRaw ?? ""
  )
    ? (sortRaw as FlightSortKey)
    : DEFAULT_SORT

  const stopsRaw = parseCsv(searchParams.get("f_stops"))
  const stops = stopsRaw
    ? stopsRaw.map(Number).filter((n) => n === 0 || n === 1 || n === 2)
    : null

  const depRaw = parseCsv(searchParams.get("f_dep"))
  const departureWindows = depRaw
    ? (depRaw.filter((w): w is DepartureWindow =>
        (DEPARTURE_WINDOWS as readonly string[]).includes(w)
      ) as DepartureWindow[])
    : null

  const cabinRaw = searchParams.get("f_cabin")?.trim().toUpperCase()
  const cabin =
    cabinRaw && (KNOWN_CABINS as readonly string[]).includes(cabinRaw)
      ? cabinRaw
      : null

  return {
    filters: {
      maxPriceNgn: parsePositiveInt(searchParams.get("f_max_price")),
      maxDurationMin: parsePositiveInt(searchParams.get("f_max_dur")),
      stops: stops && stops.length > 0 ? [...new Set(stops)] : null,
      departureWindows:
        departureWindows && departureWindows.length > 0
          ? [...new Set(departureWindows)]
          : null,
      airlines: parseCsv(searchParams.get("f_air")),
      cabin,
    },
    sort,
  }
}

/** Write filter/sort state onto params (mutates and returns the same object). */
export function writeFilterState(
  searchParams: URLSearchParams,
  filters: FlightFilters,
  sort: FlightSortKey
): URLSearchParams {
  for (const key of FILTER_PARAM_KEYS) searchParams.delete(key)
  if (sort !== DEFAULT_SORT) searchParams.set("sort", sort)
  if (filters.maxPriceNgn !== null)
    searchParams.set("f_max_price", String(filters.maxPriceNgn))
  if (filters.maxDurationMin !== null)
    searchParams.set("f_max_dur", String(filters.maxDurationMin))
  if (filters.stops !== null && filters.stops.length > 0) {
    searchParams.set("f_stops", [...new Set(filters.stops)].join(","))
  }
  if (
    filters.departureWindows !== null &&
    filters.departureWindows.length > 0
  ) {
    searchParams.set("f_dep", [...new Set(filters.departureWindows)].join(","))
  }
  if (filters.airlines !== null && filters.airlines.length > 0) {
    searchParams.set("f_air", filters.airlines.join(","))
  }
  if (filters.cabin) searchParams.set("f_cabin", filters.cabin)
  return searchParams
}

/** Stable serialization for change detection (URL sync, back/forward adopt). */
export function serializeFilterState(
  filters: FlightFilters,
  sort: FlightSortKey
): string {
  return JSON.stringify([
    sort,
    filters.maxPriceNgn,
    filters.maxDurationMin,
    filters.stops ? [...filters.stops].sort((a, b) => a - b) : null,
    filters.departureWindows ? [...filters.departureWindows].sort() : null,
    filters.airlines ? [...filters.airlines].sort() : null,
    filters.cabin,
  ])
}

/** Number of refined groups — drives the mobile trigger badge. */
export function countActiveFilterGroups(
  filters: FlightFilters,
  sort: FlightSortKey
): number {
  return (
    (filters.maxPriceNgn !== null ? 1 : 0) +
    (filters.maxDurationMin !== null ? 1 : 0) +
    (filters.stops !== null && filters.stops.length > 0 ? 1 : 0) +
    (filters.departureWindows !== null && filters.departureWindows.length > 0
      ? 1
      : 0) +
    (filters.airlines !== null && filters.airlines.length > 0 ? 1 : 0) +
    (filters.cabin !== null ? 1 : 0) +
    (sort !== DEFAULT_SORT ? 1 : 0)
  )
}
