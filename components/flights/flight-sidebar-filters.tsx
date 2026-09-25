"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Sun01Icon,
  SunCloud01Icon,
  Moon02Icon,
  MoonStarIcon,
  Luggage01Icon,
  Clock01Icon,
  FilterIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { formatNaira } from "@/lib/format"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DEPARTURE_WINDOWS,
  type DepartureWindow,
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
  className?: string
}

const DEPARTURE_SLOTS: {
  key: DepartureWindow
  title: string
  time: string
  icon: typeof Sun01Icon
}[] = [
  {
    key: "morning",
    title: "Morning",
    time: "06:00 - 12:00",
    icon: Sun01Icon,
  },
  {
    key: "afternoon",
    title: "Afternoon",
    time: "12:00 - 18:00",
    icon: SunCloud01Icon,
  },
  {
    key: "evening",
    title: "Evening",
    time: "18:00 - 00:00",
    icon: Moon02Icon,
  },
  {
    key: "night",
    title: "Night",
    time: "00:00 - 06:00",
    icon: MoonStarIcon,
  },
]

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

  // Checked bag counts
  const bagCounts = React.useMemo(() => {
    let noBag = 0
    let oneBag = 0
    let twoBags = 0
    for (const o of allOffers) {
      const b = (o.baggage || "").toLowerCase()
      if (!b || b.includes("0") || b.includes("no ")) {
        noBag++
      } else if (b.includes("1") || b.includes("20kg") || b.includes("23kg")) {
        oneBag++
      } else {
        twoBags++
      }
    }
    return { noBag, oneBag, twoBags }
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
    filters.maxPriceNgn !== null

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
          <HugeiconsIcon icon={FilterIcon} size={16} className="text-primary" aria-hidden="true" />
          <h3 className="text-base font-bold text-foreground">Filters</h3>
        </div>
        {hasActive ? (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {/* 1. Stops */}
      <div className="space-y-2.5">
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

      {/* 2. Checked Bags */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Luggage01Icon} size={14} className="text-muted-foreground" aria-hidden="true" />
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Checked Bags
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">No checked bag</span>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {bagCounts.noBag}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">1 checked bag</span>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {bagCounts.oneBag}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">2 checked bags</span>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {bagCounts.twoBags}
            </span>
          </div>
        </div>
      </div>

      <hr className="border-border/60" />

      {/* 3. Price Filter */}
      <div className="space-y-2.5">
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
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground font-bold"
                      : "border-border bg-muted/40 text-foreground hover:bg-muted"
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <hr className="border-border/60" />

      {/* 4. Departure Time */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Clock01Icon} size={14} className="text-muted-foreground" aria-hidden="true" />
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Departure Time
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DEPARTURE_SLOTS.map((slot) => {
            const isSelected =
              filters.departureWindows?.includes(slot.key) ?? false
            const Icon = slot.icon

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
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 font-bold"
                    : "border-border bg-card text-foreground hover:bg-muted/50"
                )}
              >
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
          <div className="space-y-2.5">
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
      <div className="space-y-2.5">
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
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground font-bold"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
