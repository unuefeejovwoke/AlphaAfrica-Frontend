import { HugeiconsIcon } from "@hugeicons/react"
import { Location01Icon } from "@hugeicons/core-free-icons"
import type { DestinationList } from "@/lib/api/destinations"
import { formatNaira } from "@/lib/format"
import { resolveListingImageUrl } from "@/lib/listings"
import { ListingCardShell, CardCta } from "@/components/shared/listing-card"

/**
 * Destination card (RSC): image, destination, country, package count,
 * starting price, and CTA. Featured entries carry a badge and sort first
 * (see `sortFeaturedFirst`). Links are crawlable by construction.
 */
export function DestinationCard({
  destination,
}: {
  destination: DestinationList
}) {
  const packageCount = destination.package_count
  return (
    <ListingCardShell
      href={`/destinations/${destination.slug}`}
      imageSrc={resolveListingImageUrl(destination.main_image)}
      imageAlt={`${destination.name}, ${destination.country} — holiday destination`}
      isFeatured={destination.is_featured}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        <HugeiconsIcon
          icon={Location01Icon}
          size={14}
          className="text-primary"
          aria-hidden="true"
        />
        {destination.country}
      </span>
      <h3 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary">
        {destination.name}
      </h3>
      <p className="text-xs text-muted-foreground">
        {packageCount} {packageCount === 1 ? "package" : "packages"} · From{" "}
        <span className="font-semibold text-foreground">
          {formatNaira(destination.starting_price)}
        </span>
      </p>
      <CardCta label="Explore destination" />
    </ListingCardShell>
  )
}
