import test from "node:test"
import assert from "node:assert/strict"
import {
  isDomesticSearch,
  shouldFallbackToBlocking,
} from "../lib/api/domestic.ts"

// ---------------------------------------------------------------------------
// Ticket 03 TDD seams (pre-agreed, vertical slices):
// 1. Domestic detection — both-Nigerian origin+destination → domestic stream
// 2. SSE error triggers blocking fallback
// No E2E SSE test in v1 (spec: contract + seam tests cover streaming).
// ---------------------------------------------------------------------------

test("Domestic detection: both-Nigerian airports route to domestic stream, mixed/international do not", () => {
  const lagos = {
    iata_code: "LOS",
    name: "Murtala Muhammed International Airport",
    city: "Lagos",
    country_name: "Nigeria",
    country_code: "NG",
  }
  const abuja = {
    iata_code: "ABV",
    name: "Nnamdi Azikiwe International Airport",
    city: "Abuja",
    country_name: "Nigeria",
    country_code: "NG",
  }
  const london = {
    iata_code: "LHR",
    name: "Heathrow Airport",
    city: "London",
    country_name: "United Kingdom",
    country_code: "GB",
  }

  // Both Nigerian (object + IATA-string forms) → domestic
  assert.equal(
    isDomesticSearch(lagos, abuja),
    true,
    "LOS → ABV must use domestic stream"
  )
  assert.equal(
    isDomesticSearch("LOS", "ABV"),
    true,
    "IATA strings LOS → ABV must use domestic stream"
  )
  assert.equal(
    isDomesticSearch("los", "abv"),
    true,
    "Detection must be case-insensitive"
  )

  // Mixed → international (Amadeus legs path)
  assert.equal(
    isDomesticSearch(lagos, london),
    false,
    "LOS → LHR must not use domestic stream"
  )
  assert.equal(
    isDomesticSearch("LOS", "LHR"),
    false,
    "LOS → LHR strings must not use domestic stream"
  )
  assert.equal(
    isDomesticSearch(london, abuja),
    false,
    "LHR → ABV must not use domestic stream"
  )

  // Both international → international
  assert.equal(
    isDomesticSearch("LHR", "JFK"),
    false,
    "LHR → JFK must not use domestic stream"
  )
})

test("SSE fallback: stream error/timeout falls back to blocking search; clean completion/abort does not", () => {
  assert.equal(
    shouldFallbackToBlocking("error"),
    true,
    "Stream error must trigger blocking fallback"
  )
  assert.equal(
    shouldFallbackToBlocking("timeout"),
    true,
    "Stream timeout must trigger blocking fallback"
  )
  assert.equal(
    shouldFallbackToBlocking("completed"),
    false,
    "Clean completion must not trigger fallback"
  )
  assert.equal(
    shouldFallbackToBlocking("aborted"),
    false,
    "User abort / new search must not trigger fallback"
  )
})
