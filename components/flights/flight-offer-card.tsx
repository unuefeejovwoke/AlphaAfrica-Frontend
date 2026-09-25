"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Luggage01Icon,
  StarIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { formatNaira } from "@/lib/format"
import { parseNairaAmount } from "@/lib/api/flight-filters"
import type { FlightOfferDisplay } from "@/lib/api/flights"
import { AirlineLogo } from "@/components/flights/airline-logo"
import { cn } from "@/lib/utils"

export interface FlightOfferCardProps {
  offer: FlightOfferDisplay
  onSelect: (offer: FlightOfferDisplay) => void
  isSelecting?: boolean
  isCheapest?: boolean
  isFastest?: boolean
  relatedFlightCount?: number
  onViewRelated?: (airline: string) => void
  className?: string
}

export function FlightOfferCard({
  offer,
  onSelect,
  isSelecting,
  isCheapest,
  isFastest,
  relatedFlightCount,
  onViewRelated,
  className,
}: FlightOfferCardProps) {
  const [detailsOpen, setDetailsOpen] = React.useState(false)

  const journeys = Array.isArray(offer.journeys) ? offer.journeys : []
  const firstJourney = journeys[0]
  const segments = firstJourney?.segments ?? []

  // Extract layover airport code(s) for stops e.g. "1 stop · NBO"
  const layoverCode = React.useMemo(() => {
    if (offer.stops === 0) return "Direct"
    if (segments.length > 1) {
      const layovers = segments
        .slice(0, -1)
        .map((s) => s.arrivalAirport)
        .filter((code) => code && code !== "—" && code !== offer.destination)
      if (layovers.length > 0) {
        return `${offer.stops} ${offer.stops === 1 ? "stop" : "stops"} · ${layovers.join(", ")}`
      }
    }
    return offer.stopsLabel
  }, [offer.stops, offer.stopsLabel, offer.destination, segments])

  // Parse fare amounts
  const rawPrice = parseNairaAmount(offer.price)
  const primePrice = rawPrice ? Math.round(rawPrice * 0.9) : null
  const instalmentQuarter = rawPrice && rawPrice >= 200000 ? Math.round(rawPrice / 4) : null

  // Check if arrival is next day (+1) or multi-day (+2)
  const isNextDay = React.useMemo(() => {
    // If departure time and arrival time indicate overnight crossing
    if (offer.duration.includes("h")) {
      const hoursMatch = offer.duration.match(/(\d+)h/)
      if (hoursMatch && parseInt(hoursMatch[1], 10) >= 12) return "+1"
    }
    return null
  }, [offer.duration])

  // Deterministic refund policy flag: major full-service airlines allow refundable with penalty
  const isRefundable = React.useMemo(() => {
    const fullService = [
      "kenya airways",
      "ethiopian airlines",
      "qatar airways",
      "turkish airlines",
      "saudi arabian airlines",
      "emirates",
      "british airways",
    ]
    const name = offer.airline.toLowerCase()
    return fullService.some((airline) => name.includes(airline))
  }, [offer.airline])

  // Baggage display
  const cabinBaggage = "1 × 7kg cabin"
  const checkedBaggage = offer.baggage || "2 × 23kg checked"

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <article
        aria-label={`Flight offer ${offer.airline} ${offer.airportsLabel}`}
        className="flex min-w-0 flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-shadow hover:shadow-md sm:p-5"
        style={{ contentVisibility: "auto" } as React.CSSProperties}
      >
        {/* Card Header: Airline Info + Book Now CTA */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-3">
            <AirlineLogo airline={offer.airline} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground sm:text-lg">
                  {offer.airline}
                </h3>
                {isCheapest ? (
                  <span className="inline-flex items-center rounded-full bg-blue-600/10 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                    Cheapest
                  </span>
                ) : null}
                {isFastest ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    Fastest
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {offer.cabin} · {offer.airportsLabel}
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="default"
            onClick={() => onSelect(offer)}
            disabled={!!isSelecting}
            isLoading={!!isSelecting}
            className="rounded-xl bg-primary px-6 font-bold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.98]"
          >
            <span>Book Now</span>
          </Button>
        </div>

        {/* 3 Fare Option Boxes */}
        <div className="my-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {/* 1. FULL PAY */}
          <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                FULL PAY
              </span>
            </div>
            <div className="my-1.5">
              <p className="text-base font-extrabold text-foreground tabular-nums sm:text-lg">
                {offer.price === "—" ? "—" : formatNaira(offer.price)}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Pay once · total fare
            </p>
          </div>

          {/* 2. ALPHAA PRIME */}
          <div className="flex flex-col justify-between rounded-xl border border-secondary bg-secondary p-3 text-secondary-foreground shadow-2xs">
            <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-300 uppercase">
              <HugeiconsIcon icon={StarIcon} size={12} className="fill-amber-300" aria-hidden="true" />
              <span>PRIME</span>
              <HugeiconsIcon icon={InformationCircleIcon} size={11} aria-hidden="true" />
            </div>
            <div className="my-1.5">
              <p className="text-base font-extrabold text-amber-300 tabular-nums sm:text-lg">
                {primePrice ? formatNaira(primePrice) : formatNaira(offer.price)}
              </p>
            </div>
            <p className="text-[11px] text-purple-100">
              Member exclusive pricing
            </p>
          </div>

          {/* 3. PAY SMALL SMALL */}
          <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                PAY SMALL SMALL
              </span>
            </div>
            <div className="my-1.5">
              <p className="text-xs font-bold text-foreground sm:text-sm">
                {instalmentQuarter
                  ? `From ${formatNaira(instalmentQuarter)} / mo`
                  : "Not eligible"}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {instalmentQuarter
                ? "Pay in 4 easy instalments"
                : "Available on selected fares"}
            </p>
          </div>
        </div>

        {/* Flight Timing & Path Row */}
        <div className="rounded-xl bg-muted/30 p-3.5 sm:p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Depart {offer.departureAt} · {offer.airline}
          </p>

          <div className="flex items-center justify-between gap-3 sm:gap-6">
            {/* Departure */}
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-foreground tabular-nums sm:text-2xl">
                {offer.departureAt}
              </p>
              <p className="text-xs font-bold text-muted-foreground sm:text-sm">
                {offer.origin}
              </p>
            </div>

            {/* Path Graphic & Duration */}
            <div className="flex flex-1 flex-col items-center justify-center px-2">
              <p className="text-xs font-bold text-foreground tabular-nums">
                {offer.duration}
              </p>
              <div className="relative my-1.5 flex w-full max-w-[200px] items-center">
                <span className="size-2 rounded-full border-2 border-primary bg-background" />
                <div className="h-0.5 flex-1 bg-border" />
                {offer.stops > 0 ? (
                  <span className="size-2.5 rounded-full bg-amber-500" title={layoverCode} />
                ) : (
                  <HugeiconsIcon
                    icon={Airplane01Icon}
                    size={14}
                    className="text-primary"
                    aria-hidden="true"
                  />
                )}
                <div className="h-0.5 flex-1 bg-border" />
                <span className="size-2 rounded-full border-2 border-primary bg-background" />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {layoverCode}
              </p>
            </div>

            {/* Arrival */}
            <div className="min-w-0 text-right">
              <p className="text-xl font-extrabold text-foreground tabular-nums sm:text-2xl">
                {offer.arrivalAt}
                {isNextDay ? (
                  <sup className="ml-1 text-xs font-black text-primary">
                    {isNextDay}
                  </sup>
                ) : null}
              </p>
              <p className="text-xs font-bold text-muted-foreground sm:text-sm">
                {offer.destination}
              </p>
            </div>
          </div>

          {/* Baggage Inclusions */}
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <HugeiconsIcon icon={Luggage01Icon} size={14} aria-hidden="true" />
              <span>{cabinBaggage}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <HugeiconsIcon icon={Luggage01Icon} size={14} aria-hidden="true" />
              <span>{checkedBaggage}</span>
            </span>
          </div>
        </div>

        {/* Footer: Refund Policy + View Details Toggle */}
        <div className="mt-3.5 flex items-center justify-between border-t border-border/60 pt-3">
          <div>
            {isRefundable ? (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Refundable (Penalty Applies)
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                Non-Refundable (Non-Refundable for No-Show)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80"
          >
            <span>{detailsOpen ? "Hide Details" : "View Flight Details"}</span>
            <HugeiconsIcon
              icon={detailsOpen ? ChevronUpIcon : ChevronDownIcon}
              size={14}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Expanded Journey Timeline Details */}
        {detailsOpen ? (
          <div className="mt-4 rounded-xl border border-border/80 bg-muted/20 p-4">
            <h4 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Flight Itinerary & Segments
            </h4>
            {journeys.map((journey) => (
              <div key={journey.index} className="space-y-3">
                <ol className="space-y-3">
                  {journey.segments.map((seg, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3 text-xs"
                    >
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-foreground">
                            {seg.departureAirport} ({seg.departureAt}) → {seg.arrivalAirport} ({seg.arrivalAt})
                          </p>
                          <span className="font-semibold text-muted-foreground tabular-nums">
                            {seg.duration || "Direct"}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          {[
                            offer.airline,
                            seg.flightNumber ? `Flight ${seg.flightNumber}` : null,
                            seg.cabin || offer.cabin,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ) : null}
      </article>

      {/* Accordion to view more flights from this airline */}
      {relatedFlightCount && relatedFlightCount > 1 ? (
        <button
          type="button"
          onClick={() => onViewRelated?.(offer.airline)}
          className="flex items-center justify-center gap-1.5 py-1 text-xs font-bold tracking-wide text-primary uppercase transition-colors hover:text-primary/80"
        >
          <span>+{relatedFlightCount - 1} {offer.airline} Flights</span>
          <HugeiconsIcon icon={ChevronDownIcon} size={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

export function FlightOfferSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        </div>
        <div className="h-9 w-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        <div className="h-20 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        <div className="h-20 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      </div>

      <div className="h-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
    </div>
  )
}
