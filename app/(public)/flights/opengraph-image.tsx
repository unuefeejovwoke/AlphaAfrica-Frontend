import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Search Flights — One-way, Round-trip & Multi-city | Alphaa Africa"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Flights",
    title: "Search Flights — One-way, Round-trip & Multi-city",
    // Share-card copy, not the SERP description: a card has room for one
    // human line, and keyword stuffing reads as spam in a feed.
    subtitle: "Live fares in Naira. No account needed.",
  })
}
