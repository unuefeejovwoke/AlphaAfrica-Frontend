import { HOTELS_LANDING_DESCRIPTION } from "@/lib/seo"
import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Search Hotels by City or Hotel Name | Alphaa Africa"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Hotels & Stays",
    title: "Search Hotels by City or Hotel Name",
    subtitle: HOTELS_LANDING_DESCRIPTION,
  })
}
