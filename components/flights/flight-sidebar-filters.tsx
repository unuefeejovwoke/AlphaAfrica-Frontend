"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Sun01Icon,
  SunCloud01Icon,
  Moon02Icon,
  MoonStarIcon,
  Clock01Icon,
  FilterIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { formatNaira } from "@/lib/format"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DEPARTURE_WINDOW_SLOTS,
  isFilterPressed,
  type DepartureWindow,
  type DurationCeilingOption,
  type FlightFilters,
  type FlightSortKey,
  type PriceCeilingOption,
} from "@/lib/api/flight-filters"
import type { AirlineOption } from "@/components/flights/use-filtered-offers"
import type { FlightOfferDisplay } from "@/lib/api/flights"
import { parseNairaAmount } from "@/lib/api/flight-filters"

export interface FlightSidebarFiltersProps {
  filters: FlightFilters
  sort: FlightSortKey
  onFiltersChange: (patch: Partial<FlightFilters>) => void
  onReset: () => void
  airlineOptions: AirlineOption[]
  allOffers: FlightOfferDisplay[]
  priceCeilings?: PriceCeilingOption[]
  durationCeilings?: DurationCeilingOption[]
  className?: string
}

const DEPARTURE_WINDOW_ICONS: Record<DepartureWindow, typeof Sun01Icon> = {
  morning: Sun01Icon,
  afternoon: SunCloud01Icon,
  evening: Moon02Icon,
  night: MoonStarIcon,
}

const CABIN_OPTIONS: { label: string; value: string | null }[] = [
  { label: "Any Cabin", value: null },
  { label: "Economy", value: "ECONOMY" },
  { label: "Premium Economy", value: "PREMIUM_ECONOMY" },
  { label: "Business", value: "BUSINESS" },
  { label: "First", value: "FIRST" },
]

function toggleValue<T>(list: readonly T[] | null, value: T): T[] | null {
  const current = list ?? []
  if (current.includes(value)) {
    const next = current.filter((v) => v !== value)
    return next.length > 0 ? next : null
  }
  return [...current, value]
}

