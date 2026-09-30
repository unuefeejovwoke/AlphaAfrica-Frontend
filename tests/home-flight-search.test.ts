import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { tripTypeSchema } from "../lib/api/flights.ts"
import {
  buildFlightSearchQuery,
  parseFlightSearchUrl,
} from "../lib/api/flight-search-url.ts"

function readFile(relative: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relative), "utf-8")
}

function isoDate(offsetDays: number): string {
  return new Date(Date.now() + 86400000 * offsetDays).toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Ticket 02 — One-way compact search (widget behavior seam, external only)
// ---------------------------------------------------------------------------

test("Home flight widget: From/To autocomplete, Departure, Search — submits via the shared URL contract", () => {
  const widget = readFile("components/home/home-flight-search.tsx")
  assert.match(widget, /"use client"/, "Widget must be a client leaf")
  assert.match(
    widget,
    /label="From"|label=\{"From"\}|>From</,
    "FROM field must be visible"
  )
  assert.match(
    widget,
    /label="To"|label=\{"To"\}|>To</,
    "TO field must be visible"
  )
  assert.match(widget, /Departure/, "Departure field must be visible")
  assert.match(widget, /Search flights/, "Search action must be visible")
  assert.match(
    widget,
    /AirportAutocomplete/,
    "Route fields must reuse airport autocomplete"
  )
  assert.match(
    widget,
    /buildFlightSearchQuery/,
    "Submit must use the shared URL builder from ticket 01"
  )
  assert.match(
    widget,
    /tripTypeSchema/,
    "Submit must parse via the domain union — no duplicated Zod rules"
  )
  assert.match(widget, /one_way/, "One way must be the default trip type")
  assert.match(
    widget,
    /Select an (origin|destination) airport from the list/,
    "Typed-but-unselected text must be rejected"
  )
  assert.match(
    widget,
    /router\.push\(`\/flights\?/,
    "Valid search must navigate to flights URL state"
  )
  assert.doesNotMatch(
    widget,
    /flight_offer/,
    "Opaque fare data must never enter the widget"
  )
  assert.doesNotMatch(
    widget,
    /Non-stop|Max stops|Currency/,
    "Home stays minimal — no stop or currency controls"
  )
})

test("Home switcher: flights panel renders the widget, hotels and cars link live", () => {
  const switcher = readFile("components/home/home-search-switcher.tsx")
  assert.match(
    switcher,
    /HomeFlightSearch/,
    "Flights tab must render the compact widget"
  )
  assert.match(
    switcher,
    /\/hotels/,
    "Hotels must link to the live /hotels route"
  )
  assert.match(switcher, /\/cars/, "Cars must link to the live /cars route")
  assert.match(switcher, /role="tablist"/, "Tabs must keep the tablist pattern")
  assert.match(
    switcher,
    /role="tabpanel"/,
    "Panels must keep tabpanel semantics"
  )
})

test("Round-trip, swap, and validation polish (ticket 03)", () => {
  const widget = readFile("components/home/home-flight-search.tsx")
  assert.match(widget, /radiogroup/, "Trip type must use radio semantics")
  assert.match(widget, /One way/, "One-way option must be visible")
  assert.match(widget, /Round trip/, "Round-trip option must be visible")
  assert.match(
    widget,
    /label="Return"|>Return</,
    "Return field must exist for round-trip"
  )
  assert.match(
    widget,
    /Swap origin and destination/,
    "Swap control must be labelled"
  )
  assert.match(
    widget,
    /aria-live="polite"/,
    "Swap must announce via a live region"
  )
  assert.match(
    widget,
    /role="alert"/,
    "Invalid submit must surface an alert announcement"
  )
  assert.match(
    widget,
    /returnDate/,
    "Return-before-departure must be validated"
  )
  assert.match(
    widget,
    /alphaa:home-trip-type/,
    "Explicit trip choice must be remembered"
  )
})

test("Multi-city delegate plus hardening (ticket 05)", () => {
  const widget = readFile("components/home/home-flight-search.tsx")
  assert.match(widget, /Multi-city/, "Multi-city option must be visible")
  assert.match(
    widget,
    /\/flights\?trip_type=multi_city/,
    "Delegate must carry the multi-city trip flag"
  )
  assert.match(
    widget,
    /flights editor/,
    "Delegate must explain the handoff to the full editor"
  )
  assert.doesNotMatch(
    widget,
    /LegFields|useFieldArray|Add leg/,
    "No leg editing on home"
  )
  assert.match(
    widget,
    /flight_search_started/,
    "Valid submit must fire search-started analytics"
  )
  assert.match(
    widget,
    /isDomesticSearch/,
    "Analytics must classify domestic vs international route"
  )
  assert.match(widget, /grid-cols-1/, "Mobile must stack single-column")
  assert.match(widget, /w-full justify-center/, "Search must stay full-width")
  assert.doesNotMatch(
    widget,
    /#1e3a8a|#2563eb|navy/i,
    "No navy pill or blue CTA — homepage system wins"
  )
})

test("Travellers party and cabin (ticket 04)", () => {
  const widget = readFile("components/home/home-flight-search.tsx")
  assert.match(
    widget,
    /TravellerStepper/,
    "Party editing must reuse the stepper"
  )
  assert.match(widget, /1 Adult/, "Solo adult must read human")
  assert.match(
    widget,
    /travellers/,
    "Party trigger must summarize compactly with a screen-reader breakdown"
  )
  assert.match(
    widget,
    /sr-only/,
    "Full party breakdown must be exposed to screen readers"
  )
  assert.match(widget, /Cabin/, "Cabin selector must always be visible")
  assert.match(widget, /ECONOMY/, "Economy must be the default cabin")
})

test("Party and cabin flow into the navigated URL state with cabin fanned to every leg", () => {
  const departure = isoDate(14)
  const parsed = tripTypeSchema.safeParse({
    trip_type: "one_way",
    origin: "LOS",
    destination: "LHR",
    departureDate: departure,
    adults: 2,
    children: 1,
    infants: 1,
    cabin: "BUSINESS",
    currency: "NGN",
    non_stop: false,
    max_stops: null,
  })
  assert.equal(parsed.success, true)
  if (!parsed.success) return
  const query = buildFlightSearchQuery(parsed.data)
  assert.match(query, /adults=2/, "Adults must ride the URL")
  assert.match(query, /children=1/, "Children must ride the URL")
  assert.match(query, /infants=1/, "Infants must ride the URL")
  assert.match(query, /cabin=BUSINESS/, "Cabin must ride the URL")
  const back = parseFlightSearchUrl(new URLSearchParams(query))
  assert.equal(back.isValid, true)
  assert.equal(back.values.adults, 2)
  assert.equal(back.values.cabin, "BUSINESS")
})

test("One-way home submit: valid payload builds a flights URL that auto-searches; invalid never navigates", () => {
  const departure = isoDate(14)

  // Valid one-way parses and builds a shareable URL the flights page accepts
  const valid = tripTypeSchema.safeParse({
    trip_type: "one_way",
    origin: "LOS",
    destination: "LHR",
    departureDate: departure,
    adults: 1,
    children: 0,
    infants: 0,
    cabin: "ECONOMY",
    currency: "NGN",
    non_stop: false,
    max_stops: null,
  })
  assert.equal(valid.success, true)
  if (!valid.success) return
  const query = buildFlightSearchQuery(valid.data)
  assert.match(query, /origin=LOS/, "URL must carry the origin")
  assert.match(query, /destination=LHR/, "URL must carry the destination")
  const back = parseFlightSearchUrl(new URLSearchParams(query))
  assert.equal(
    back.isValid,
    true,
    "Built URL must auto-search on the flights page"
  )

  // Same-airport route rejected — no navigation target can be built
  const same = tripTypeSchema.safeParse({
    trip_type: "one_way",
    origin: "LOS",
    destination: "LOS",
    departureDate: departure,
    adults: 1,
    children: 0,
    infants: 0,
  })
  assert.equal(same.success, false, "Same-airport route must be rejected")

  // Past departure rejected
  const past = tripTypeSchema.safeParse({
    trip_type: "one_way",
    origin: "LOS",
    destination: "LHR",
    departureDate: "2000-01-01",
    adults: 1,
    children: 0,
    infants: 0,
  })
  assert.equal(past.success, false, "Past departure must be rejected")
})

test("Home flight search: desktop straight layout and real-time error clearing", () => {
  const widget = readFile("components/home/home-flight-search.tsx")
  assert.match(
    widget,
    /lg:flex-row/,
    "Desktop layout must arrange fields straight in a flex row"
  )
  assert.match(
    widget,
    /formatAirportDisplay/,
    "Airport display must format cleanly inside input box"
  )
  assert.match(
    widget,
    /clearErrors\("origin"\)/,
    "Selecting or editing origin must clear origin errors"
  )
  assert.match(
    widget,
    /clearErrors\("destination"\)/,
    "Selecting or editing destination must clear destination errors"
  )
  assert.match(
    widget,
    /clearErrors\("departureDate"\)/,
    "Updating departure date must clear departureDate errors"
  )
  assert.match(
    widget,
    /clearErrors\("returnDate"\)/,
    "Updating return date must clear returnDate errors"
  )
  assert.match(
    widget,
    /hideLabel/,
    "Cabin dropdown must be compact and aligned with search button"
  )
})
