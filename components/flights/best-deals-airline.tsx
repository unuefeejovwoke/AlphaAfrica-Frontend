"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { formatNaira } from "@/lib/format"
import { parseNairaAmount } from "@/lib/api/flight-filters"
import type { FlightOfferDisplay } from "@/lib/api/flights"
import { AirlineLogo } from "@/components/flights/airline-logo"

export interface BestDealsAirlineProps {
  offers: FlightOfferDisplay[]
  origin?: string
  destination?: string
  selectedAirlines?: string[] | null
  onSelectAirline?: (airline: string) => void
  className?: string
}

interface AirlineDeal {
  airline: string
  nonStopMin: number | null
  oneStopMin: number | null
  twoPlusStopMin: number | null
  overallMin: number | null
  primaryStops: string
}

export function BestDealsAirline({
  offers,
  origin,
  destination,
  selectedAirlines,
  onSelectAirline,
  className,
}: BestDealsAirlineProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [showAllMobile, setShowAllMobile] = React.useState(false)

  // Compute deals per airline
  const deals = React.useMemo<AirlineDeal[]>(() => {
    const byAirline = new Map<
      string,
      { nonStop: number[]; oneStop: number[]; twoPlus: number[] }
    >()

    for (const offer of offers) {
      if (!offer.airline || offer.airline === "—") continue
      const amount = parseNairaAmount(offer.price)
      if (amount === null || amount <= 0) continue

      if (!byAirline.has(offer.airline)) {
        byAirline.set(offer.airline, { nonStop: [], oneStop: [], twoPlus: [] })
      }
      const entry = byAirline.get(offer.airline)!
      if (offer.stops === 0) {
        entry.nonStop.push(amount)
      } else if (offer.stops === 1) {
        entry.oneStop.push(amount)
      } else {
        entry.twoPlus.push(amount)
      }
    }

    const result: AirlineDeal[] = []
    for (const [airline, data] of byAirline.entries()) {
      const nonStopMin = data.nonStop.length > 0 ? Math.min(...data.nonStop) : null
      const oneStopMin = data.oneStop.length > 0 ? Math.min(...data.oneStop) : null
      const twoPlusStopMin =
        data.twoPlus.length > 0 ? Math.min(...data.twoPlus) : null

      const validPrices = [nonStopMin, oneStopMin, twoPlusStopMin].filter(
        (p): p is number => p !== null
      )
      const overallMin = validPrices.length > 0 ? Math.min(...validPrices) : null

      let primaryStops = "Various"
      if (nonStopMin !== null && nonStopMin === overallMin) primaryStops = "Non-stop"
      else if (oneStopMin !== null && oneStopMin === overallMin) primaryStops = "1 Stop"
      else if (twoPlusStopMin !== null && twoPlusStopMin === overallMin) primaryStops = "2+ Stops"

      result.push({
        airline,
        nonStopMin,
        oneStopMin,
        twoPlusStopMin,
        overallMin,
        primaryStops,
      })
    }

    // Sort by lowest overall fare ascending
    return result.sort((a, b) => (a.overallMin ?? Infinity) - (b.overallMin ?? Infinity))
  }, [offers])

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -240, behavior: "smooth" })
    }
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 240, behavior: "smooth" })
    }
  }

  if (deals.length === 0) return null

  const routeLabel =
    origin && destination && origin !== "—" && destination !== "—"
      ? `${origin} → ${destination}`
      : "Cheapest fares at a glance"

  const displayedMobileDeals = showAllMobile ? deals : deals.slice(0, 3)

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs sm:p-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground sm:text-lg">
            Best Deals by Airline
          </h3>
          <p className="text-xs text-muted-foreground">
            {routeLabel} · Cheapest fares at a glance
          </p>
        </div>

        {/* Carousel arrows (Desktop) */}
        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={scrollLeft}
            aria-label="Scroll airlines left"
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            aria-label="Scroll airlines right"
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Desktop Matrix Comparison Table */}
      <div className="hidden sm:block">
        <div
          ref={scrollRef}
          className="no-scrollbar flex min-w-0 overflow-x-auto pb-1"
        >
          {/* Row Labels Left Column */}
          <div className="sticky left-0 z-10 w-24 shrink-0 border-r border-border bg-card pr-3">
            <div className="h-16 flex items-end pb-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Stops
              </span>
            </div>
            <div className="flex h-10 items-center border-t border-border/60 text-xs font-semibold text-muted-foreground">
              Non stop
            </div>
            <div className="flex h-10 items-center border-t border-border/60 text-xs font-semibold text-muted-foreground">
              1 Stop
            </div>
            <div className="flex h-10 items-center border-t border-border/60 text-xs font-semibold text-muted-foreground">
              2+ Stops
            </div>
          </div>

          {/* Airline Deal Columns */}
          <div className="flex min-w-0 divide-x divide-border/60">
            {deals.map((deal) => {
              const isSelected =
                selectedAirlines?.includes(deal.airline) ?? false

              return (
                <button
                  key={deal.airline}
                  type="button"
                  onClick={() => onSelectAirline?.(deal.airline)}
                  className={cn(
                    "flex w-36 shrink-0 flex-col items-center px-2 py-1 text-center transition-colors hover:bg-muted/40",
                    isSelected && "bg-primary/5 ring-1 ring-primary/30"
                  )}
                >
                  {/* Airline Header */}
                  <div className="flex h-16 w-full flex-col items-center justify-center gap-1">
                    <AirlineLogo airline={deal.airline} size="sm" />
                    <span className="line-clamp-1 w-full text-[11px] font-bold text-foreground">
                      {deal.airline}
                    </span>
                  </div>

                  {/* Non stop row */}
                  <div className="flex h-10 w-full items-center justify-center border-t border-border/60 text-xs tabular-nums">
                    {deal.nonStopMin ? (
                      <span className="font-bold text-foreground">
                        {formatNaira(deal.nonStopMin)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </div>

                  {/* 1 stop row */}
                  <div className="flex h-10 w-full items-center justify-center border-t border-border/60 text-xs tabular-nums">
                    {deal.oneStopMin ? (
                      <span className="font-bold text-foreground">
                        {formatNaira(deal.oneStopMin)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </div>

                  {/* 2+ stops row */}
                  <div className="flex h-10 w-full items-center justify-center border-t border-border/60 text-xs tabular-nums">
                    {deal.twoPlusStopMin ? (
                      <span className="font-bold text-foreground">
                        {formatNaira(deal.twoPlusStopMin)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile Compact List View */}
      <div className="flex flex-col gap-2 sm:hidden">
        {displayedMobileDeals.map((deal) => {
          const isSelected = selectedAirlines?.includes(deal.airline) ?? false
          return (
            <button
              key={deal.airline}
              type="button"
              onClick={() => onSelectAirline?.(deal.airline)}
              className={cn(
                "flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 text-left transition-colors hover:border-primary/40 active:scale-[0.99]",
                isSelected && "border-primary bg-primary/5"
              )}
            >
              <div className="flex items-center gap-3">
                <AirlineLogo airline={deal.airline} size="sm" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    {deal.airline}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {deal.primaryStops}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-foreground tabular-nums">
                  {deal.overallMin ? formatNaira(deal.overallMin) : "—"}
                </span>
              </div>
            </button>
          )
        })}

        {deals.length > 3 ? (
          <button
            type="button"
            onClick={() => setShowAllMobile(!showAllMobile)}
            className="mt-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <span>
              {showAllMobile
                ? "Show Less Airlines"
                : `View ${deals.length - 3} More Airlines`}
            </span>
            <HugeiconsIcon
              icon={showAllMobile ? ChevronUpIcon : ChevronDownIcon}
              size={14}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
    </div>
  )
}
