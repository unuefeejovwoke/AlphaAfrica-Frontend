import test from "node:test"
import assert from "node:assert/strict"

// Ticket 03 — Hotel detail with gallery, rooms, and SEO.
//
// Pre-agreed seam (spec Testing Decisions): Hotel and Room Type
// normalization plus display mapping covering missing images, empty
// amenities, and price fallbacks. Detail-level display (gallery alt text,
// display-only location with map link, Room Type per-night copy) and the
// Hotel JSON-LD graph are the same seam at detail depth.
//
// Vertical tracer slices: one failing test, then minimal implementation.

import {
  formatRoomTypePrice,
  hasSubstantiveRoomDescription,
  hotelDetailSchema,
  parsePositiveNaira,
  toHotelDetailDisplay,
} from "../lib/api/hotels.ts"
import { hotelDetailJsonLd } from "../lib/listings.ts"
import { amenityIconFor } from "../components/hotels/hotel-amenity-icon.ts"

function makeDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    name: "Radisson Blu Lagos",
    slug: "radisson-blu-lagos",
    description: "A waterfront Hotel with calm rooms and fast WiFi.",
    city: "Lagos",
    address: "1A Ozumba Mbadiwe Avenue, Victoria Island",
    country: "Nigeria",
    star_rating: 5,
    main_image: "https://cdn.example.com/hotels/radisson-main.jpg",
    amenities_list: ["Free WiFi", "Pool", "Gym"],
    latitude: "6.430100",
    longitude: "3.411500",
    starting_price: "85000.00",
    room_types: [
      {
        id: 11,
        name: "Deluxe King",
        description: "City view, king bed, work desk.",
        price_per_night: "85000.00",
        max_guests: 2,
        total_rooms: 40,
        image: "https://cdn.example.com/hotels/deluxe-king.jpg",
      },
    ],
    images: [
      {
        id: 1,
        image: "https://cdn.example.com/hotels/pool.jpg",
        caption: "Rooftop pool at sunset",
      },
      { id: 2, image: "https://cdn.example.com/hotels/lobby.jpg", caption: "" },
    ],
    ...overrides,
  }
}

test("Hotel detail normalization: full payload parses, missing optionals fall back", () => {
  const parsed = hotelDetailSchema.safeParse(makeDetail())
  assert.equal(parsed.success, true, "Full Hotel detail must parse")
  if (!parsed.success) return
  assert.equal(parsed.data.name, "Radisson Blu Lagos")
  assert.equal(parsed.data.room_types.length, 1)
  assert.equal(parsed.data.images.length, 2)

  // Sparse backend row: absent description/amenities/rooms/images/coords
  // fall back instead of failing the whole page.
  const sparse = hotelDetailSchema.safeParse({
    id: 9,
    name: "New Hotel",
    slug: "new-hotel",
    city: "Abuja",
    main_image: "",
    amenities_list: [],
    starting_price: "0.00",
    room_types: [],
    images: [],
  })
  assert.equal(sparse.success, true, "Sparse Hotel detail must still parse")
  if (!sparse.success) return
  assert.equal(sparse.data.description, "")
  assert.equal(sparse.data.country, "")
  assert.equal(sparse.data.address, "")
  assert.equal(sparse.data.latitude, null)
  assert.equal(sparse.data.longitude, null)
  assert.equal(sparse.data.star_rating, 0)
})

test("Hotel detail display: gallery alt text names the Hotel and the photo", () => {
  const parsed = hotelDetailSchema.parse(makeDetail())
  const display = toHotelDetailDisplay(parsed)

  assert.equal(display.gallery.length, 2)
  // Captioned photo: Hotel name plus the caption.
  assert.equal(
    display.gallery[0]?.alt,
    "Radisson Blu Lagos — Rooftop pool at sunset"
  )
  // Uncaptioned photo: Hotel name plus a positional fallback (never empty).
  assert.equal(display.gallery[1]?.alt, "Radisson Blu Lagos — photo 2 of 2")
  assert.equal(
    display.gallery[0]?.src,
    "https://cdn.example.com/hotels/pool.jpg"
  )

  // Missing gallery falls back to the local brand asset, never a breakage.
  const noImages = toHotelDetailDisplay(
    hotelDetailSchema.parse(makeDetail({ images: [], main_image: "" }))
  )
  assert.equal(noImages.gallery.length, 1)
  assert.equal(noImages.gallery[0]?.src, "/android-chrome-512x512.png")
  assert.equal(noImages.gallery[0]?.alt, "Radisson Blu Lagos — Lagos, Nigeria")
})

