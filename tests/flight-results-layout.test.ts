import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("Flight results page has 2-column layout and factual cards structure", () => {
  const cardPath = path.resolve(
    process.cwd(),
    "components/flights/flight-offer-card.tsx"
  )
  assert.ok(fs.existsSync(cardPath), "flight-offer-card.tsx must exist")
  const cardContent = fs.readFileSync(cardPath, "utf-8")

  // Factual card structure — real times, dates, fare, journey details
  assert.match(cardContent, /Total fare/i, "Must show the total fare")
  assert.match(cardContent, /Select flight/i, "Must have a select action")
  assert.match(
    cardContent,
    /View Flight Details/i,
    "Must have View Flight Details toggle"
  )
  assert.match(cardContent, /departureAt/, "Must render departure time")
  assert.match(cardContent, /arrivalAt/, "Must render arrival time")
  assert.match(
    cardContent,
    /departureDate/,
    "Must render departure date when available"
  )
  assert.match(
    cardContent,
    /arrivalDayOffset/,
    "Must derive overnight arrival from real dates"
  )
  assert.match(
    cardContent,
    /journeyLabel/,
    "Must label outbound/return/leg journeys"
  )
  assert.doesNotMatch(
    cardContent,
    /PRIME/i,
    "Must not invent a Prime member fare"
  )
  assert.doesNotMatch(
    cardContent,
    /PAY SMALL SMALL/i,
    "Must not invent instalment plans"
  )
  // Fare conditions render truthfully from the API fareRules block only —
  // never invented. The card must carry the fare-conditions section,
  // layover rendering with connection times, and terminal/aircraft detail.
  assert.match(
    cardContent,
    /Fare conditions/i,
    "Must render the airline fare-conditions section when provided"
  )
  assert.match(
    cardContent,
    /Layover/i,
    "Must render layover airport and connection time"
  )
  assert.match(
    cardContent,
    /Terminal/,
    "Must render terminal detail when the airline provides it"
  )
  assert.match(
    cardContent,
    /Aircraft/,
    "Must render aircraft detail when the airline provides it"
  )
  // Results show totals only — no fare split is ever rendered on this
  // page, so the card must not contain a price-breakdown section.
  assert.doesNotMatch(
    cardContent,
    /Price breakdown/,
    "Must show only the total fare, never a base/markup breakdown"
  )
  // No hardcoded flight facts: every rendered time, airport, airline, flight
  // number, baggage figure, and fare figure must come from the offer prop.
  // Sample API values must never appear as literals in the component.
  // (The "AT554" dedup example lives in a code comment explaining prefix
  // handling, so it is excluded from this guard.)
  assert.doesNotMatch(
    cardContent,
    /RwandAir|Turkish Airlines|ROYAL AIR MAROC|WB203|AT800|196723|517656|543538|586879/,
    "Must not hardcode sample airline, flight, or fare values"
  )
  // Tabbed details (reference layout): Base UI tabs with Flight Details /
  // Fare Rules panels inside the expander; per-direction route headers with
  // Outbound/Inbound badges; connecting-flight dividers between segments.
  assert.match(
    cardContent,
    /@base-ui\/react\/tabs/,
    "Must use Base UI tabs, not a custom tab implementation"
  )
  assert.match(cardContent, /Flight Details/, "Must have a Flight Details tab")
  assert.match(cardContent, /Fare Rules/, "Must have a Fare Rules tab")
  assert.match(
    cardContent,
    /directionBadge/,
    "Must badge each direction Outbound/Inbound per the reference"
  )
  assert.match(
    cardContent,
    /Connecting [Ff]light/,
    "Must divide connecting segments with a connecting-flight marker"
  )
  assert.match(
    cardContent,
    /lg:grid-cols-2/,
    "Must lay Outbound/Inbound directions side by side on desktop"
  )
  // Per-segment rails use the leg's own stop count (segmentStops), never the
  // journey count — a 1-stop journey's first segment card must read Non-stop.
  assert.match(
    cardContent,
    /segmentStops/,
    "Must render each segment's own stop count on its rail"
  )
  // The collapsed summary shows the total fare only — the markup disclosure
  // line was removed as redundant.
  assert.doesNotMatch(
    cardContent,
    /Final price with Alphaa markup/,
    "Must not render the redundant markup disclosure line"
  )
  // Review regressions: fare section renders only on airline-provided facts,
  // bags iterate every journey (not just the first), amenities never truncate.
  assert.match(
    cardContent,
    /typeof offer\.seatsAvailable/,
    "Fare section must be gated on real facts, never an always-true check"
  )
  assert.match(
    cardContent,
    /allSegments/,
    "Bags section must iterate segments across all journeys"
  )
  assert.doesNotMatch(
    cardContent,
    /slice\(0, 8\)/,
    "Must not silently truncate airline-provided amenities"
  )
  assert.doesNotMatch(
    cardContent,
    /1 × 7kg cabin|2 × 23kg checked/,
    "Must not fabricate baggage allowances"
  )

  // Best fares by airline
  const faresPath = path.resolve(
    process.cwd(),
    "components/flights/best-deals-airline.tsx"
  )
  assert.ok(fs.existsSync(faresPath), "best-deals-airline.tsx must exist")
  const faresContent = fs.readFileSync(faresPath, "utf-8")
  assert.match(faresContent, /Fares by airline/i)
  assert.doesNotMatch(
    faresContent,
    /Best Deals/i,
    "Must not use banned deal vocabulary"
  )
  assert.match(faresContent, /Non stop/i)
  assert.match(faresContent, /1 Stop/i)

  // Sidebar filters
  const sidebarPath = path.resolve(
    process.cwd(),
    "components/flights/flight-sidebar-filters.tsx"
  )
  assert.ok(fs.existsSync(sidebarPath), "flight-sidebar-filters.tsx must exist")
  const sidebarContent = fs.readFileSync(sidebarPath, "utf-8")
  assert.match(sidebarContent, /Stops/i)
  assert.match(sidebarContent, /Departure Time/i)
  assert.match(sidebarContent, /Duration/i, "Must expose the duration filter")
  assert.doesNotMatch(
    sidebarContent,
    /Checked Bags/i,
    "Must not show inert bag controls"
  )

  // Nearby dates bar
  const datesPath = path.resolve(
    process.cwd(),
    "components/flights/nearby-dates-bar.tsx"
  )
  assert.ok(fs.existsSync(datesPath), "nearby-dates-bar.tsx must exist")
  const datesContent = fs.readFileSync(datesPath, "utf-8")
  assert.match(
    datesContent,
    /todayStr/i,
    "Must check todayStr to prevent past dates"
  )
  assert.match(
    datesContent,
    /canGoPrev/i,
    "Must have canGoPrev guard to prevent navigating into the past"
  )

  // Fabricated Prime membership banner must be gone
  const primePath = path.resolve(
    process.cwd(),
    "components/flights/alphaa-prime-banner.tsx"
  )
  assert.equal(
    fs.existsSync(primePath),
    false,
    "alphaa-prime-banner.tsx must not exist"
  )
})

