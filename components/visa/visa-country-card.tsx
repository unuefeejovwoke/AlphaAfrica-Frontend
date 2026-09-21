import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon } from "@hugeicons/core-free-icons";
import type { VisaCountryList } from "@/lib/api/visa";
import { formatNaira } from "@/lib/format";
import { resolveListingImageUrl } from "@/lib/listings";
import { ListingCardShell, CardCta } from "@/components/shared/listing-card";

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
      <h3 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary">
        {country.name}
      </h3>
      <p className="text-xs text-muted-foreground">
        Consultation fee{" "}
        <span className="font-semibold text-foreground">{formatNaira(country.consultation_fee)}</span>
      </p>
      {country.processing_time && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <HugeiconsIcon icon={Clock01Icon} size={14} className="text-primary" aria-hidden="true" />
          Processing: {country.processing_time}
        </p>
      )}
      <CardCta label="Start consultation" />
    </ListingCardShell>
  );
}
