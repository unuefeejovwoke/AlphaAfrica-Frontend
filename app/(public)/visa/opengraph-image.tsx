import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Visa Assistance | Alphaa Africa"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Visa Assistance",
    title: "Unsure about your visa?",
    subtitle: "A specialist reviews your documents and guides you through.",
  })
}
