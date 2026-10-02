import { brandOgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Contact Alphaa Africa — WhatsApp, Phone & Email"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return brandOgCard({
    kicker: "Talk to a human",
    title: "WhatsApp, phone, or email",
    subtitle: "Real answers from the Abuja desk, every day.",
  })
}
