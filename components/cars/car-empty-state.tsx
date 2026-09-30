"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { Car01Icon, Message01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TrackLink } from "@/components/analytics/track-link"
import { getCarSupportWhatsAppUrl } from "@/lib/api/cars"

/**
 * Empty vehicle results — answers what happened + what to do next.
 * Never leaves a blank container (PRD §12, §20).
 */
export function CarEmptyState({
  hasTypeFilter,
  hasRateCap,
  onClearFilters,
  onStartOver,
}: {
  hasTypeFilter: boolean
  hasRateCap: boolean
  onClearFilters: () => void
  onStartOver: () => void
}) {
  const hasFilters = hasTypeFilter || hasRateCap
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <HugeiconsIcon icon={Car01Icon} size={24} aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-foreground">
        No vehicles match that search
      </h3>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
        {hasFilters
          ? "Try a different vehicle type or raise the hourly cap — or browse every vehicle Alphaa has to offer."
          : "Our fleet changes often. Browse every vehicle or ask Alphaa and a specialist will confirm what is available for your trip."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {hasFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearFilters}
          >
            <span>Clear filters</span>
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={onStartOver}>
          <span>Browse all vehicles</span>
        </Button>
        <TrackLink
          event="support_click"
          eventProps={{ context: "finding a car", channel: "whatsapp" }}
          href={getCarSupportWhatsAppUrl("finding a car for my trip")}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
          <span>Talk to Alphaa</span>
        </TrackLink>
      </div>
    </div>
  )
}
