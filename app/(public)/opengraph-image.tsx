import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Alphaa Africa — Travel Beyond Borders"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Flights · Hotels · Tours · Visa",
    title: "Travel Beyond Borders",
    subtitle: "Live fares, handpicked stays, and 24/7 human support.",
  })
}
