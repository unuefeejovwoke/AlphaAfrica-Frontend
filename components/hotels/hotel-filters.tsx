"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, FilterIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import type { HotelAmenityOption, HotelOrdering } from "@/lib/api/hotels"

/**
 * Server-driven filter value (ticket 02). Every key maps to a backend query
 * parameter reflected in the URL; `undefined` means "no filter" and is
 * omitted to keep links clean. Amenities are intentionally absent — amenity
 * refinement is client-side over the fetched page (ADR-0005).
 */
export interface HotelServerFilterValue {
  max_price?: number
  min_stars?: number
  ordering?: HotelOrdering
}

export interface HotelFiltersProps {
  /** Current server filters, hydrated from the URL. */
  server: HotelServerFilterValue
  /** Amenity options derived from the fetched page, with per-option counts. */
  amenityOptions: HotelAmenityOption[]
  /** Client-side amenity selection (never in the URL, never a new search). */
  selectedAmenities: string[]
  /** Hotels visible after amenity refinement (page subset). */
  visibleCount: number
  /** Backend-authoritative total for the server-filtered query. */
  totalCount: number
  /** True while a server-filter URL transition is in flight. */
  isPending?: boolean
  /** Single-tap server change; `undefined` clears that key. Resets to page 1. */
  onServerChange: (patch: {
    max_price?: number
    min_stars?: number
    ordering?: HotelOrdering
  }) => void
  onAmenitiesChange: (next: string[]) => void
  /** Clears server filters (URL) and amenity refinement together. */
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

/** Toggle one value in a multi-select list (case-insensitive for amenities). */
function toggleAmenity(selected: string[], value: string): string[] {
  const key = value.trim().toLowerCase()
  const next = selected.filter((item) => item.trim().toLowerCase() !== key)
  if (next.length !== selected.length) return next
  return [...selected, value]
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

const selectClassName =
  "flex h-11 w-full touch-manipulation rounded-xl border border-input/80 bg-background/80 px-3.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-foreground/20 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"

interface FilterGroupsProps extends HotelFiltersProps {
  large?: boolean
}

function FilterGroups({
  server,
  amenityOptions,
  selectedAmenities,
  onServerChange,
  onAmenitiesChange,
  large,
  isPending,
}: FilterGroupsProps) {
  const orderingId = React.useId()
  const selectedSet = React.useMemo(
    () => new Set(selectedAmenities.map((item) => item.trim().toLowerCase())),
    [selectedAmenities]
  )

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <label
          htmlFor={orderingId}
          className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Sort
        </label>
        <select
          id={orderingId}
          value={server.ordering ?? ""}
          disabled={isPending}
          onChange={(event) => {
            const next = event.target.value as HotelOrdering | ""
            onServerChange({ ordering: next === "" ? undefined : next })
          }}
          className={selectClassName}
        >
          {HOTEL_ORDERING_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div
        role="group"
        aria-label="Filter Hotels by maximum price per night"
        className="flex min-w-0 flex-col gap-2"
      >
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Max per-night price
        </p>
        <div className="flex flex-wrap gap-2">
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
        aria-label="Filter Hotels by minimum star rating"
        className="flex min-w-0 flex-col gap-2"
      >
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Minimum stars
        </p>
        <div className="flex flex-wrap gap-2">
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
                className={chipClass(active, large)}
              >
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {amenityOptions.length > 0 ? (
        <div
          role="group"
          aria-label="Refine this page by amenities"
          className="flex min-w-0 flex-col gap-2"
        >
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Amenities{" "}
            <span className="font-normal normal-case">(this page only)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {amenityOptions.map((option) => {
              const active = selectedSet.has(option.value.trim().toLowerCase())
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onAmenitiesChange(
                      toggleAmenity(selectedAmenities, option.value)
                    )
                  }
                  className={chipClass(active, large)}
                >
                  <span>{option.label}</span>
                  <span
                    aria-label={`${option.count} ${option.count === 1 ? "Hotel" : "Hotels"}`}
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
    </div>
  )
}

/**
 * Hotel filter + sort controls (ticket 02).
 *
 * Server-side filters (max per-night price, min stars, ordering) update the
 * shareable URL via transition so input stays responsive and back, refresh,
 * and shared links restore exactly what the guest saw. Amenity multi-select
 * refines the fetched page instantly with no new search. Location is
 * display-only place context on the cards — there is no radius control here
 * by design (ADR-0005).
 *
 * Desktop: inline panel. Mobile: bottom-sheet trigger with an active-count
 * badge, large tap targets, and a sticky summary.
 */
export function HotelFilters(props: HotelFiltersProps) {
  const {
    visibleCount,
    totalCount,
    isPending,
    onResetFilters,
    selectedAmenities,
    server,
  } = props
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const serverGroups =
    (server.max_price !== undefined ? 1 : 0) +
    (server.min_stars !== undefined ? 1 : 0) +
    (server.ordering !== undefined ? 1 : 0)
  const activeGroups = serverGroups + (selectedAmenities.length > 0 ? 1 : 0)
  const isFiltering = activeGroups > 0

  const refined = selectedAmenities.length > 0

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Desktop: inline filter panel */}
      <div className="hidden min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:flex">
        <FilterGroups {...props} />
        <div
          className="flex items-center justify-between gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "size-1.5 rounded-full transition-colors",
                isPending
                  ? "animate-ping bg-amber-500"
                  : isFiltering
                    ? "bg-primary"
                    : "bg-muted-foreground/40"
              )}
            />
            {isPending
              ? "Updating Hotels…"
              : refined
                ? `Showing ${visibleCount} of ${totalCount} ${totalCount === 1 ? "Hotel" : "Hotels"} on this page.`
                : isFiltering
                  ? "Filters applied. URL updated for sharing."
                  : "Filters update the address bar for shareable searches."}
          </span>
          {isFiltering ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex min-h-11 touch-manipulation items-center rounded-full px-4 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span>Clear all filters</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Mobile: bottom-sheet trigger with active-count badge */}
      <div className="flex items-center gap-2 md:hidden">
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
      </div>

      {/* Mobile: bottom sheet with large tap targets + sticky summary */}
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
                    <DrawerPrimitive.Description className="mt-1 text-sm break-words text-muted-foreground">
                      Price, stars, and sort search again. Amenities refine this
                      page only.
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
                  <FilterGroups {...props} large />
                </div>
                <div className="sticky bottom-0 -mx-6 mt-6 flex items-center gap-2 border-t border-border bg-card px-6 pt-4 pb-1">
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="inline-flex min-h-12 flex-1 touch-manipulation items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span>
                      Show {visibleCount}{" "}
                      {visibleCount === 1 ? "Hotel" : "Hotels"}
                    </span>
                  </button>
                  {isFiltering ? (
                    <button
                      type="button"
                      onClick={() => {
                        onResetFilters()
                        setSheetOpen(false)
                      }}
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
