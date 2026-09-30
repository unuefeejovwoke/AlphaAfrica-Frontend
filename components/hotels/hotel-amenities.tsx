import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { amenityIconFor } from "@/components/hotels/hotel-amenity-icon"

/**
 * How many amenities the hero strip shows before deferring the remainder to
 * the full grid. Exported so the page can decide whether that grid is needed
 * without hardcoding the same number twice.
 */
export const HERO_AMENITY_LIMIT = 6

export interface HotelAmenityStripProps {
  amenities: string[]
  /** Reserve a leading slot for the "and N more" affordance. */
  deferToFullGrid?: boolean
  className?: string
}

/**
 * Amenities as icon chips.
 *
 * Amenities are a primary reason to pick one Hotel over another, so they sit
 * in the hero next to the name and rating where they do selling work, rather
 * than in a buried section. Each amenity renders exactly once: the hero strip
 * shows the first few and the full grid lower on the page picks up the rest
 * through the `deferToFullGrid` affordance, so nothing is duplicated.
 *
 * `amenityIconFor` returns null for free-text amenities it cannot place
 * confidently; those fall back to a neutral check rather than a wrong
 * pictogram.
 */
export function HotelAmenityStrip({
  amenities,
  deferToFullGrid = true,
  className,
}: HotelAmenityStripProps) {
  if (amenities.length === 0) return null

  const limit = deferToFullGrid ? HERO_AMENITY_LIMIT : amenities.length
  const visible = amenities.slice(0, limit)
  const overflow = amenities.length - visible.length

  return (
    <ul
      aria-label="Amenities"
      className={className ?? "flex flex-wrap items-center gap-2"}
    >
      {visible.map((amenity) => {
        const icon = amenityIconFor(amenity)
        return (
          <li
            key={amenity}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-[13px] font-medium text-foreground"
          >
            <HugeiconsIcon
              icon={icon ?? Tick01Icon}
              size={13}
              className="shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>{amenity}</span>
          </li>
        )
      })}
      {overflow > 0 ? (
        <li className="inline-flex items-center">
          {/* A real link, not a dead "N more" label: it takes the guest to
              the full list further down the page. */}
          <a
            href="#hotel-amenities"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {overflow} more
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={12}
              aria-hidden="true"
            />
            <span className="sr-only">amenities: jump to the full list</span>
          </a>
        </li>
      ) : null}
    </ul>
  )
}

/**
 * The complete amenity list, rendered as a labelled grid. Shown when the hero
 * strip deferred amenities, so every amenity appears exactly once per page.
 */
export function HotelAmenityGrid({ amenities }: { amenities: string[] }) {
  if (amenities.length === 0) return null

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {amenities.map((amenity) => {
        const icon = amenityIconFor(amenity)
        return (
          <li
            key={amenity}
            className="flex items-center gap-2.5 rounded-xl bg-card px-3.5 py-3 text-sm font-medium text-foreground ring-1 ring-border/70"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HugeiconsIcon
                icon={icon ?? Tick01Icon}
                size={15}
                aria-hidden="true"
              />
            </span>
            <span className="min-w-0 break-words">{amenity}</span>
          </li>
        )
      })}
    </ul>
  )
}