test("Hotel detail display: place context is display-only with a map link", () => {
  const parsed = hotelDetailSchema.parse(makeDetail())
  const display = toHotelDetailDisplay(parsed)

  assert.equal(display.placeLabel, "Lagos, Nigeria")
  assert.equal(display.starLabel, "5-star Hotel")
  // Coordinates exist: map link pins the exact point.
  assert.equal(
    display.mapUrl,
    "https://www.google.com/maps/search/?api=1&query=6.430100%2C3.411500"
  )

  // No coordinates: no map link (map pins only exact points), but the
  // street address still renders as display-only text.
  const noCoords = toHotelDetailDisplay(
    hotelDetailSchema.parse(makeDetail({ latitude: null, longitude: null }))
  )
  assert.equal(noCoords.mapUrl, null)
  assert.equal(
    noCoords.addressText,
    "1A Ozumba Mbadiwe Avenue, Victoria Island"
  )

  // Unrated Hotel carries no star label (never "0-star").
  const unrated = toHotelDetailDisplay(
    hotelDetailSchema.parse(makeDetail({ star_rating: 0 }))
  )
  assert.equal(unrated.starLabel, null)
})

test("Room Type per-night copy is locked; unusable prices fall back", () => {
  assert.equal(formatRoomTypePrice("85000.00"), "₦85,000 per night")
  assert.equal(formatRoomTypePrice("0.00"), null)
  assert.equal(formatRoomTypePrice(""), null)
  assert.equal(formatRoomTypePrice("not-a-price"), null)

  const parsed = hotelDetailSchema.parse(makeDetail())
  const display = toHotelDetailDisplay(parsed)
  assert.equal(display.rooms.length, 1)
  assert.equal(display.rooms[0]?.priceLabel, "₦85,000 per night")
  assert.equal(display.rooms[0]?.capacityLabel, "Sleeps 2 per room · 40 rooms")
  assert.equal(display.fromPriceLabel, "from ₦85,000 per night")

  // Zero-capacity data row: display carries it, choice never blocks (04).
  const zeroCap = toHotelDetailDisplay(
    hotelDetailSchema.parse(
      makeDetail({
        room_types: [
          {
            id: 12,
            name: "Mystery Room",
            description: "",
            price_per_night: "60000.00",
            max_guests: 0,
            total_rooms: 5,
            image: "",
          },
        ],
      })
    )
  )
  assert.equal(zeroCap.rooms[0]?.capacityLabel, "Capacity confirmed at booking")
})

test("Room Type descriptions that only restate the names are suppressed", () => {
  // The backend templates most descriptions this way. Printing it under the
  // Room Type name adds a line of noise and pushes the price below the fold.
  assert.equal(
    hasSubstantiveRoomDescription(
      "Standard Room at Eko Hotels & Suites.",
      "Standard Room",
      "Eko Hotels & Suites"
    ),
    false
  )
  assert.equal(
    hasSubstantiveRoomDescription(
      "Deluxe Room at BON Hotel Stratton Asokoro",
      "Deluxe Room",
      "BON Hotel Stratton Asokoro"
    ),
    false
  )
  // Punctuation-only and empty descriptions carry nothing.
  assert.equal(hasSubstantiveRoomDescription("...", "Suite", "Eko"), false)
  assert.equal(hasSubstantiveRoomDescription("", "Suite", "Eko"), false)
  assert.equal(hasSubstantiveRoomDescription("   ", "Suite", "Eko"), false)
  // A two-letter connector left behind by the template is not content.
  assert.equal(
    hasSubstantiveRoomDescription("Suite at Eko", "Suite", "Eko"),
    false
  )

  // Real copy is kept, whatever its casing or surrounding punctuation.
  assert.equal(
    hasSubstantiveRoomDescription(
      "King bed, city view, and a work desk.",
      "Deluxe King",
      "Radisson Blu Lagos"
    ),
    true
  )
  assert.equal(
    hasSubstantiveRoomDescription(
      "Overlooking the pool.",
      "Standard Room",
      "Eko Hotels & Suites"
    ),
    true
  )
  // Short real words still count: only connectors under three letters are
  // treated as leftovers from the template.
  assert.equal(
    hasSubstantiveRoomDescription("Sea view", "Standard Room", "Eko"),
    true
  )
})

