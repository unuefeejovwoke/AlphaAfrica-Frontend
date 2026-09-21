import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import type { PackageList } from "@/lib/api/packages";
import { formatNaira } from "@/lib/format";
import { resolveListingImageUrl } from "@/lib/listings";
import { ListingCardShell, CardCta } from "@/components/shared/listing-card";

/**
 * Package card (RSC): title, destination, duration, starting price,
 * key inclusions, and image. Links are crawlable by construction.
 */
export function PackageCard({ pkg }: { pkg: PackageList }) {
  return (
    <ListingCardShell
      href={`/packages/${pkg.slug}`}
      imageSrc={resolveListingImageUrl(pkg.main_image)}
      imageAlt={`${pkg.title} — ${pkg.destination_name}`}
      isFeatured={pkg.is_featured}
    >
      <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {pkg.destination_name}
      </span>
      <h3 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary">
        {pkg.title}
      </h3>
      {pkg.summary && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{pkg.summary}</p>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <HugeiconsIcon icon={Calendar01Icon} size={14} className="text-primary" aria-hidden="true" />
        {pkg.duration_days} {pkg.duration_days === 1 ? "day" : "days"} · From{" "}
        <span className="font-semibold text-foreground">{formatNaira(pkg.price)}</span> per person
      </p>
      {pkg.inclusions_list.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {pkg.inclusions_list.slice(0, 3).map((inclusion) => (
            <li key={inclusion} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <HugeiconsIcon
                icon={Tick01Icon}
                size={14}
                className="mt-0.5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <span className="line-clamp-1">{inclusion}</span>
            </li>
          ))}
        </ul>
      )}
      <CardCta label="View package" />
    </ListingCardShell>
  );
}