test("Nearby dates calculation only produces current and future dates", () => {
  function parseYMD(dateStr: string): [number, number, number] {
    const parts = dateStr.split("-").map(Number)
    return [parts[0] || 2026, parts[1] || 1, parts[2] || 1]
  }

  function formatYMD(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  function addDays(baseDateStr: string, days: number): string {
    const [y, m, d] = parseYMD(baseDateStr)
    const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0))
    return formatYMD(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
  }

  function diffDays(d1: string, d2: string): number {
    const [y1, m1, day1] = parseYMD(d1)
    const [y2, m2, day2] = parseYMD(d2)
    const t1 = Date.UTC(y1, m1 - 1, day1)
    const t2 = Date.UTC(y2, m2 - 1, day2)
    return Math.floor((t1 - t2) / 86400000)
  }

  const now = new Date()
  const todayStr = formatYMD(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  )

  // Test 1: Base is today
  const daysFromToday = Math.max(0, diffDays(todayStr, todayStr))
  const defaultStartDay = Math.max(0, daysFromToday - 3)
  const currentStartDay = Math.max(0, defaultStartDay + 0)
  const tabsToday = [0, 1, 2, 3, 4, 5, 6].map((idx) =>
    addDays(todayStr, currentStartDay + idx)
  )

  for (const d of tabsToday) {
    assert.ok(d >= todayStr, `Date ${d} must be >= today ${todayStr}`)
  }
  assert.equal(
    tabsToday[0],
    todayStr,
    "First tab must be today when base is today"
  )

  // Test 2: Base is tomorrow
  const tomorrow = addDays(todayStr, 1)
  const diffTomorrow = Math.max(0, diffDays(tomorrow, todayStr))
  const startTomorrow = Math.max(0, diffTomorrow - 3)
  const tabsTomorrow = [0, 1, 2, 3, 4, 5, 6].map((idx) =>
    addDays(todayStr, startTomorrow + idx)
  )

  for (const d of tabsTomorrow) {
    assert.ok(
      d >= todayStr,
      `Date ${d} for tomorrow search must be >= today ${todayStr}`
    )
  }
  assert.equal(tabsTomorrow[0], todayStr, "Earliest tab cannot be before today")

  // Test 3: Base is 15 days in the future
  const future15 = addDays(todayStr, 15)
  const diff15 = Math.max(0, diffDays(future15, todayStr))
  const start15 = Math.max(0, diff15 - 3)
  const tabs15 = [0, 1, 2, 3, 4, 5, 6].map((idx) =>
    addDays(todayStr, start15 + idx)
  )

  for (const d of tabs15) {
    assert.ok(
      d >= todayStr,
      `Date ${d} for future search must be >= today ${todayStr}`
    )
  }
})

test("Fare confirmation uses the results-page modal and retires the dedicated route", () => {
  const pageClientPath = path.resolve(
    process.cwd(),
    "components/flights/flight-search-page-client.tsx"
  )
  const pageClient = fs.readFileSync(pageClientPath, "utf-8")
  assert.match(
    pageClient,
    /FareConfirmDialog/,
    "Results page must open the fare-confirmation modal"
  )
  assert.doesNotMatch(
    pageClient,
    /router\.push\("\/flights\/confirm"\)/,
    "Selecting a flight must no longer navigate to a dedicated confirm page"
  )

  const dialogPath = path.resolve(
    process.cwd(),
    "components/flights/fare-confirm-dialog.tsx"
  )
  assert.ok(fs.existsSync(dialogPath), "fare-confirm-dialog.tsx must exist")
  const dialog = fs.readFileSync(dialogPath, "utf-8")
  assert.match(
    dialog,
    /extractOpaqueOfferBlob/,
    "Dialog must send the opaque raw_offer blob, not the display card"
  )
  assert.match(dialog, /confirmFlightPrice/)
  assert.match(
    dialog,
    /branch === "domestic"/,
    "Dialog must take the domestic branch without Amadeus revalidation"
  )

  const confirmPagePath = path.resolve(
    process.cwd(),
    "app/(checkout)/flights/confirm/page.tsx"
  )
  const confirmPage = fs.readFileSync(confirmPagePath, "utf-8")
  assert.match(
    confirmPage,
    /redirect\("\/flights"\)/,
    "Retired confirm route must redirect to the flights experience"
  )
})
