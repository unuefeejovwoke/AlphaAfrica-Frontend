import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Terms & Conditions | Alphaa Africa"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Legal",
    title: "Terms & Conditions",
    subtitle: "The booking terms that apply to every reservation.",
  })
}
