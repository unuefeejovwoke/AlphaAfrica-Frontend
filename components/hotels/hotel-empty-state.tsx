import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon, Message01Icon } from "@hugeicons/core-free-icons"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TrackLink } from "@/components/analytics/track-link"
import {
  getHotelSupportWhatsAppUrl,
  type HotelStayContext,
} from "@/lib/api/hotels"

export interface HotelEmptyStateProps {
  stayContext: HotelStayContext
  hasPriceCap: boolean
  hasStarFloor: boolean
  onRaisePriceCap: () => void
  onLowerStars: () => void
  onStartOver: () => void
}

/**
 * Composed zero-results state (ticket 02): zero results never feel dead.
 * Every active constraint gets a one-tap widening action — raise the price
 * cap, lower the star floor — plus starting over and always having Talk to
 * Alphaa one tap away.
 */
export function HotelEmptyState({
  stayContext,
  hasPriceCap,
  hasStarFloor,
  onRaisePriceCap,
  onLowerStars,
  onStartOver,
}: HotelEmptyStateProps) {
  const suggestions: string[] = []
  if (hasPriceCap) suggestions.push("raising your price cap")
  if (hasStarFloor) suggestions.push("lowering the star floor")
  if (suggestions.length === 0)
    suggestions.push("trying a different city or Hotel name")

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-foreground">
        No Hotels found for this search
      </h3>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
        Try {suggestions.join(", ").replace(/, ([^,]*)$/, " or $1")}. Our
        specialists can also check options for you.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {hasPriceCap ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRaisePriceCap}
          >
            <span>Raise price cap</span>
          </Button>
        ) : null}
        {hasStarFloor ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLowerStars}
          >
            <span>Lower stars</span>
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={onStartOver}>
          <span>Start over</span>
        </Button>
        <TrackLink
          event="support_click"
          eventProps={{
            context: "finding a hotel for my stay",
            channel: "whatsapp",
          }}
          href={getHotelSupportWhatsAppUrl(
            "finding a hotel for my stay",
            stayContext
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "bg-emerald-600 text-white hover:bg-emerald-700"
          )}
        >
          <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
          <span>Talk to Alphaa</span>
        </TrackLink>
      </div>
    </div>
  )
}
