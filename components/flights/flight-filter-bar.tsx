"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { Select } from "@/components/ui/select"
import {
  DEPARTURE_WINDOWS,
  FLIGHT_SORT_KEYS,
  PRESET_DURATION_CEILINGS,
  PRESET_PRICE_CEILINGS,
  countActiveFilterGroups,
  type DepartureWindow,
  type DurationCeilingOption,
  type FlightFilters,
  type FlightSortKey,
  type PriceCeilingOption,
} from "@/lib/api/flight-filters"
import type { AirlineOption } from "@/components/flights/use-filtered-offers"

export interface FlightFilterBarProps {
  filters: FlightFilters
  sort: FlightSortKey
  onFiltersChange: (patch: Partial<FlightFilters>) => void
  onSortChange: (sort: FlightSortKey) => void
  onReset: () => void
  airlineOptions: AirlineOption[]
  visibleCount: number
  totalCount: number
  isFiltering: boolean
  /** Route mode pill: domestic live-streaming versus international instant. */
  mode: "domestic" | "international" | null
  /** True while results reconcile (deferred) — count reads "Updating…". */
  isStale?: boolean
  /** True while domestic cards still stream — count reads progressive copy. */
  isStreaming?: boolean
  /** Live ceilings derived from accumulated results; presets remain as shortcuts. */
  priceCeilings?: PriceCeilingOption[]
  durationCeilings?: DurationCeilingOption[]
}

const STOPS_OPTIONS: { label: string; value: 0 | 1 | 2 }[] = [
  { label: "Non-stop", value: 0 },
  { label: "1 stop", value: 1 },
  { label: "2+ stops", value: 2 },
]

const DEPARTURE_LABELS: Record<DepartureWindow, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
}

const CABIN_OPTIONS: { label: string; value: string | null }[] = [
  { label: "Any cabin", value: null },
  { label: "Economy", value: "ECONOMY" },
  { label: "Premium economy", value: "PREMIUM_ECONOMY" },
  { label: "Business", value: "BUSINESS" },
  { label: "First", value: "FIRST" },
]

const SORT_LABELS: Record<FlightSortKey, string> = {
  recommended: "Recommended",
  cheapest: "Cheapest",
  fastest: "Fastest",
  earliest: "Earliest",
}

/** Toggle one value in a multi-select list; empty collapses to null (URL stays clean). */
function toggleValue<T>(list: readonly T[] | null, value: T): T[] | null {
  const current = list ?? []
  if (current.includes(value)) {
    const next = current.filter((v) => v !== value)
    return next.length > 0 ? next : null
  }
  return [...current, value]
}

function chipClass(active: boolean, large?: boolean): string {
  return cn(
    "inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-full border font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    large ? "min-h-12 px-5 text-sm" : "min-h-11 px-4 text-[13px]",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-foreground hover:bg-muted"
  )
}

interface FilterGroupsProps {
  filters: FlightFilters
  sort: FlightSortKey
  onFiltersChange: (patch: Partial<FlightFilters>) => void
  onSortChange: (sort: FlightSortKey) => void
  airlineOptions: AirlineOption[]
  priceCeilings?: PriceCeilingOption[]
  durationCeilings?: DurationCeilingOption[]
  large?: boolean
}

