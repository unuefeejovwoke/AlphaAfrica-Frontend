import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import {
  initialListingState,
  listingSearchedKey,
  LISTING_AUTO_BROWSE_KEY,
} from "../lib/api/listing-initial.ts"
import { ApiError } from "../lib/api/client.ts"

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8")
}

test("listingSearchedKey marks a deep link by its own serialized params", () => {
  assert.equal(
    listingSearchedKey(true, "destination=Lagos&page=2"),
    "destination=Lagos&page=2"
  )
})

test("listingSearchedKey marks the clean landing as the browse-all sentinel", () => {
  assert.equal(listingSearchedKey(false, ""), LISTING_AUTO_BROWSE_KEY)
})

test("initialListingState starts the client engine when no payload exists", () => {
  const state = initialListingState(undefined)
  assert.equal(state.status, "loading")
  assert.equal(state.page, null)
  assert.equal(state.error, null)
})

test("initialListingState passes a success payload through untouched", () => {
  const page = { count: 2, next: null, previous: null, results: [1, 2] }
  const state = initialListingState({
    status: "success",
    page,
  })
  assert.equal(state.status, "success")
  assert.equal(state.page, page)
  assert.equal(state.error, null)
})

test("initialListingState passes an empty payload through untouched", () => {
  const state = initialListingState({
    status: "empty",
    page: { count: 0, next: null, previous: null, results: [] },
  })
  assert.equal(state.status, "empty")
  assert.equal(state.error, null)
})

test("initialListingState re-raises a backend failure as a typed ApiError", () => {
  const state = initialListingState({
    status: "error",
    page: null,
    errorMessage: "We could not reach the travel service.",
    errorCode: "network",
  })
  assert.equal(state.status, "error")
  assert.equal(state.page, null)
  assert.ok(state.error instanceof ApiError)
  assert.equal(state.error.code, "network")
  assert.equal(state.error.status, null)
})

test("initialListingState re-raises a validation failure with a 400 status", () => {
  const state = initialListingState({
    status: "error",
    page: null,
    errorMessage: "Check-out must be after check-in",
    errorCode: "validation",
  })
  assert.equal(state.status, "error")
  assert.ok(state.error instanceof ApiError)
  assert.equal(state.error.code, "validation")
  assert.equal(state.error.status, 400)
  // The hotels/cars error UI surfaces this message verbatim for validation.
  assert.equal(state.error.message, "Check-out must be after check-in")
})

test("Listing pages stream a server-read first page on document loads only", () => {
  for (const [label, pagePath] of [
    ["Hotels", "app/(public)/hotels/page.tsx"],
    ["Vehicles", "app/(public)/cars/page.tsx"],
  ] as const) {
    const page = read(pagePath)
    assert.match(
      page,
      /async function \w+ListingSection/,
      `${label} page must stream its listing through a Suspense child`
    )
    assert.match(
      page,
      /await isRscNavigationRequest\(\)/,
      `${label} page must gate the server fetch on request kind`
    )
    assert.match(
      page,
      /return <\w+SearchPageClient \/>\s*\}/,
      `${label} page must hand RSC navigations back to the client engine`
    )
    assert.match(
      page,
      /initial=\{initial\}/,
      `${label} page must pass the server-read payload to the client`
    )
  }
})

test("Listing clients seed from the server payload and never re-fetch it", () => {
  for (const [label, clientPath] of [
    ["Hotel", "components/hotels/hotel-search-page-client.tsx"],
    ["Car", "components/cars/car-search-page-client.tsx"],
  ] as const) {
    const client = read(clientPath)
    assert.match(
      client,
      /initial\?: ListingInitialPayload</,
      `${label} client must accept the server-read first page`
    )
    assert.match(
      client,
      /initialListingState\(initial\)/,
      `${label} client must seed its state from the payload`
    )
    assert.match(
      client,
      /initial \? listingSearchedKey\(|initial \? paramsString : null/,
      `${label} client must mark the entry URL as already searched`
    )
    // The seed's full-page length keeps the pagination range honest from
    // the first paint.
    assert.match(
      client,
      /pageSizeRef\.current = page\.results\.length/,
      `${label} client must adopt the payload's observed full-page length`
    )
  }
})

test("Server first reads validate like the client and never throw", () => {
  const hotels = read("lib/api/hotels.ts")
  const cars = read("lib/api/cars.ts")

  assert.match(
    hotels,
    /export async function getHotelListingInitial/,
    "Hotels must expose a server-side first read"
  )
  assert.match(
    hotels,
    /validateHotelSearchQuery\(query\)/,
    "Server read must validate the URL query like the client does"
  )
  assert.match(
    cars,
    /export async function getCarListingInitial/,
    "Cars must expose a server-side first read"
  )
  assert.match(
    cars,
    /validateCarSearchQuery\(query\)/,
    "Server read must validate the URL query like the client does"
  )
})

test("Price-bearing detail reads revalidate in five minutes, not an hour", () => {
  assert.match(
    read("lib/api/client.ts"),
    /export const LISTING_DETAIL_REVALIDATE_SECONDS = 300/
  )
  for (const [label, detailPath] of [
    ["Hotel", "app/(public)/hotels/[slug]/page.tsx"],
    ["Vehicle", "app/(public)/cars/[slug]/page.tsx"],
  ] as const) {
    const detail = read(detailPath)
    assert.match(
      detail,
      /export const revalidate = 300/,
      `${label} detail page must revalidate every five minutes`
    )
    assert.doesNotMatch(
      detail,
      /export const revalidate = 3600/,
      `${label} detail page must not keep the hourly cache`
    )
  }
  const hotels = read("lib/api/hotels.ts")
  const cars = read("lib/api/cars.ts")
  assert.match(
    hotels,
    /revalidate: LISTING_DETAIL_REVALIDATE_SECONDS/,
    "Hotel detail fetch must shorten its data-cache lifetime to match"
  )
  assert.match(
    cars,
    /revalidate: LISTING_DETAIL_REVALIDATE_SECONDS/,
    "Vehicle detail fetch must shorten its data-cache lifetime to match"
  )
})
