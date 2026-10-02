import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Travel Blog & News | Alphaa Africa"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Travel Blog",
    title: "Guides, checklists & travel news",
    subtitle: "Practical advice for travelling from Nigeria and beyond.",
  })
}
