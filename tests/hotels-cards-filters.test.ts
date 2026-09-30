import test from "node:test"
import assert from "node:assert/strict"

// Ticket 02 — Hotel cards with filters, ordering, and pagination.
//
// Pre-agreed seams (no new seams proposed):
//  1. URL filter round-trip — server-side max per-night price, min stars,
//     ordering, and pagination driven from shareable URL state (ADR-0005).
//  2. Normalize/display mapping — Hotel card display with missing-image and
//     empty-amenity fallbacks, locked "from ₦X per night" pricing copy, plus
//     client-side amenity multi-select over the fetched page.
//
// Vertical tracer slices: one failing test, then minimal implementation.

import {
  HOTEL_ORDERINGS,
  buildHotelSearchParams,
  collectAmenityOptions,
  filterHotelsByAmenities,
  formatHotelFromPrice,
  hasHotelSearchParams,
  hotelSearchQuerySchema,
  parseHotelSearchParams,
  toHotelApiQuery,
  toHotelCardDisplay,
  type HotelList,
} from "../lib/api/hotels.ts"

function makeHotel(overrides: Partial<HotelList> = {}): HotelList {
  return {
    id: 1,
    name: "Radisson Blu Lagos",
    slug: "radisson-blu-lagos",
    city: "Lagos",
    country: "Nigeria",
    star_rating: 5,
    main_image: "https://cdn.example.com/hotels/radisson.jpg",
    amenities_list: ["Free WiFi", "Pool", "Gym", "Spa"],
    starting_price: "85000.00",
    ...overrides,
  }
}

test("Hotel filter validation: max per-night price and min stars bounds plus ordering values", () => {
  // No filters is valid — filters are optional refinements.
  const bare = hotelSearchQuerySchema.safeParse({})
  assert.equal(bare.success, true, "Omitting filters must stay valid")

  // Valid server filters pass.
  const filtered = hotelSearchQuerySchema.safeParse({
    max_price: 150000,
    min_stars: 4,
    ordering: "price",
  })
  assert.equal(filtered.success, true, "Valid price/star/ordering must pass")

  // Every documented ordering value passes (backend contract: price,
  // -price, star_rating, -star_rating, name).
  for (const ordering of HOTEL_ORDERINGS) {
    const parsed = hotelSearchQuerySchema.safeParse({ ordering })
    assert.equal(parsed.success, true, `Ordering "${ordering}" must pass`)
  }
  assert.deepEqual(
    [...HOTEL_ORDERINGS].sort(),
    ["-price", "-star_rating", "name", "price", "star_rating"],
    "Ordering vocabulary must match the backend contract exactly"
  )

  // Unknown ordering is rejected with a human-readable message.
  const badOrdering = hotelSearchQuerySchema.safeParse({
    ordering: "popularity",
  })
  assert.equal(badOrdering.success, false, "Unknown ordering must fail")

  // Price bounds: zero, negative, and fractional prices are rejected.
  assert.equal(
    hotelSearchQuerySchema.safeParse({ max_price: 0 }).success,
    false,
    "Zero max price must fail"
  )
  assert.equal(
    hotelSearchQuerySchema.safeParse({ max_price: -5000 }).success,
    false,
    "Negative max price must fail"
  )
  assert.equal(
    hotelSearchQuerySchema.safeParse({ max_price: 99.99 }).success,
    false,
    "Fractional max price must fail (whole Naira)"
  )

  // Star bounds: only 1–5 are accepted.
  assert.equal(
    hotelSearchQuerySchema.safeParse({ min_stars: 1 }).success,
    true,
    "1 star must pass"
  )
  assert.equal(
    hotelSearchQuerySchema.safeParse({ min_stars: 5 }).success,
    true,
    "5 stars must pass"
  )
  assert.equal(
    hotelSearchQuerySchema.safeParse({ min_stars: 0 }).success,
    false,
    "0 stars must fail"
  )
  assert.equal(
    hotelSearchQuerySchema.safeParse({ min_stars: 6 }).success,
    false,
    "6 stars must fail"
  )
})

