import { getVisaCountryDetail } from "@/lib/api/visa.ts"
import { formatNaira } from "@/lib/format.ts"
import { brandOgCard, ogCardImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Alphaa Africa visa assistance"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

/**
 * Per-country share card: country + fee/processing time on the brand
 * background (no photo — flag thumbnails degrade at card size).
 */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  try {
    const { slug } = await params
    const country = await getVisaCountryDetail(slug)
    const meta = [
      `${formatNaira(country.consultation_fee)} consultation`,
      country.processing_time || null,
    ]
      .filter(Boolean)
      .join(" · ")
    return ogCardImage({
      kicker: "Visa Assistance",
      title: `${country.name} Visa`,
      subtitle: meta || undefined,
    })
  } catch {
    return brandOgCard({
      kicker: "Visa Assistance",
      title: "Unsure about your visa?",
    })
  }
}
