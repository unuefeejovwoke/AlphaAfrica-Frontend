import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Destinations | Alphaa Africa"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Destinations",
    title: "See where you can go",
    subtitle: "Trips with availability and prices across Africa and beyond.",
  })
}
