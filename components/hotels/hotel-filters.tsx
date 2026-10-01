"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, FilterIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { countActiveFilters } from "@/lib/api/shared"
import type { HotelOrdering } from "@/lib/api/hotels"

/**
 * Server-driven filter value. Every key maps to a backend query parameter
 * reflected in the URL; `undefined` means "no filter" and is omitted to keep
 * links clean.
 */
export interface HotelServerFilterValue {
  max_price?: number
  min_stars?: number
  ordering?: HotelOrdering
}

export interface HotelFiltersProps {
  /** Current server filters, hydrated from the URL. */
  server: HotelServerFilterValue
  /** Total Hotels matching the current search. */
  totalCount: number
  /** True while a server-filter URL transition is in flight. */
  isPending?: boolean
  /** Single-tap server change; `undefined` clears that key. Resets to page 1. */
  onServerChange: (patch: {
    max_price?: number
    min_stars?: number
    ordering?: HotelOrdering
  }) => void
  /** Clears server filters (URL). */
  onResetFilters: () => void
}

export const HOTEL_MAX_PRICE_BANDS: { value: number | null; label: string }[] =
  [
    { value: null, label: "Any price" },
    { value: 50000, label: "Up to ₦50,000" },
    { value: 100000, label: "Up to ₦100,000" },
    { value: 150000, label: "Up to ₦150,000" },
    { value: 250000, label: "Up to ₦250,000" },
    { value: 500000, label: "Up to ₦500,000" },
  ]

/**
 * Star floor chips covering the full server vocabulary (1–5). "Any stars"
 * includes unrated Hotels; "1+ stars" already excludes them.
 */
export const HOTEL_MIN_STARS_OPTIONS: {
  value: number | null
  label: string
}[] = [
  { value: null, label: "Any stars" },
  { value: 1, label: "1+ stars" },
  { value: 2, label: "2+ stars" },
  { value: 3, label: "3+ stars" },
  { value: 4, label: "4+ stars" },
  { value: 5, label: "5-star only" },
]

export const HOTEL_ORDERING_OPTIONS: {
  value: HotelOrdering | ""
  label: string
}[] = [
  { value: "", label: "Recommended" },
  { value: "price", label: "Price: low to high" },
  { value: "-price", label: "Price: high to low" },
  { value: "-star_rating", label: "Stars: high to low" },
  { value: "star_rating", label: "Stars: low to high" },
  { value: "name", label: "Name A–Z" },
]

function chipClass(active: boolean, large?: boolean): string {
  return cn(
    "inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-full border font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    large ? "min-h-12 px-5 text-sm" : "min-h-11 px-4 text-[13px]",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-foreground hover:bg-muted"
  )
}

/**
 * Single-select option lists (price bands, star floors) are a two-column grid
 * rather than a wrapping pill row. In the 288px rail a wrapping row pushed
 * these groups to six rows each and the rail past the fold; the grid keeps
 * every label whole on one line at three rows while keeping 44px targets.
 */
function chipGridClass(large?: boolean): string {
  return cn("grid grid-cols-2 gap-2", large && "gap-2.5")
}

const selectClassName =
  "flex h-11 w-full touch-manipulation rounded-xl border border-input/80 bg-background/80 px-3.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-foreground/20 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"

interface FilterGroupsProps {
  server: HotelServerFilterValue
  isPending?: boolean
  large?: boolean
  onServerChange: HotelFiltersProps["onServerChange"]
}

/**
 * Sort control, deliberately NOT part of the filter groups.
 *
 * Sorting does not narrow the result set, so it does not belong in the filter
 * rail — it belongs beside the result count, where the guest's eye already is.
 * Rendered next to the heading on desktop and inside the mobile sheet, which
 * has no separate results header to host it.
 */
