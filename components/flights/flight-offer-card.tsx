"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Clock01Icon,
  Luggage01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { formatNaira } from "@/lib/format"
import type { FlightOfferDisplay } from "@/lib/api/flights"

export interface FlightOfferCardProps {
  offer: FlightOfferDisplay
  onSelect: (offer: FlightOfferDisplay) => void
  isSelecting?: boolean
}

export function FlightOfferCard({
  offer,
  onSelect,
  isSelecting,
}: FlightOfferCardProps) {
  return (
    <article
      aria-label={`Flight ${offer.airline} ${offer.airportsLabel}`}
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/20 sm:p-5"
      style={{ contentVisibility: "auto" } as React.CSSProperties}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HugeiconsIcon icon={Airplane01Icon} size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-foreground">
              {offer.airline}
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {offer.airportsLabel} · {offer.cabin}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-variant-numeric text-sm font-extrabold text-foreground tabular-nums">
            {offer.price === "—" ? "—" : formatNaira(offer.price)}
          </p>
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            {offer.currency}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/50 px-3 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Departure
          </p>
          <p className="font-variant-numeric text-sm font-semibold text-foreground tabular-nums">
            {offer.departureAt}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {offer.origin}
          </p>
        </div>
        <div className="flex min-w-0 flex-col items-center justify-center gap-1">
          <p className="text-xs font-medium text-muted-foreground">
            {offer.stopsLabel}
          </p>
          <span aria-hidden="true" className="flex w-full items-center gap-1">
            <span className="size-1.5 rounded-full bg-border" />
            <span className="h-px flex-1 bg-border" />
            <HugeiconsIcon
              icon={Airplane01Icon}
              size={12}
              aria-hidden="true"
              className="text-muted-foreground"
            />
            <span className="h-px flex-1 bg-border" />
            <span className="size-1.5 rounded-full bg-border" />
          </span>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Clock01Icon} size={12} aria-hidden="true" />
            <span className="font-variant-numeric tabular-nums">
              {offer.duration}
            </span>
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Arrival
          </p>
          <p className="font-variant-numeric text-sm font-semibold text-foreground tabular-nums">
            {offer.arrivalAt}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {offer.destination}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1">
          <HugeiconsIcon icon={Clock01Icon} size={12} aria-hidden="true" />
          <span>{offer.duration}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1">
          <span>{offer.stopsLabel}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1">
          <span>{offer.cabin}</span>
        </span>
        {offer.baggage ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1">
            <HugeiconsIcon icon={Luggage01Icon} size={12} aria-hidden="true" />
            <span>{offer.baggage}</span>
          </span>
        ) : null}
      </div>

      <Button
        type="button"
        size="lg"
        onClick={() => onSelect(offer)}
        disabled={!!isSelecting}
        isLoading={!!isSelecting}
        aria-label={`Select flight ${offer.airline} ${offer.airportsLabel} for ${offer.price === "—" ? offer.currency : formatNaira(offer.price)}`}
        className="w-full justify-center"
      >
        <span>Select flight</span>
      </Button>
    </article>
  )
}

export function FlightOfferSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-xl bg-muted" />
          <div className="flex flex-col gap-2">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-2 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-6 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
      <div className="h-9 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
