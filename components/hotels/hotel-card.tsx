import { HugeiconsIcon } from "@hugeicons/react"
import { Location01Icon, StarIcon } from "@hugeicons/core-free-icons"
import type { HotelList } from "@/lib/api/hotels"
import { toHotelCardDisplay } from "@/lib/api/hotels"
import { CardCta, ListingCardShell } from "@/components/shared/listing-card"

/**
 * Hotel card — server-rendered crawlable card mirroring the vehicle card.
 * High-end visual hierarchy: star badge overlaid on the image, hotel name,
 * place row, amenity pill tags, locked from-price-per-night copy, and CTA to detail.
 * Missing images fall back to a brand asset; empty amenities and unusable
 * prices render honest fallback copy instead of broken UI.
 */
export function HotelCard({ hotel }: { hotel: HotelList }) {
  const display = toHotelCardDisplay(hotel)

  return (
    <ListingCardShell
      href={display.href}
      imageSrc={display.imageSrc}
      imageAlt={display.imageAlt}
      badge={
        display.starLabel ? (
          <span className="absolute top-3 left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full border border-white/20 bg-black/65 px-2.5 py-1 text-xs font-semibold text-white shadow-xs backdrop-blur-md">
            <HugeiconsIcon
              icon={StarIcon}
              size={12}
              className="shrink-0 fill-amber-400 text-amber-400"
              aria-hidden="true"
            />
            <span className="truncate">{display.starLabel}</span>
          </span>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-1 text-base font-bold tracking-tight text-balance text-foreground transition-colors group-hover:text-primary sm:text-lg">
          {hotel.name}
        </h3>

        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <HugeiconsIcon
            icon={Location01Icon}
            size={13}
            className="shrink-0 text-muted-foreground/80"
            aria-hidden="true"
          />
          <span className="truncate font-medium">{display.placeLabel}</span>
        </p>
      </div>

      {display.keyAmenities.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {display.keyAmenities.map((amenity) => (
            <span
              key={amenity}
              className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {amenity}
            </span>
          ))}
          {display.hasMoreAmenities ? (
            <span className="inline-flex items-center rounded-md border border-dashed border-border/70 bg-background/50 px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground/80">
              +more
            </span>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/75 italic">
          Full amenities on hotel page
        </p>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/50 pt-3.5">
        <p className="min-w-0 text-base font-extrabold tracking-tight text-balance text-foreground tabular-nums sm:text-lg">
          {display.priceLabel ?? "Prices confirmed at booking"}
        </p>
        <CardCta label="View Hotel" />
      </div>
    </ListingCardShell>
  )
}
