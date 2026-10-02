import { getVehicleDetail, toVehicleDetailDisplay } from "@/lib/api/cars.ts"
import { brandOgCard, ogCardImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Alphaa Africa chauffeur car"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

/** Per-vehicle share card: name + type/rate over the vehicle photo. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  try {
    const { slug } = await params
    const display = toVehicleDetailDisplay(await getVehicleDetail(slug))
    const meta = [display.typeLabel, display.priceLabel]
      .filter(Boolean)
      .join(" · ")
    return ogCardImage({
      kicker: "Chauffeur & Car Hire",
      title: display.name,
      subtitle: meta || undefined,
      photoUrl: display.imageSrc.startsWith("http")
        ? display.imageSrc
        : undefined,
    })
  } catch {
    return brandOgCard({
      kicker: "Chauffeur & Car Hire",
      title: "Rent a Car with Driver",
    })
  }
}
