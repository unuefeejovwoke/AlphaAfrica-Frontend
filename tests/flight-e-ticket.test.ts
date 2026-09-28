import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

// ---------------------------------------------------------------------------
// B5 — the e-ticket must never invent route, flight, or issuance facts.
// Structural guards (same convention as flight-results-layout.test.ts):
// fabricated fallbacks must be absent, conditional truthfulness present.
// ---------------------------------------------------------------------------

const ticketPath = path.resolve(
  process.cwd(),
  "components/flights/flight-e-ticket.tsx"
)
const ticket = fs.readFileSync(ticketPath, "utf-8")

test("E-ticket never fabricates route, carrier, flight, or seat facts", () => {
  assert.doesNotMatch(ticket, /\|\| "LOS"/, "Must not invent a LOS origin")
  assert.doesNotMatch(ticket, /\|\| "DXB"/, "Must not invent a DXB destination")
  assert.doesNotMatch(
    ticket,
    /\(airlineCode \|\| "FLIGHT"\)/,
    "Must not invent a FLIGHT carrier"
  )
  assert.doesNotMatch(
    ticket,
    /slice\(-4\) \|\| "900"/,
    "Must not derive a flight number from the booking reference"
  )
  assert.doesNotMatch(
    ticket,
    /Standard Assigned/,
    "Must not invent a seat assignment"
  )
})

test("E-ticket states issuance conditionally and shows every leg", () => {
  assert.match(
    ticket,
    /PAYMENT RECEIVED/,
    "Paid-without-PNR must say the ticket is still issuing"
  )
  assert.match(
    ticket,
    /PNR PENDING/,
    "Missing PNR must be labelled pending, never claimed issued"
  )
  assert.match(
    ticket,
    /BOOKING REFERENCE/,
    "PNR box must relabel when showing the booking reference"
  )
  assert.match(
    ticket,
    /Assigned at check-in/,
    "Unknown seats must defer to check-in"
  )
  assert.match(
    ticket,
    /ALL LEGS ON THIS BOOKING/,
    "Return and multi-city legs must all render"
  )
  assert.match(
    ticket,
    /amadeusOrderId/,
    "Amadeus order id must be surfaced when present"
  )
  assert.match(
    ticket,
    /ticketDeadline/,
    "Last ticketing date must be surfaced when present"
  )
})

test("E-ticket prefers backend airline facts over hardcoded labels", () => {
  assert.match(
    ticket,
    /airline_name/,
    "Backend airline name must be read from flight_details"
  )
  assert.match(
    ticket,
    /hardcoded map is a last-resort/,
    "Hardcoded names must stay a fallback, never an override"
  )
})
