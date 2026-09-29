import type { FlightOfferDisplay } from "./flights.ts"

export interface AirlineFlightGroup {
  key: string
  airline: string
  offers: FlightOfferDisplay[]
}

/**
 * Group sorted visible offers by airline, preserving first-appearance order
 * so the representative card is always the first flight in the active sort
 * (cheapest when sorted cheapest, fastest when sorted fastest).
 * Grouping key matches the Best Deals matrix (`airlineCode || airline`).
 */
export function groupOffersByAirline(
  visible: FlightOfferDisplay[]
): AirlineFlightGroup[] {
  const groups = new Map<string, AirlineFlightGroup>()
  for (const offer of visible) {
    const key = offer.airlineCode || offer.airline
    const existing = groups.get(key)
    if (existing) {
      existing.offers.push(offer)
    } else {
      groups.set(key, { key, airline: offer.airline, offers: [offer] })
    }
  }
  return [...groups.values()]
}
