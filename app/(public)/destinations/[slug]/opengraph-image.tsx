import { getDestinationDetail } from "@/lib/api/destinations.ts"
import { resolveListingImageUrl } from "@/lib/listings.ts"
import { brandOgCard, ogCardImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Alphaa Africa destination"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

/** Per-destination share card: name + country over the destination photo. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  try {
    const { slug } = await params
    const destination = await getDestinationDetail(slug)
    const count = destination.packages.length
    const meta = [
      destination.country,
      count > 0
        ? `${count} package${count === 1 ? "" : "s"}`
        : "Curated packages",
    ].join(" · ")
    const photo = resolveListingImageUrl(destination.main_image)
    return ogCardImage({
      kicker: "Destinations",
      title: destination.name,
      subtitle: meta,
      photoUrl: photo.startsWith("http") ? photo : undefined,
    })
  } catch {
    return brandOgCard({
      kicker: "Destinations",
      title: "See where you can go",
    })
  }
}