test("Hotel filter URL round-trip: server filters survive share/back/refresh without leaking sensitivity", () => {
  const original = hotelSearchQuerySchema.parse({
    destination: "Lagos",
    guests: 2,
    rooms: 1,
    max_price: 150000,
    min_stars: 4,
    ordering: "-price",
    page: 2,
  })

  const params = buildHotelSearchParams(original)
  assert.match(params, /max_price=150000/)
  assert.match(params, /min_stars=4/)
  assert.match(params, /ordering=-price/)
  assert.match(params, /page=2/)
  assert.ok(
    !/guests|rooms|check_in|check_out/.test(params),
    "Default party and empty dates stay out of listing links"
  )
  assert.ok(
    !/token|password|card|payment|secret|pnr|reference/i.test(params),
    "URL must not leak sensitive keys"
  )

  const reparsed = parseHotelSearchParams(
    Object.fromEntries(new URLSearchParams(params))
  )
  assert.equal(reparsed.max_price, 150000)
  assert.equal(reparsed.min_stars, 4)
  assert.equal(reparsed.ordering, "-price")
  assert.equal(reparsed.page, 2)

  // Unset filters are omitted to keep links clean, and reparse as unset.
  const unfiltered = hotelSearchQuerySchema.parse({})
  const cleanParams = buildHotelSearchParams(unfiltered)
  assert.ok(
    !/max_price|min_stars|ordering/.test(cleanParams),
    "Unset filters must be omitted from the URL"
  )
  const reparsedClean = parseHotelSearchParams(
    Object.fromEntries(new URLSearchParams(cleanParams))
  )
  assert.equal(reparsedClean.max_price, undefined)
  assert.equal(reparsedClean.min_stars, undefined)
  assert.equal(reparsedClean.ordering, undefined)

  // Invalid URL values are dropped, never thrown, never sent to the backend.
  const withInvalid = parseHotelSearchParams({
    max_price: "not-a-number",
    min_stars: "99",
    ordering: "popularity",
    page: "0",
  })
  assert.equal(
    withInvalid.max_price,
    undefined,
    "Non-numeric price must be dropped"
  )
  assert.equal(
    withInvalid.min_stars,
    undefined,
    "Out-of-range stars must be dropped"
  )
  assert.equal(
    withInvalid.ordering,
    undefined,
    "Unknown ordering must be dropped"
  )
  assert.equal(withInvalid.page, 1, "Invalid page must fall back to 1")

  // Zero/negative price in the URL means "no cap", matching backend omission.
  assert.equal(parseHotelSearchParams({ max_price: "0" }).max_price, undefined)
  assert.equal(
    parseHotelSearchParams({ max_price: "-500" }).max_price,
    undefined
  )

  // Backend query carries the same server filters (request and link cannot drift).
  const apiQuery = toHotelApiQuery(original)
  assert.equal(apiQuery["max_price"], "150000")
  assert.equal(apiQuery["min_stars"], "4")
  assert.equal(apiQuery["ordering"], "-price")
  const bareApiQuery = toHotelApiQuery(unfiltered)
  assert.ok(
    !("max_price" in bareApiQuery) &&
      !("min_stars" in bareApiQuery) &&
      !("ordering" in bareApiQuery),
    "Unset filters must not reach the backend"
  )

  // Filter-only URLs still read as an active search (results view, noindex).
  assert.equal(hasHotelSearchParams({ max_price: "150000" }), true)
  assert.equal(hasHotelSearchParams({ min_stars: "4" }), true)
  assert.equal(hasHotelSearchParams({ ordering: "price" }), true)
})

