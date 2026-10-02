import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Search Hotels by City or Hotel Name | Alphaa Africa"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Hotels & Stays",
    title: "Search Hotels by City or Hotel Name",
    // Share-card copy, not the SERP description: a card has room for one
    // human line, and keyword stuffing reads as spam in a feed.
    subtitle: "Handpicked stays, from-prices per night in Naira.",
  })
}
