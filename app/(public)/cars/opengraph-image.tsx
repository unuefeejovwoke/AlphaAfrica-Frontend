import { CARS_LANDING_DESCRIPTION } from "@/lib/seo"
import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Rent a Car with Driver — Hourly Hire | Alphaa Africa"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Chauffeur & Car Hire",
    title: "Rent a Car with Driver",
    subtitle: CARS_LANDING_DESCRIPTION,
  })
}
