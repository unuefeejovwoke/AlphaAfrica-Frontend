import { HugeiconsIcon } from "@hugeicons/react"
import {
  Location01Icon,
  StarIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import type { HotelList } from "@/lib/api/hotels"
import { toHotelCardDisplay } from "@/lib/api/hotels"
import { CardCta, ListingCardShell } from "@/components/shared/listing-card"

/**
 * Hotel card (Phase 4, ticket 02).
 *
 * CONTEXT.md vocabulary: Hotel = sellable lodging property with city/country,
 * star rating, amenities, and a from-price per night.
 *
 * Server-rendered crawlable card (like PackageCard): image with descriptive
 * alt text, Hotel name, display-only place context (city and country — no
 * radius behavior in v1), star rating, key amenities, locked from-price-per-
 * night copy, and a clear call to action to the Hotel detail. Missing images
 * fall back to a brand asset; empty amenities and unusable prices render
 * honest fallback copy instead of broken UI.
 */
export function HotelCard({ hotel }: { hotel: HotelList }) {
  const display = toHotelCardDisplay(hotel)

  return (
    <ListingCardShell
      href={display.href}
      imageSrc={display.imageSrc}
      imageAlt={display.imageAlt}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1 text-[11px] font-semibold tracking-wider text-primary uppercase">
          <HugeiconsIcon
            icon={Location01Icon}
            size={13}
            className="shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">{display.placeLabel}</span>
        </span>
        {display.starLabel ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-foreground">
            <HugeiconsIcon
              icon={StarIcon}
              size={13}
              className="text-amber-500"
              aria-hidden="true"
            />
            <span
              role="img"
              aria-label={`Rated ${hotel.star_rating} out of 5 stars`}
            >
              {display.starLabel}
            </span>
          </span>
        ) : (
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
            Star rating not listed
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold tracking-tight text-balance text-foreground transition-colors group-hover:text-primary">
        {hotel.name}
      </h3>

      {display.keyAmenities.length > 0 ? (
        <div>
          <ul className="mt-1 flex flex-col gap-1.5 pt-1">
            {display.keyAmenities.map((amenity) => (
              <li
                key={amenity}
                className="flex items-start gap-1.5 text-xs text-muted-foreground"
              >
                <HugeiconsIcon
                  icon={Tick01Icon}
                  size={14}
                  className="mt-0.5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <span className="line-clamp-1">{amenity}</span>
              </li>
            ))}
          </ul>
          {display.hasMoreAmenities ? (
            <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
              Plus more on the Hotel page
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Full amenities listed on the Hotel page.
        </p>
      )}

      <div className="mt-auto flex items-end justify-between gap-2 border-t border-border/60 pt-4">
        <div className="flex min-w-0 flex-col">
          {display.priceLabel ? (
            <p className="text-base font-bold tracking-tight text-balance text-foreground sm:text-lg">
              {display.priceLabel}
            </p>
          ) : (
            <p className="text-xs leading-relaxed font-medium text-muted-foreground">
              Prices confirmed at booking
            </p>
          )}
        </div>
        <CardCta label="View Hotel" />
      </div>
    </ListingCardShell>
  )
}
