import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import { isAbortError } from "../lib/api/client.ts"

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8")
}

test("isAbortError recognises cancellation errors from any realm shape", () => {
  const abort = new DOMException("The operation was aborted.", "AbortError")
  assert.equal(isAbortError(abort), true)
  assert.equal(isAbortError({ name: "AbortError" }), true)
  assert.equal(isAbortError({ name: "TimeoutError" }), true)
  assert.equal(isAbortError(new Error("network failed")), false)
  assert.equal(isAbortError(null), false)
  assert.equal(isAbortError(undefined), false)
  assert.equal(isAbortError("AbortError"), false)
})

test("Hotel and Car searches abort superseded requests and cancel on unmount", () => {
  for (const [label, clientPath] of [
    ["Hotel", "components/hotels/hotel-search-page-client.tsx"],
    ["Car", "components/cars/car-search-page-client.tsx"],
  ] as const) {
    const client = read(clientPath)
    assert.match(
      client,
      /searchAbortRef = React\.useRef<AbortController \| null>\(null\)/,
      `${label} search must own an AbortController`
    )
    assert.match(
      client,
      /searchAbortRef\.current\?\.abort\(\)/,
      `${label} search must abort the previous in-flight request when a new one starts`
    )
    assert.match(
      client,
      /await get\w+\(query, \{ signal: controller\.signal \}\)/,
      `${label} search must pass the abort signal to the fetch`
    )
    assert.match(
      client,
      /if \(isAbortError\(caught\)\) return/,
      `${label} search must treat its own cancellation as quiet, not an error state`
    )
    assert.match(
      client,
      /\/\/ Cancel in-flight work when the listing unmounts\.[\s\S]*?searchAbortRef\.current\?\.abort\(\)/,
      `${label} listing must cancel in-flight work on unmount`
    )
  }

  // The fetch layer must carry the signal through to the request.
  for (const [label, libPath] of [
    ["Hotel", "lib/api/hotels.ts"],
    ["Car", "lib/api/cars.ts"],
  ] as const) {
    const lib = read(libPath)
    assert.match(
      lib,
      /options\?: \{ signal\?: AbortSignal \}/,
      `${label} search read must accept an AbortSignal`
    )
    assert.match(
      lib,
      /signal: options\?\.signal/,
      `${label} search read must pass the signal to the request`
    )
  }
})

test("Fare confirmation and photo lightbox load on first open, not first paint", () => {
  const flightClient = read("components/flights/flight-search-page-client.tsx")
  assert.match(
    flightClient,
    /const FareConfirmDialog = dynamic\(/,
    "Fare confirmation dialog must be dynamically imported"
  )
  assert.match(
    flightClient,
    /\{pendingSelection !== null \? \(/,
    "Fare confirmation dialog must mount only while a selection is pending"
  )

  const gallery = read("components/hotels/hotel-gallery.tsx")
  assert.match(
    gallery,
    /const HotelLightbox = React\.lazy\(/,
    "Hotel lightbox must be lazily loaded"
  )
  assert.match(
    gallery,
    /lightboxOpen \? \(/,
    "Hotel lightbox must mount only while open"
  )
  // The LCP hero stays put: the gallery itself is still statically imported
  // by the detail page and keeps the priority hero render.
  assert.match(gallery, /HERO_SIZES/)
  assert.match(
    read("app/(public)/hotels/[slug]/page.tsx"),
    /import \{ HotelGallery \} from "@\/components\/hotels\/hotel-gallery"/,
    "Gallery (and its hero) must stay in the server-rendered detail page"
  )
  // The extracted lightbox never renders the hero — it has no priority prop.
  const lightbox = read("components/hotels/hotel-lightbox.tsx")
  assert.doesNotMatch(
    lightbox,
    /priority|HERO_SIZES/,
    "Lightbox must not render the largest-content image"
  )
})

test("Icon barrels are optimised at the framework level; unused font is gone", () => {
  const config = read("next.config.ts")
  assert.match(
    config,
    /optimizePackageImports: \["@hugeicons\/react", "@hugeicons\/core-free-icons"\]/,
    "next.config.ts must optimize the icon package imports"
  )

  const layout = read("app/layout.tsx")
  assert.doesNotMatch(
    layout,
    /import \{[^}]*Geist,/,
    "Unused Geist font import must be removed"
  )
  assert.match(
    layout,
    /Geist_Mono/,
    "Used fonts stay imported"
  )
})

test("Flight result cards skip off-screen rendering like the Hotel and Car grids", () => {
  const grouped = read("components/flights/grouped-flight-offers.tsx")
  assert.match(
    grouped,
    /\[content-visibility:auto\] \[contain-intrinsic-size:auto_\d+px\]/,
    "Flight offer cards must carry the off-screen rendering skip"
  )
  // Every card render path gets it: flat list, representative, and expanded.
  const applyCount = (grouped.match(/className=\{CARD_SKIP\}/g) ?? []).length
  assert.ok(
    applyCount >= 3,
    `All three card render paths must use the skip (found ${applyCount})`
  )

  // Consistency with the Hotel and Car grids, which already ship it.
  for (const gridPath of [
    "components/hotels/hotel-search-page-client.tsx",
    "components/cars/car-search-page-client.tsx",
  ]) {
    assert.match(
      read(gridPath),
      /\[content-visibility:auto\]/,
      `${gridPath} must keep its content-visibility skip`
    )
  }
})