export function HotelSortSelect({
  ordering,
  onOrderingChange,
  isPending,
  className,
}: {
  ordering: HotelOrdering | ""
  onOrderingChange: (next: HotelOrdering | "") => void
  isPending?: boolean
  className?: string
}) {
  const orderingId = React.useId()
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label
        htmlFor={orderingId}
        className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
      >
        Sort
      </label>
      <select
        id={orderingId}
        value={ordering}
        disabled={isPending}
        onChange={(event) =>
          onOrderingChange(event.target.value as HotelOrdering | "")
        }
        className={cn(selectClassName, "w-full sm:w-56")}
      >
        {HOTEL_ORDERING_OPTIONS.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * Pure filter groups — per-night cap and star floor.
 * Every server change writes to the URL via the owner callback and resets to page 1.
 * Mirrors the cars filter groups so both catalogues filter alike.
 */
export function HotelFilterGroups({
  server,
  onServerChange,
  large,
  isPending,
}: FilterGroupsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div
        role="group"
        aria-label="Filter Hotels by maximum price per night"
        className="flex min-w-0 flex-col gap-2"
      >
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Max per night
        </p>
        <div className={chipGridClass(large)}>
          {HOTEL_MAX_PRICE_BANDS.map((option) => {
            const active =
              option.value === null
                ? server.max_price === undefined
                : server.max_price === option.value
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onServerChange({ max_price: option.value ?? undefined })
                }
                className={cn(
                  chipClass(active, large),
                  "w-full px-2 whitespace-nowrap"
                )}
              >
                <span className="truncate">{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        role="group"
        aria-label="Filter Hotels by minimum star rating"
        className="flex min-w-0 flex-col gap-2"
      >
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Minimum stars
        </p>
        <div className={chipGridClass(large)}>
          {HOTEL_MIN_STARS_OPTIONS.map((option) => {
            const active =
              option.value === null
                ? server.min_stars === undefined
                : server.min_stars === option.value
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onServerChange({ min_stars: option.value ?? undefined })
                }
                className={cn(chipClass(active, large), "w-full px-2")}
              >
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Desktop sidebar panel. Status line mirrors cars: pending indicator,
 * applied-filter confirmation, and shareable-URL hint.
 */
export function HotelFilters({
  server,
  totalCount,
  isPending,
  onServerChange,
  onResetFilters,
}: HotelFiltersProps) {
  const activeGroups = countActiveFilters(server)
  const isFiltering = activeGroups > 0

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        {/* No count here: the results summary beside the heading is the single
            place that reports how many Hotels matched, and it is the live
            region. Repeating it in the rail made three competing counts. */}
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          <HugeiconsIcon icon={FilterIcon} size={14} aria-hidden="true" />
          <span>Filters</span>
        </p>
        {isFiltering ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex min-h-11 touch-manipulation items-center rounded-full px-4 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span>Clear all</span>
          </button>
        ) : null}
      </div>
      <HotelFilterGroups
        server={server}
        isPending={isPending}
        onServerChange={onServerChange}
      />
      {/* Only speaks when it has something to say. The idle line was internal
          chatter about URL plumbing that the guest never needed; with no
          filters applied there is now no footer at all, so no orphan dot and
          no stray divider above it. */}
      {isPending || isFiltering ? (
        <div
          className="flex items-center gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full transition-colors",
              isPending ? "animate-ping bg-amber-500" : "bg-primary"
            )}
          />
          <span>
            {isPending
              ? "Updating Hotels…"
              : "Filters applied. URL updated for sharing."}
          </span>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Mobile filter entry: trigger button with active-count badge + bottom sheet
 * with large tap targets and a sticky summary. Desktop panel stays mounted
 * separately in the sidebar — this renders nothing on `lg:` and up.
 */
export function HotelMobileFilters({
  server,
  totalCount,
  isPending,
  onServerChange,
  onResetFilters,
}: HotelFiltersProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const activeGroups = countActiveFilters(server)
  const isFiltering = activeGroups > 0

  return (
    <div className="flex items-center gap-2 lg:hidden">
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-12 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <HugeiconsIcon icon={FilterIcon} size={16} aria-hidden="true" />
        <span>Filters & sort</span>
        {activeGroups > 0 ? (
          <span
            aria-label={`${activeGroups} refinements active`}
            className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground tabular-nums"
          >
            {activeGroups}
          </span>
        ) : null}
      </button>
      {isFiltering ? (
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span>Clear</span>
        </button>
      ) : null}

      <DrawerPrimitive.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
            <DrawerPrimitive.Popup className="max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl">
              <DrawerPrimitive.Content className="flex min-w-0 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <DrawerPrimitive.Title className="text-lg font-bold text-balance text-foreground">
                      Filter & sort Hotels
                    </DrawerPrimitive.Title>
                    <DrawerPrimitive.Description className="sr-only">
                      Filter by price and star rating, or change sorting
                    </DrawerPrimitive.Description>
                  </div>
                  <DrawerPrimitive.Close
                    aria-label="Close filters"
                    className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={20}
                      aria-hidden="true"
                    />
                  </DrawerPrimitive.Close>
                </div>

                <div className="mt-6 flex flex-col gap-6">
                  {/* Sorting lives beside the results on desktop, but the sheet
                      has no results header, so it rides along here. */}
                  <HotelSortSelect
                    ordering={server.ordering ?? ""}
                    onOrderingChange={(next) =>
                      onServerChange({
                        ordering: next === "" ? undefined : next,
                      })
                    }
                    isPending={isPending}
                  />

                  <HotelFilterGroups
                    server={server}
                    large
                    isPending={isPending}
                    onServerChange={onServerChange}
                  />

                  <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                    {isFiltering ? (
                      <button
                        type="button"
                        onClick={() => {
                          onResetFilters()
                          setSheetOpen(false)
                        }}
                        className="inline-flex min-h-12 touch-manipulation items-center rounded-xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <span>Reset all</span>
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {totalCount} {totalCount === 1 ? "Hotel" : "Hotels"}{" "}
                        available
                      </span>
                    )}

                    <DrawerPrimitive.Close
                      type="button"
                      className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span>
                        Show {totalCount}{" "}
                        {totalCount === 1 ? "Hotel" : "Hotels"}
                      </span>
                    </DrawerPrimitive.Close>
                  </div>
                </div>
              </DrawerPrimitive.Content>
            </DrawerPrimitive.Popup>
          </DrawerPrimitive.Viewport>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    </div>
  )
}
