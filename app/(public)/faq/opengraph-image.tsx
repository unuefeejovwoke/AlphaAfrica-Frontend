import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Travel FAQs — Flights, Hotels, Packages, Visa & Payments | Alphaa Africa"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Help Centre",
    title: "Clear answers before you book",
    subtitle: "Flights, hotels, packages, visa, cars, and payments.",
  })
}