test("Hotel card display mapping: missing-image and empty-amenity fallbacks with locked pricing copy", () => {
  // Full card maps every field.
  const full = toHotelCardDisplay(makeHotel())
  assert.equal(full.href, "/hotels/radisson-blu-lagos")
  assert.equal(full.imageAlt, "Radisson Blu Lagos — Lagos, Nigeria")
  assert.equal(full.placeLabel, "Lagos, Nigeria")
  assert.equal(full.starLabel, "5-star Hotel")
  assert.deepEqual(full.keyAmenities, ["Free WiFi", "Pool", "Gym"])
  assert.equal(
    full.hasMoreAmenities,
    true,
    "4 amenities with 3 shown must flag more"
  )
  assert.equal(full.priceLabel, "from ₦85,000 per night")

  // Missing image falls back to a local brand asset, never a broken image.
  const noImage = toHotelCardDisplay(makeHotel({ main_image: "" }))
  assert.equal(noImage.imageSrc, "/android-chrome-512x512.png")
  const absolute = toHotelCardDisplay(makeHotel())
  assert.equal(absolute.imageSrc, "https://cdn.example.com/hotels/radisson.jpg")

  // Relative backend media paths resolve against the API host.
  const relative = toHotelCardDisplay(
    makeHotel({ main_image: "/media/hotels/radisson.jpg" })
  )
  assert.match(relative.imageSrc, /^https?:\/\//)
  assert.match(relative.imageSrc, /\/media\/hotels\/radisson\.jpg$/)

  // Empty amenities show at most nothing, with no "more" flag — the card
  // renders display-only fallback copy instead of an empty list.
  const noAmenities = toHotelCardDisplay(makeHotel({ amenities_list: [] }))
  assert.deepEqual(noAmenities.keyAmenities, [])
  assert.equal(noAmenities.hasMoreAmenities, false)

  // Blank/whitespace amenities are ignored, never rendered as chips.
  const blankAmenities = toHotelCardDisplay(
    makeHotel({ amenities_list: ["  ", "", "Free WiFi"] })
  )
  assert.deepEqual(blankAmenities.keyAmenities, ["Free WiFi"])
  assert.equal(blankAmenities.hasMoreAmenities, false)

  // Exactly three amenities means nothing is hidden.
  const three = toHotelCardDisplay(
    makeHotel({ amenities_list: ["Free WiFi", "Pool", "Gym"] })
  )
  assert.deepEqual(three.keyAmenities, ["Free WiFi", "Pool", "Gym"])
  assert.equal(three.hasMoreAmenities, false)

  // Missing country still reads naturally as place context.
  const noCountry = toHotelCardDisplay(makeHotel({ country: "" }))
  assert.equal(noCountry.placeLabel, "Lagos")
  assert.equal(noCountry.imageAlt, "Radisson Blu Lagos — Lagos")

  // Unrated Hotels (star_rating 0) carry no star label instead of "0-star".
  const unrated = toHotelCardDisplay(makeHotel({ star_rating: 0 }))
  assert.equal(unrated.starLabel, null)
  assert.equal(
    toHotelCardDisplay(makeHotel({ star_rating: 3 })).starLabel,
    "3-star Hotel"
  )

  // Pricing copy is locked: valid prices read "from ₦X per night".
  assert.equal(formatHotelFromPrice("250000.00"), "from ₦250,000 per night")
  assert.equal(formatHotelFromPrice("85000.00"), "from ₦85,000 per night")

  // Missing, zero, or non-numeric prices have no from-price — the card shows
  // fallback copy ("Prices confirmed at booking") instead of "from ₦0".
  assert.equal(formatHotelFromPrice("0.00"), null)
  assert.equal(formatHotelFromPrice(""), null)
  assert.equal(formatHotelFromPrice("not-a-price"), null)
  assert.equal(
    toHotelCardDisplay(makeHotel({ starting_price: "0.00" })).priceLabel,
    null
  )
})

test("Client-side amenity refinement filters the fetched page without a new search", () => {
  const page = [
    makeHotel({ id: 1, amenities_list: ["Free WiFi", "Pool"] }),
    makeHotel({ id: 2, amenities_list: ["Free WiFi", "Gym"] }),
    makeHotel({ id: 3, amenities_list: ["Pool", "Spa"] }),
  ]

  // No selection returns the whole page untouched.
  assert.deepEqual(
    filterHotelsByAmenities(page, []).map((h) => h.id),
    [1, 2, 3]
  )

  // Single amenity narrows to Hotels offering it.
  assert.deepEqual(
    filterHotelsByAmenities(page, ["Pool"]).map((h) => h.id),
    [1, 3]
  )

  // Multi-select is an AND over the fetched page (must-have every amenity).
  assert.deepEqual(
    filterHotelsByAmenities(page, ["Free WiFi", "Pool"]).map((h) => h.id),
    [1]
  )

  // Matching is forgiving of case and padding (backend strings vary).
  assert.deepEqual(
    filterHotelsByAmenities(page, ["  free wifi "]).map((h) => h.id),
    [1, 2]
  )

  // Unknown amenities match nothing — the empty state (not a crash) handles it.
  assert.deepEqual(
    filterHotelsByAmenities(page, ["Helipad"]).map((h) => h.id),
    []
  )

  // Blank selections are ignored, never treated as a filter.
  assert.deepEqual(
    filterHotelsByAmenities(page, ["  ", ""]).map((h) => h.id),
    [1, 2, 3]
  )

  // Options for the multi-select derive from the fetched page with counts.
  const options = collectAmenityOptions(page)
  const wifi = options.find((o) => o.value === "Free WiFi")
  assert.equal(wifi?.count, 2)
  const pool = options.find((o) => o.value === "Pool")
  assert.equal(pool?.count, 2)
  // Most common first so the most useful refinements surface at the top.
  assert.ok(
    (options[0]?.count ?? 0) >= (options[options.length - 1]?.count ?? 0),
    "Options must be ordered by descending count"
  )
  assert.equal(
    collectAmenityOptions([]).length,
    0,
    "Empty page yields no options"
  )
})
