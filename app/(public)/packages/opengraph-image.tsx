import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Holiday Packages | Alphaa Africa"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Holiday Packages",
    title: "Holidays you can actually book",
    subtitle: "Curated itineraries with from-prices in Naira. Enquire without paying.",
  })
}
