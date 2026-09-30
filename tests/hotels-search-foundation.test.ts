import test from "node:test"
import assert from "node:assert/strict"

// Seam 1 (pre-agreed): hotel search query validation — single free-text
// destination (empty = browse-all), date-pair both-or-neither with real
// calendar dates + check-out after check-in + neither in the past,
// guests/rooms minimums of one. Vertical tracer slice: one failing test
// then minimal implementation.

import {
  buildHotelSearchParams,
  describeHotelStay,
  hasHotelSearchParams,
  hotelSearchQuerySchema,
  parseHotelSearchParams,
  validateHotelSearchQuery,
} from "../lib/api/hotels.ts"

function futureDate(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

test("Hotel search validation: empty destination browses all, trimming, date-pair rules, counter minimums", () => {
  const checkIn = futureDate(14)
  const checkOut = futureDate(16)

  // Empty destination = browse-all paginated (valid with defaults).
  const browseAll = hotelSearchQuerySchema.safeParse({})
  assert.equal(browseAll.success, true, "Empty search must pass as browse-all")
  if (browseAll.success) {
    assert.equal(browseAll.data.destination, "")
    assert.equal(browseAll.data.guests, 2)
    assert.equal(browseAll.data.rooms, 1)
    assert.equal(browseAll.data.page, 1)
  }

  // Destination trimming: padded input trims, whitespace-only stays browse-all.
  const trimmed = hotelSearchQuerySchema.safeParse({ destination: "  Lagos  " })
  assert.equal(trimmed.success, true)
  if (trimmed.success) assert.equal(trimmed.data.destination, "Lagos")

  const blank = hotelSearchQuerySchema.safeParse({ destination: "   " })
  assert.equal(blank.success, true)
  if (blank.success) assert.equal(blank.data.destination, "")

  // Valid dated search passes.
  const dated = hotelSearchQuerySchema.safeParse({
    destination: "Lagos",
    check_in: checkIn,
    check_out: checkOut,
    guests: 2,
    rooms: 1,
  })
  assert.equal(dated.success, true, "Valid dated search must pass")

  // Partial dates rejected (both or neither).
  const onlyIn = hotelSearchQuerySchema.safeParse({ check_in: checkIn })
  assert.equal(onlyIn.success, false, "Check-in without check-out must fail")
  if (!onlyIn.success) {
    assert.ok(
      onlyIn.error.issues.some((i) => i.path.join(".") === "check_out"),
      "Missing check-out must point at check_out"
    )
  }

  const onlyOut = hotelSearchQuerySchema.safeParse({ check_out: checkOut })
  assert.equal(onlyOut.success, false, "Check-out without check-in must fail")
  if (!onlyOut.success) {
    assert.ok(
      onlyOut.error.issues.some((i) => i.path.join(".") === "check_in"),
      "Missing check-in must point at check_in"
    )
  }

  // Same-day rejected (check-out strictly after check-in).
  const sameDay = hotelSearchQuerySchema.safeParse({
    check_in: checkIn,
    check_out: checkIn,
  })
  assert.equal(sameDay.success, false, "Same-day check-in/out must fail")
  if (!sameDay.success) {
    assert.ok(
      sameDay.error.issues.some((i) => /after/i.test(i.message)),
      "Must report check-out after check-in"
    )
  }

  // Reversed dates rejected.
  const reversed = hotelSearchQuerySchema.safeParse({
    check_in: checkOut,
    check_out: checkIn,
  })
  assert.equal(reversed.success, false, "Reversed dates must fail")

  // Past dates rejected.
  const past = hotelSearchQuerySchema.safeParse({
    check_in: "2000-01-01",
    check_out: "2000-01-03",
  })
  assert.equal(past.success, false, "Past dates must fail")
  if (!past.success) {
    assert.ok(
      past.error.issues.some((i) => /past/i.test(i.message)),
      "Must report past date"
    )
  }

  // Impossible calendar date rejected.
  const impossible = hotelSearchQuerySchema.safeParse({
    check_in: "2026-02-30",
    check_out: futureDate(20),
  })
  assert.equal(impossible.success, false, "Impossible date must fail")

  // Counter minimums of one.
  const zeroGuests = hotelSearchQuerySchema.safeParse({ guests: 0, rooms: 1 })
  assert.equal(zeroGuests.success, false, "Zero guests must fail")

  const zeroRooms = hotelSearchQuerySchema.safeParse({ guests: 2, rooms: 0 })
  assert.equal(zeroRooms.success, false, "Zero rooms must fail")

  // URL-untrusted guard: a shared link with only one date is rejected before
  // any backend request, while a valid link passes.
  const partialUrl = parseHotelSearchParams({ check_in: futureDate(14) })
  const guard = validateHotelSearchQuery(partialUrl)
  assert.equal(
    guard.success,
    false,
    "A shared link with one date must be rejected"
  )
  if (!guard.success) assert.match(guard.message, /check-out/i)
  const validUrl = parseHotelSearchParams({
    destination: "Lagos",
    guests: "2",
    rooms: "1",
  })
  assert.equal(
    validateHotelSearchQuery(validUrl).success,
    true,
    "A valid link must pass the guard"
  )
})

// Seam 2 (pre-agreed): URL round-trip — shareable URL search state
// (back/refresh/share restore). Pure helpers parse/build without leaking
// sensitive keys; invalid values are dropped, valid values round-trip.

test("Hotel URL round-trip preserves shareable search state and drops invalid values without leaking sensitivity", () => {
  const checkIn = futureDate(14)
  const checkOut = futureDate(16)

  // Valid query round-trips through URL and back.
  const original = hotelSearchQuerySchema.parse({
    destination: "Lagos",
    check_in: checkIn,
    check_out: checkOut,
    guests: 3,
    rooms: 2,
    page: 2,
  })

  const params = buildHotelSearchParams(original)
  assert.match(params, /destination=Lagos/)
  assert.match(params, /check_in=/)
  assert.match(params, /check_out=/)
  assert.match(params, /guests=3/)
  assert.match(params, /rooms=2/)
  assert.match(params, /page=2/)
  // Never leak sensitive keys.
  assert.ok(
    !/token|password|card|payment|secret|pnr|reference/i.test(params),
    "URL must not leak sensitive keys"
  )

  const reparsed = parseHotelSearchParams(
    Object.fromEntries(new URLSearchParams(params))
  )
  assert.equal(reparsed.destination, original.destination)
  assert.equal(reparsed.check_in, original.check_in)
  assert.equal(reparsed.check_out, original.check_out)
  assert.equal(reparsed.guests, original.guests)
  assert.equal(reparsed.rooms, original.rooms)
  assert.equal(reparsed.page, original.page)

  // Browse-all (empty destination) is the clean entry: the listing no
  // longer collects dates or a party, so defaults are omitted and the URL
  // stays shareable without implying filters that do not exist.
  const browseAll = hotelSearchQuerySchema.parse({})
  const browseParams = buildHotelSearchParams(browseAll)
  assert.equal(browseParams, "", "Browse-all must be the clean entry")
  assert.ok(
    !/destination|check_in|check_out|guests|rooms|page/.test(browseParams),
    "Browse-all must omit empty fields and default party"
  )
  const reparsedBrowse = parseHotelSearchParams(
    Object.fromEntries(new URLSearchParams(browseParams))
  )
  assert.equal(reparsedBrowse.destination, "")
  assert.equal(reparsedBrowse.guests, 2)
  assert.equal(reparsedBrowse.rooms, 1)
  assert.equal(reparsedBrowse.page, 1)

  // Idle landing (no params at all) is the clean entry too. Only listing
  // state (destination, server filters, page) marks a results view —
  // legacy party-only URLs carry no listing state.
  assert.equal(
    hasHotelSearchParams({}),
    false,
    "No params must read as the idle landing"
  )
  assert.equal(
    hasHotelSearchParams({ guests: "2", rooms: "1" }),
    false,
    "Party-only URLs are not listing state"
  )
  assert.equal(
    hasHotelSearchParams({ destination: "  " }),
    false,
    "Whitespace-only values are not search state"
  )
  assert.equal(
    hasHotelSearchParams({ destination: "Lagos" }),
    true,
    "A destination search must read as active"
  )

  // Invalid values are dropped, never thrown, and never appear in the URL.
  const withInvalid = parseHotelSearchParams({
    destination: "   Lagos   ",
    guests: "0",
    rooms: "-5",
    page: "0",
    token: "SECRET-should-not-appear",
  } as unknown as Record<string, string | undefined>)
  assert.equal(withInvalid.destination, "Lagos")
  assert.equal(
    withInvalid.guests,
    2,
    "Invalid guests must fall back to default"
  )
  assert.equal(withInvalid.rooms, 1, "Invalid rooms must fall back to default")
  assert.equal(withInvalid.page, 1, "Invalid page must fall back to 1")
  const builtFromInvalid = buildHotelSearchParams(withInvalid)
  assert.ok(
    !/token/i.test(builtFromInvalid),
    "Built params must not leak sensitive keys"
  )

  // Destination trimming survives round-trip.
  const trimmedBuild = buildHotelSearchParams(
    hotelSearchQuerySchema.parse({
      destination: "  Abuja  ",
      guests: 4,
      rooms: 2,
    })
  )
  const trimmedParse = parseHotelSearchParams(
    Object.fromEntries(new URLSearchParams(trimmedBuild))
  )
  assert.equal(trimmedParse.destination, "Abuja")

  // Support context carries stay state but never personal or payment data.
  const stayLine = describeHotelStay({
    destination: "Lagos",
    check_in: "2026-05-01",
    check_out: "2026-05-04",
    guests: 2,
    rooms: 1,
  })
  assert.match(stayLine, /Lagos/)
  assert.match(stayLine, /2026-05-01/)
  assert.match(stayLine, /2 guests, 1 room/)
  assert.ok(
    !/token|password|card|email|phone|reference/i.test(stayLine),
    "Stay context must not carry PII"
  )
})
