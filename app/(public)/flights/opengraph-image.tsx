import {
  FLIGHTS_LANDING_DESCRIPTION,
  FLIGHTS_LANDING_TITLE,
} from "@/lib/seo"
import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = FLIGHTS_LANDING_TITLE
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Flights",
    title: "Search Flights — One-way, Round-trip & Multi-city",
    subtitle: FLIGHTS_LANDING_DESCRIPTION,
  })
}