test("Room Type price parsing: only positive amounts count", () => {
  assert.equal(parsePositiveNaira("85000.00"), 85000)
  assert.equal(parsePositiveNaira("1,200.00"), 1200)
  assert.equal(parsePositiveNaira("0.00"), null)
  assert.equal(parsePositiveNaira(""), null)
  assert.equal(parsePositiveNaira(null), null)
  assert.equal(parsePositiveNaira(undefined), null)
  assert.equal(parsePositiveNaira("not-a-price"), null)
  assert.equal(parsePositiveNaira("-5000.00"), null)
})

test("Amenity icons resolve for known copy and stay null for the unknown", () => {
  // Every keyword the live backend sends today must resolve, or the chip
  // silently degrades to a neutral tick.
  const known = [
    "WiFi",
    "Pool",
    "Spa",
    "Gym",
    "Restaurant",
    "Bar",
    "Airport Shuttle",
    "Parking",
  ]
  for (const amenity of known) {
    assert.ok(
      amenityIconFor(amenity) !== null,
      `Expected an icon for backend amenity "${amenity}"`
    )
  }

  // Casing and padding must not change the outcome.
  assert.equal(amenityIconFor("  wIfI  "), amenityIconFor("WiFi"))

  // Unknown or empty copy returns null so the caller can pick its fallback
  // instead of the mapper guessing a wrong pictogram.
  assert.equal(amenityIconFor("Helipad"), null)
  assert.equal(amenityIconFor(""), null)
  assert.equal(amenityIconFor("   "), null)
})

test("Hotel JSON-LD: factual Hotel graph with no fabricated claims", () => {
  const parsed = hotelDetailSchema.parse(makeDetail())
  const jsonLd = hotelDetailJsonLd({
    name: parsed.name,
    slug: parsed.slug,
    description: parsed.description,
    city: parsed.city,
    address: parsed.address,
    country: parsed.country,
    star_rating: parsed.star_rating,
    main_image: parsed.main_image,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    starting_price: parsed.starting_price,
    room_types: parsed.room_types.map((room) => ({
      name: room.name,
      price_per_night: room.price_per_night,
    })),
  })

  assert.equal(jsonLd["@context"], "https://schema.org")
  assert.equal(jsonLd["@type"], "Hotel")
  assert.equal(jsonLd.name, "Radisson Blu Lagos")
  assert.deepEqual(jsonLd.address, {
    "@type": "PostalAddress",
    streetAddress: "1A Ozumba Mbadiwe Avenue, Victoria Island",
    addressLocality: "Lagos",
    addressCountry: "Nigeria",
  })
  assert.deepEqual(jsonLd.geo, {
    "@type": "GeoCoordinates",
    latitude: "6.430100",
    longitude: "3.411500",
  })
  const graph = jsonLd as unknown as Record<string, unknown>
  assert.ok(!("aggregateRating" in graph), "Never fabricate review ratings")
  assert.ok(!("review" in graph), "Never fabricate reviews")
  const rooms = graph.containsPlace as { name: string }[]
  assert.equal(rooms.length, 1)
  assert.equal(rooms[0]?.name, "Deluxe King")
})