/** Sheet filter + sort groups — mirrors the header sort so thumb users get both. */
function FilterGroups({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  airlineOptions,
  priceCeilings,
  durationCeilings,
  large,
}: FilterGroupsProps) {
  const priceOptions = priceCeilings ?? [...PRESET_PRICE_CEILINGS]
  const durationOptions = durationCeilings ?? [...PRESET_DURATION_CEILINGS]
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        role="group"
        aria-label="Sort flights"
        className="flex min-w-0 flex-col gap-2"
      >
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Sort
        </p>
        <div className="flex flex-wrap gap-2">
          {FLIGHT_SORT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={sort === key}
              onClick={() => onSortChange(key)}
              className={chipClass(sort === key, large)}
            >
              <span>{SORT_LABELS[key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        role="group"
        aria-label="Filter flights by maximum price"
        className="flex min-w-0 flex-col gap-2"
      >
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Max price
        </p>
        <div className="flex flex-wrap gap-2">
          {priceOptions.map((option) => (
            <button
              key={`${option.label}-${option.value ?? "any"}`}
              type="button"
              aria-pressed={filters.maxPriceNgn === option.value}
              onClick={() => onFiltersChange({ maxPriceNgn: option.value })}
              className={chipClass(filters.maxPriceNgn === option.value, large)}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        role="group"
        aria-label="Filter flights by maximum duration"
        className="flex min-w-0 flex-col gap-2"
      >
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Max duration
        </p>
        <div className="flex flex-wrap gap-2">
          {durationOptions.map((option) => (
            <button
              key={`${option.label}-${option.value ?? "any"}`}
              type="button"
              aria-pressed={filters.maxDurationMin === option.value}
              onClick={() => onFiltersChange({ maxDurationMin: option.value })}
              className={chipClass(
                filters.maxDurationMin === option.value,
                large
              )}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        role="group"
        aria-label="Filter flights by stops"
        className="flex min-w-0 flex-col gap-2"
      >
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Stops
        </p>
        <div className="flex flex-wrap gap-2">
          {STOPS_OPTIONS.map((option) => {
            const active = filters.stops?.includes(option.value) ?? false
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onFiltersChange({
                    stops: toggleValue(filters.stops, option.value),
                  })
                }
                className={chipClass(active, large)}
              >
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        role="group"
        aria-label="Filter flights by departure time"
        className="flex min-w-0 flex-col gap-2"
      >
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Departure time
        </p>
        <div className="flex flex-wrap gap-2">
          {DEPARTURE_WINDOWS.map((window) => {
            const active = filters.departureWindows?.includes(window) ?? false
            return (
              <button
                key={window}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onFiltersChange({
                    departureWindows: toggleValue(
                      filters.departureWindows,
                      window
                    ),
                  })
                }
                className={chipClass(active, large)}
              >
                <span>{DEPARTURE_LABELS[window]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {airlineOptions.length > 0 ? (
        <div
          role="group"
          aria-label="Filter flights by airline"
          className="flex min-w-0 flex-col gap-2"
        >
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Airline
          </p>
          <div className="flex flex-wrap gap-2">
            {airlineOptions.map((option) => {
              const active = filters.airlines?.includes(option.name) ?? false
              return (
                <button
                  key={option.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onFiltersChange({
                      airlines: toggleValue(filters.airlines, option.name),
                    })
                  }
                  className={chipClass(active, large)}
                >
                  <span>{option.name}</span>
                  <span
                    aria-label={`${option.count} ${option.count === 1 ? "flight" : "flights"}`}
                    className={cn(
                      "rounded-full px-1.5 text-xs font-bold tabular-nums",
                      active
                        ? "bg-primary-foreground/20"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {option.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div
        role="group"
        aria-label="Filter flights by cabin"
        className="flex min-w-0 flex-col gap-2"
      >
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Cabin
        </p>
        <div className="flex flex-wrap gap-2">
          {CABIN_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={filters.cabin === option.value}
              onClick={() => onFiltersChange({ cabin: option.value })}
              className={chipClass(filters.cabin === option.value, large)}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Compact results header + single Filters entry (ticket 04).
 * Mode pill, live count, sort control, and one Filters button with an
 * active-count badge open a sheet on both desktop and mobile — no expanded
 * filter wall remains.
 */
export function FlightFilterBar(props: FlightFilterBarProps) {
  const {
    filters,
    sort,
    onFiltersChange,
    onSortChange,
    onReset,
    airlineOptions,
    visibleCount,
    totalCount,
    isFiltering,
    mode,
    isStale,
    isStreaming,
    priceCeilings,
    durationCeilings,
  } = props
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const activeGroups = countActiveFilterGroups(filters, sort)
  const countLabel = isStreaming
    ? `${visibleCount} ${visibleCount === 1 ? "flight" : "flights"} so far…`
    : isStale
      ? "Updating results…"
      : isFiltering
        ? `${visibleCount} of ${totalCount} ${totalCount === 1 ? "flight" : "flights"}`
        : `${visibleCount} ${visibleCount === 1 ? "flight" : "flights"}`

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        {mode ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
              mode === "domestic"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                mode === "domestic"
                  ? "animate-pulse bg-primary motion-reduce:animate-none"
                  : "bg-muted-foreground"
              )}
            />
            <span>
              {mode === "domestic" ? "Domestic · Live" : "International · Instant"}
            </span>
          </span>
        ) : null}
        <p
          aria-live="polite"
          className="font-variant-numeric min-w-0 flex-1 text-sm font-medium text-muted-foreground tabular-nums"
        >
          {countLabel}
        </p>
        <div className="w-36 shrink-0">
          <Select
            label="Sort flights"
            hideLabel
            options={FLIGHT_SORT_KEYS.map((key) => ({
              value: key,
              label: SORT_LABELS[key],
            }))}
            value={sort}
            onValueChange={(next) =>
              onSortChange(next as FlightSortKey)
            }
          />
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          className="inline-flex min-h-11 shrink-0 touch-manipulation items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span>Filters</span>
          {activeGroups > 0 ? (
            <span
              aria-label={`${activeGroups} refinements active`}
              className="font-variant-numeric flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground tabular-nums"
            >
              {activeGroups}
            </span>
          ) : null}
        </button>
        {isFiltering ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-11 shrink-0 touch-manipulation items-center justify-center rounded-xl px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span>Clear</span>
          </button>
        ) : null}
      </div>

      <DrawerPrimitive.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
            <DrawerPrimitive.Popup className="max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl">
              <DrawerPrimitive.Content className="flex min-w-0 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <DrawerPrimitive.Title className="text-lg font-bold text-balance text-foreground">
                      Filter & sort flights
                    </DrawerPrimitive.Title>
                    <DrawerPrimitive.Description className="mt-1 text-sm break-words text-muted-foreground">
                      Refinement applies instantly to every result on this
                      screen.
                    </DrawerPrimitive.Description>
                  </div>
                  <DrawerPrimitive.Close
                    aria-label="Close filters"
                    className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={18}
                      aria-hidden="true"
                    />
                  </DrawerPrimitive.Close>
                </div>
                <div className="mt-4 min-w-0">
                  <FilterGroups
                    filters={filters}
                    sort={sort}
                    onFiltersChange={onFiltersChange}
                    onSortChange={onSortChange}
                    airlineOptions={airlineOptions}
                    priceCeilings={priceCeilings}
                    durationCeilings={durationCeilings}
                    large
                  />
                </div>
                <div className="sticky bottom-0 -mx-6 mt-6 flex items-center gap-2 border-t border-border bg-card px-6 pt-4 pb-1">
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="inline-flex min-h-12 flex-1 touch-manipulation items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span>
                      Show {visibleCount}{" "}
                      {visibleCount === 1 ? "flight" : "flights"}
                    </span>
                  </button>
                  {isFiltering ? (
                    <button
                      type="button"
                      onClick={onReset}
                      className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span>Clear all</span>
                    </button>
                  ) : null}
                </div>
              </DrawerPrimitive.Content>
            </DrawerPrimitive.Popup>
          </DrawerPrimitive.Viewport>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    </div>
  )
}
