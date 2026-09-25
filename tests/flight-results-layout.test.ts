import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("Flight results page has Wakanow-style 2-column layout and cards structure", () => {
  const cardPath = path.resolve(process.cwd(), "components/flights/flight-offer-card.tsx")
  assert.ok(fs.existsSync(cardPath), "flight-offer-card.tsx must exist")
  const cardContent = fs.readFileSync(cardPath, "utf-8")

  // Must have 3-fare options
  assert.match(cardContent, /FULL PAY/i, "Must have FULL PAY option")
  assert.match(cardContent, /PRIME/i, "Must have PRIME member fare option")
  assert.match(cardContent, /PAY SMALL SMALL/i, "Must have PAY SMALL SMALL option")
  assert.match(cardContent, /Book Now/i, "Must have Book Now button")
  assert.match(cardContent, /Refundable/i, "Must have Refundable policy")
  assert.match(cardContent, /View Flight Details/i, "Must have View Flight Details toggle")

  // Best deals by airline
  const dealsPath = path.resolve(process.cwd(), "components/flights/best-deals-airline.tsx")
  assert.ok(fs.existsSync(dealsPath), "best-deals-airline.tsx must exist")
  const dealsContent = fs.readFileSync(dealsPath, "utf-8")
  assert.match(dealsContent, /Best Deals by Airline/i)
  assert.match(dealsContent, /Non stop/i)
  assert.match(dealsContent, /1 Stop/i)

  // Sidebar filters
  const sidebarPath = path.resolve(process.cwd(), "components/flights/flight-sidebar-filters.tsx")
  assert.ok(fs.existsSync(sidebarPath), "flight-sidebar-filters.tsx must exist")
  const sidebarContent = fs.readFileSync(sidebarPath, "utf-8")
  assert.match(sidebarContent, /Stops/i)
  assert.match(sidebarContent, /Checked Bags/i)
  assert.match(sidebarContent, /Departure Time/i)

  // Nearby dates bar
  const datesPath = path.resolve(process.cwd(), "components/flights/nearby-dates-bar.tsx")
  assert.ok(fs.existsSync(datesPath), "nearby-dates-bar.tsx must exist")
  const datesContent = fs.readFileSync(datesPath, "utf-8")
  assert.match(datesContent, /todayStr/i, "Must check todayStr to prevent past dates")
  assert.match(datesContent, /canGoPrev/i, "Must have canGoPrev guard to prevent navigating into the past")

  // Alphaa prime banner
  const primePath = path.resolve(process.cwd(), "components/flights/alphaa-prime-banner.tsx")
  assert.ok(fs.existsSync(primePath), "alphaa-prime-banner.tsx must exist")
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
  const todayStr = formatYMD(now.getFullYear(), now.getMonth() + 1, now.getDate())

  // Test 1: Base is today
  const daysFromToday = Math.max(0, diffDays(todayStr, todayStr))
  const defaultStartDay = Math.max(0, daysFromToday - 3)
  const currentStartDay = Math.max(0, defaultStartDay + 0)
  const tabsToday = [0, 1, 2, 3, 4, 5, 6].map((idx) => addDays(todayStr, currentStartDay + idx))

  for (const d of tabsToday) {
    assert.ok(d >= todayStr, `Date ${d} must be >= today ${todayStr}`)
  }
  assert.equal(tabsToday[0], todayStr, "First tab must be today when base is today")

  // Test 2: Base is tomorrow
  const tomorrow = addDays(todayStr, 1)
  const diffTomorrow = Math.max(0, diffDays(tomorrow, todayStr))
  const startTomorrow = Math.max(0, diffTomorrow - 3)
  const tabsTomorrow = [0, 1, 2, 3, 4, 5, 6].map((idx) => addDays(todayStr, startTomorrow + idx))

  for (const d of tabsTomorrow) {
    assert.ok(d >= todayStr, `Date ${d} for tomorrow search must be >= today ${todayStr}`)
  }
  assert.equal(tabsTomorrow[0], todayStr, "Earliest tab cannot be before today")

  // Test 3: Base is 15 days in the future
  const future15 = addDays(todayStr, 15)
  const diff15 = Math.max(0, diffDays(future15, todayStr))
  const start15 = Math.max(0, diff15 - 3)
  const tabs15 = [0, 1, 2, 3, 4, 5, 6].map((idx) => addDays(todayStr, start15 + idx))

  for (const d of tabs15) {
    assert.ok(d >= todayStr, `Date ${d} for future search must be >= today ${todayStr}`)
  }
})