export function FlightSidebarFilters({
  filters,
  onFiltersChange,
  onReset,
  airlineOptions,
  allOffers,
  priceCeilings,
  durationCeilings,
  className,
}: FlightSidebarFiltersProps) {
  // Compute dynamic counts from all offers
  const stopCounts = React.useMemo(() => {
    let direct = 0
    let oneStop = 0
    let twoPlus = 0
    for (const o of allOffers) {
      if (o.stops === 0) direct++
      else if (o.stops === 1) oneStop++
      else twoPlus++
    }
    return { direct, oneStop, twoPlus }
  }, [allOffers])

  // Price range (min and max across offers)
  const priceRange = React.useMemo(() => {
    const amounts = allOffers
      .map((o) => parseNairaAmount(o.price))
      .filter((p): p is number => p !== null && p > 0)
    if (amounts.length === 0) return { min: 0, max: 0 }
    return {
      min: Math.min(...amounts),
      max: Math.max(...amounts),
    }
  }, [allOffers])

  const hasActive =
    filters.stops !== null ||
    filters.departureWindows !== null ||
    filters.airlines !== null ||
    filters.cabin !== null ||
    filters.maxPriceNgn !== null ||
    filters.maxDurationMin !== null

  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-2xl border border-border/80 bg-card p-4 shadow-xs sm:p-5",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={FilterIcon}
            size={16}
            className="text-primary"
            aria-hidden="true"
          />
          <h3 className="text-base font-bold text-foreground">Filters</h3>
        </div>
        {hasActive ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded text-xs font-semibold text-primary transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {/* 1. Stops */}
      <div role="group" aria-label="Stops" className="space-y-2.5">
        <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          Stops
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Checkbox
              label="Direct"
              checked={filters.stops?.includes(0) ?? false}
              onCheckedChange={() =>
                onFiltersChange({ stops: toggleValue(filters.stops, 0) })
              }
            />
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {stopCounts.direct}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <Checkbox
              label="1 stop"
              checked={filters.stops?.includes(1) ?? false}
              onCheckedChange={() =>
                onFiltersChange({ stops: toggleValue(filters.stops, 1) })
              }
            />
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {stopCounts.oneStop}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <Checkbox
              label="2+ stops"
              checked={filters.stops?.includes(2) ?? false}
              onCheckedChange={() =>
                onFiltersChange({ stops: toggleValue(filters.stops, 2) })
              }
            />
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {stopCounts.twoPlus}
            </span>
          </div>
        </div>
      </div>

      <hr className="border-border/60" />

      {/* 2. Price Filter */}
      <div role="group" aria-label="Maximum price" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Price
          </p>
          {priceRange.max > 0 ? (
            <span className="text-[11px] font-bold text-foreground tabular-nums">
              {formatNaira(priceRange.min)} – {formatNaira(priceRange.max)}
            </span>
          ) : null}
        </div>

        {priceCeilings && priceCeilings.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {priceCeilings.map((option) => {
              const isSelected = filters.maxPriceNgn === option.value
              return (
                <button
                  key={`${option.label}-${option.value ?? "all"}`}
                  type="button"
                  onClick={() => onFiltersChange({ maxPriceNgn: option.value })}
                  aria-pressed={filters.maxPriceNgn === option.value}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isSelected
                      ? "border-primary bg-primary font-bold text-primary-foreground"
                      : "border-border bg-muted/40 text-foreground hover:bg-muted"
                  )}
                >
                  {isSelected ? (
                    <HugeiconsIcon
                      icon={Tick01Icon}
                      size={12}
                      aria-hidden="true"
                      className="mr-1 inline-block"
                    />
                  ) : null}
                  {option.label}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <hr className="border-border/60" />

      {/* 4. Duration */}
      <div role="group" aria-label="Maximum duration" className="space-y-2.5">
        <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          Duration
        </p>
        {durationCeilings && durationCeilings.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {durationCeilings.map((option) => {
              const isSelected = filters.maxDurationMin === option.value
              return (
                <button
                  key={`${option.label}-${option.value ?? "all"}`}
                  type="button"
                  onClick={() =>
                    onFiltersChange({ maxDurationMin: option.value })
                  }
                  aria-pressed={filters.maxDurationMin === option.value}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isSelected
                      ? "border-primary bg-primary font-bold text-primary-foreground"
                      : "border-border bg-muted/40 text-foreground hover:bg-muted"
                  )}
                >
                  {isSelected ? (
                    <HugeiconsIcon
                      icon={Tick01Icon}
                      size={12}
                      aria-hidden="true"
                      className="mr-1 inline-block"
                    />
                  ) : null}
                  {option.label}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <hr className="border-border/60" />

      {/* 5. Departure Time */}
      <div role="group" aria-label="Departure time" className="space-y-2.5">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            icon={Clock01Icon}
            size={14}
            className="text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Departure Time
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DEPARTURE_WINDOW_SLOTS.map((slot) => {
            const isSelected = isFilterPressed(
              filters.departureWindows,
              slot.key
            )
            const Icon = DEPARTURE_WINDOW_ICONS[slot.key]

            return (
              <button
                key={slot.key}
                type="button"
                onClick={() =>
                  onFiltersChange({
                    departureWindows: toggleValue(
                      filters.departureWindows,
                      slot.key
                    ),
                  })
                }
                aria-pressed={isSelected}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isSelected
                    ? "border-primary bg-primary/10 font-bold text-primary ring-1 ring-primary/40"
                    : "border-border bg-card text-foreground hover:bg-muted/50"
                )}
              >
                {isSelected ? (
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    size={13}
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 text-primary"
                  />
                ) : null}
                <HugeiconsIcon
                  icon={Icon}
                  size={18}
                  className={isSelected ? "text-primary" : "text-amber-500"}
                  aria-hidden="true"
                />
                <span className="mt-1 text-xs font-bold">{slot.title}</span>
                <span className="text-[10px] text-muted-foreground">
                  {slot.time}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {airlineOptions.length > 0 ? (
        <>
          <hr className="border-border/60" />
          {/* 5. Airlines */}
          <div role="group" aria-label="Airlines" className="space-y-2.5">
            <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Airlines
            </p>
            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {airlineOptions.map((opt) => {
                const isSelected = filters.airlines?.includes(opt.name) ?? false
                return (
                  <div
                    key={opt.name}
                    className="flex items-center justify-between"
                  >
                    <Checkbox
                      label={opt.name}
                      checked={isSelected}
                      onCheckedChange={() =>
                        onFiltersChange({
                          airlines: toggleValue(filters.airlines, opt.name),
                        })
                      }
                    />
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                      {opt.count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : null}

      <hr className="border-border/60" />

      {/* 6. Cabin */}
      <div role="group" aria-label="Cabin class" className="space-y-2.5">
        <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          Cabin Class
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CABIN_OPTIONS.map((opt) => {
            const isSelected = filters.cabin === opt.value
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onFiltersChange({ cabin: opt.value })}
                aria-pressed={isSelected}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isSelected
                    ? "border-primary bg-primary font-bold text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                {isSelected ? (
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    size={12}
                    aria-hidden="true"
                    className="mr-1 inline-block"
                  />
                ) : null}
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
