import { getHotelDetail, toHotelDetailDisplay } from "@/lib/api/hotels.ts"
import { brandOgCard, ogCardImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Alphaa Africa hotel"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

/** Per-hotel share card: name + stars/place over the hotel photo. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  try {
    const { slug } = await params
    const display = toHotelDetailDisplay(await getHotelDetail(slug))
    const meta = [display.starLabel, display.placeLabel, display.fromPriceLabel]
      .filter(Boolean)
      .join(" · ")
    const photo = display.gallery[0]?.src ?? null
    return ogCardImage({
      kicker: "Hotels & Stays",
      title: display.name,
      subtitle: meta || undefined,
      photoUrl: photo?.startsWith("http") ? photo : undefined,
    })
  } catch {
    return brandOgCard({
      kicker: "Hotels & Stays",
      title: "Search Hotels by City or Hotel Name",
    })
  }
}
