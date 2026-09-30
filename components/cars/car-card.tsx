import { HugeiconsIcon } from "@hugeicons/react"
import {
  Car01Icon,
  Location01Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons"
import type { VehicleList } from "@/lib/api/cars"
import { toVehicleCardDisplay } from "@/lib/api/cars"
import { CardCta, ListingCardShell } from "@/components/shared/listing-card"

/**
 * Vehicle card — server-rendered crawlable card.
 * Type badge overlaid on the image, name, capacity + base city row, locked
 * hourly Naira copy with driver-included microcopy, CTA to detail.
 * Unusable prices render honest fallback copy instead of broken UI.
 */
export function CarCard({ vehicle }: { vehicle: VehicleList }) {
  const display = toVehicleCardDisplay(vehicle)

  return (
    <ListingCardShell
      href={display.href}
      imageSrc={display.imageSrc}
      imageAlt={display.imageAlt}
      badge={
        <span className="absolute top-3 left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-semibold text-white shadow-xs backdrop-blur-md">
          <HugeiconsIcon
            icon={Car01Icon}
            size={12}
            className="shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">{display.typeLabel}</span>
        </span>
      }
    >
      <h3 className="text-lg font-semibold tracking-tight text-balance text-foreground transition-colors group-hover:text-primary">
        {vehicle.name}
      </h3>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {display.capacityLabel ? (
          <span className="inline-flex items-center gap-1 font-medium">
            <HugeiconsIcon
              icon={UserMultiple02Icon}
              size={13}
              className="shrink-0"
              aria-hidden="true"
            />
            <span>{display.capacityLabel}</span>
          </span>
        ) : (
          <span>Seats confirmed on vehicle page</span>
        )}
        {display.placeLabel ? (
          <span className="inline-flex min-w-0 items-center gap-1">
            <HugeiconsIcon
              icon={Location01Icon}
              size={13}
              className="shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">Based in {display.placeLabel}</span>
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 border-t border-border/60 pt-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          {display.priceLabel ? (
            <>
              <p className="text-base font-bold tracking-tight text-balance text-foreground tabular-nums sm:text-lg">
                {display.priceLabel}
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Driver included
              </p>
            </>
          ) : (
            <p className="text-xs leading-relaxed font-medium text-muted-foreground">
              Rate confirmed at booking
            </p>
          )}
        </div>
        <CardCta label="View vehicle" />
      </div>
    </ListingCardShell>
  )
}
