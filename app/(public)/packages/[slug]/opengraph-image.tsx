import { getPackageDetail } from "@/lib/api/packages.ts"
import { resolveListingImageUrl } from "@/lib/listings.ts"
import { formatNaira } from "@/lib/format.ts"
import { brandOgCard, ogCardImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Alphaa Africa holiday package"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

/** Per-package share card: title + destination/duration/price over the photo. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  try {
    const { slug } = await params
    const pkg = await getPackageDetail(slug)
    const meta = [
      pkg.destination_name,
      pkg.duration_days > 0 ? `${pkg.duration_days}-day trip` : null,
      `From ${formatNaira(pkg.price)}`,
    ]
      .filter(Boolean)
      .join(" · ")
    const photo = resolveListingImageUrl(pkg.main_image)
    return ogCardImage({
      kicker: "Holiday Packages",
      title: pkg.title,
      subtitle: meta,
      photoUrl: photo.startsWith("http") ? photo : undefined,
    })
  } catch {
    return brandOgCard({
      kicker: "Holiday Packages",
      title: "Holidays you can actually book",
    })
  }
}
