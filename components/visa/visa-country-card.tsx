import { HugeiconsIcon } from "@hugeicons/react"
import { Clock01Icon } from "@hugeicons/core-free-icons"
import type { VisaCountryList } from "@/lib/api/visa"
import { formatNaira } from "@/lib/format"
import { resolveListingImageUrl } from "@/lib/listings"
import { ListingCardShell, CardCta } from "@/components/shared/listing-card"

/**
 * Visa country card (RSC): flag, country, consultation fee, processing
 * time, and featured state. Links are crawlable by construction.
 */
export function VisaCountryCard({ country }: { country: VisaCountryList }) {
  return (
    <ListingCardShell
      href={`/visa/${country.slug}`}
      imageSrc={resolveListingImageUrl(country.flag_image)}
      imageAlt={`Flag of ${country.name} — visa consultation`}
      isFeatured={country.is_featured}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">
          {country.name}
        </h3>
        {country.processing_time && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <HugeiconsIcon
              icon={Clock01Icon}
              size={13}
              className="text-muted-foreground"
              aria-hidden="true"
            />
            {country.processing_time}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 border-t border-border/60 pt-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Consultation fee
          </span>
          <span className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            {formatNaira(country.consultation_fee)}
          </span>
        </div>
        <CardCta label="Start consultation" />
      </div>
    </ListingCardShell>
  )
}
