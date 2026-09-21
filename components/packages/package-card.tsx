import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import type { PackageList } from "@/lib/api/packages";
import { formatNaira } from "@/lib/format";
import { resolveListingImageUrl } from "@/lib/listings";
import { ListingCardShell, CardCta } from "@/components/shared/listing-card";

/**
 * Package card (RSC): destination, duration, title, summary,
 * key inclusions, starting price, and CTA. Links are crawlable by construction.
 */
export function PackageCard({ pkg }: { pkg: PackageList }) {
  return (
    <ListingCardShell
      href={`/packages/${pkg.slug}`}
      imageSrc={resolveListingImageUrl(pkg.main_image)}
      imageAlt={`${pkg.title} — ${pkg.destination_name}`}
      isFeatured={pkg.is_featured}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-primary uppercase">
          {pkg.destination_name}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <HugeiconsIcon icon={Calendar01Icon} size={13} className="text-muted-foreground" aria-hidden="true" />
          {pkg.duration_days} {pkg.duration_days === 1 ? "day" : "days"}
        </span>
      </div>

      <h3 className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
        {pkg.title}
      </h3>

      {pkg.summary && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{pkg.summary}</p>
      )}

      {pkg.inclusions_list.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1.5 pt-1">
          {pkg.inclusions_list.slice(0, 3).map((inclusion) => (
            <li key={inclusion} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <HugeiconsIcon
                icon={Tick01Icon}
                size={14}
                className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-500"
                aria-hidden="true"
              />
              <span className="line-clamp-1">{inclusion}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-4 border-t border-border/60 flex items-end justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground">From</span>
          <span className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            {formatNaira(pkg.price)}
          </span>
        </div>
        <CardCta label="View package" />
      </div>
    </ListingCardShell>
  );
}
