import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Privacy Policy | Alphaa Africa"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Legal",
    title: "Privacy Policy",
    subtitle: "What we collect, why we hold it, and how to reach us.",
  })
}
