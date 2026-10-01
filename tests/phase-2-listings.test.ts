import test from "node:test"
import assert from "node:assert/strict"

// Seams under test (pre-agreed: lib/api/ fetches + pure listing helpers):
// 1. URL searchParams <-> PackageFilters round-trip (shareable/crawlable)
// 2. Featured-first sorting (destinations + packages)
// 3. Backend image resolution (absolute vs relative /media paths)
// 4. TouristTrip / TouristDestination / ItemList JSON-LD (AI SEO / GEO)

import {
  parsePackageSearchParams,
  buildPackageSearchParams,
  sortFeaturedFirst,
  parsePriceAmount,
  humanizeSlug,
  resolveListingImageUrl,
  destinationListJsonLd,
  destinationDetailJsonLd,
  packageDetailJsonLd,
} from "../lib/listings.ts"

test("Package searchParams parse destination, max_price, featured", () => {
  const parsed = parsePackageSearchParams({
    destination: "dubai",
    max_price: "500000",
    featured: "true",
  })
  assert.equal(parsed.destination, "dubai")
  assert.equal(parsed.max_price, 500000)
  assert.equal(parsed.featured, true)
})

test("Package searchParams drop invalid values instead of throwing", () => {
  const parsed = parsePackageSearchParams({
    destination: "   ",
    max_price: "not-a-number",
    featured: "yes",
  })
  assert.equal(parsed.destination, undefined)
  assert.equal(parsed.max_price, undefined)
  assert.equal(parsed.featured, undefined)
})

test("Package searchParams round-trip preserves a shareable URL", () => {
  const params = buildPackageSearchParams({
    destination: "zanzibar",
    max_price: 250000,
    featured: true,
  })
  assert.match(params, /destination=zanzibar/)
  assert.match(params, /max_price=250000/)
  assert.match(params, /featured=true/)
  const reparsed = parsePackageSearchParams(
    Object.fromEntries(new URLSearchParams(params))
  )
  assert.equal(reparsed.destination, "zanzibar")
  assert.equal(reparsed.max_price, 250000)
  assert.equal(reparsed.featured, true)
})

test("Featured items sort first without mutating the input", () => {
  const input = [
    { id: 1, is_featured: false },
    { id: 2, is_featured: true },
    { id: 3 },
  ]
  const sorted = sortFeaturedFirst(input)
  assert.equal(sorted[0].id, 2)
  assert.equal(input[0].id, 1)
})

test("Backend decimal prices parse to positive amounts only", () => {
  assert.equal(parsePriceAmount("250000.00"), 250000)
  assert.equal(parsePriceAmount("1,000,000"), 1000000)
  assert.equal(parsePriceAmount("0"), null)
  assert.equal(parsePriceAmount(""), null)
  assert.equal(parsePriceAmount(null), null)
})

test("Slugs humanize for fallback titles", () => {
  assert.equal(humanizeSlug("cape-coast"), "Cape Coast")
  assert.equal(humanizeSlug("4-day-accra"), "4 Day Accra")
})

test("Listing images resolve relative /media paths against the API host", () => {
  assert.equal(
    resolveListingImageUrl("https://cdn.example.com/x.jpg"),
    "https://cdn.example.com/x.jpg"
  )
  assert.match(resolveListingImageUrl("/media/dubai.jpg"), /^https?:\/\//)
  assert.equal(resolveListingImageUrl(""), "/images/og-share-card.webp")
})

test("Destination list JSON-LD stays non-thin with one node per card", () => {
  const list = destinationListJsonLd([
    {
      name: "Dubai",
      slug: "dubai",
      country: "UAE",
      main_image: "https://cdn.example.com/d.jpg",
    },
  ])
  assert.equal(list["@type"], "ItemList")
  assert.equal(list.itemListElement.length, 1)
  assert.match(list.itemListElement[0].url, /\/destinations\/dubai/)
})

test("Destination detail JSON-LD emits TouristDestination + ItemList", () => {
  const graph = destinationDetailJsonLd({
    name: "Dubai",
    slug: "dubai",
    country: "UAE",
    description: "City break",
    main_image: "https://cdn.example.com/dubai.jpg",
    packages: [{ title: "Dubai Escape", slug: "dubai-escape" }],
  })
  const types = graph["@graph"].map(
    (node: { "@type": string }) => node["@type"]
  )
  assert.ok(types.includes("TouristDestination"))
  assert.ok(types.includes("ItemList"))
})

test("Package detail JSON-LD emits a TouristTrip with an NGN offer", () => {
  const trip = packageDetailJsonLd({
    title: "Zanzibar Honeymoon",
    slug: "zanzibar-honeymoon",
    destination_name: "Zanzibar",
    price: "850000",
    main_image: "https://cdn.example.com/z.jpg",
    description: "Beach break",
  })
  assert.equal(trip["@type"], "TouristTrip")
  assert.equal(trip.offers.priceCurrency, "NGN")
  assert.ok(String(trip.offers.price).length > 0)
})
