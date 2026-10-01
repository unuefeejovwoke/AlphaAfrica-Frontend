"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, FilterIcon } from "@hugeicons/core-free-icons"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatNaira } from "@/lib/format"
import { countActiveFilters } from "@/lib/api/shared"
import {
  CAR_MAX_RATE_BANDS,
  CAR_ORDERING_OPTIONS,
  MAX_CAR_HOURLY_RATE,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  type CarOrdering,
  type VehicleType,
} from "@/lib/api/cars"

export interface CarServerFilterValue {
  vehicle_type?: VehicleType
  max_rate?: number
  ordering?: CarOrdering
}

interface CarFilterGroupsProps {
  server: CarServerFilterValue
  isPending?: boolean
  large?: boolean
  onServerChange: (patch: {
    vehicle_type?: VehicleType
    max_rate?: number
    ordering?: CarOrdering
  }) => void
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

/**
 * Pure filter groups — vehicle type (radio semantics), hourly cap (preset
 * bands + custom input with inline validation), and backend sort. Every
 * change writes to the URL via the owner callback and resets to page 1.
 * Backend-only by design: no seats/city refinement in v1.
 */
export function CarFilterGroups({
  server,
  isPending,
  large,
  onServerChange,
}: CarFilterGroupsProps) {
  const typeGroupId = React.useId()
  const rateGroupId = React.useId()
  const orderingId = React.useId()
  const customRateId = React.useId()

  const [rateInput, setRateInput] = React.useState(
    server.max_rate !== undefined ? String(server.max_rate) : ""
  )
  const [rateError, setRateError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setRateInput(server.max_rate !== undefined ? String(server.max_rate) : "")
    setRateError(null)
  }, [server.max_rate])

  const applyCustomRate = () => {
    const cleaned = rateInput.replace(/,/g, "").trim()
    if (cleaned === "") {
      setRateError(null)
      onServerChange({ max_rate: undefined })
      return
    }
    if (!/^\d+$/.test(cleaned)) {
      setRateError("Enter whole Naira, e.g. 75000.")
      return
    }
    const parsed = Number(cleaned)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setRateError("Enter an amount above ₦0.")
      return
    }
    if (parsed > MAX_CAR_HOURLY_RATE) {
      setRateError(
        `That cap is above the ${formatNaira(String(MAX_CAR_HOURLY_RATE))}/hr limit.`
      )
      return
    }
    setRateError(null)
    onServerChange({ max_rate: parsed })
  }

  const customActive =
    server.max_rate !== undefined &&
    !CAR_MAX_RATE_BANDS.some((band) => band.value === server.max_rate)

  return (
    <div className="flex min-w-0 flex-col gap-5">
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
            const next = event.target.value as CarOrdering | ""
            onServerChange({ ordering: next === "" ? undefined : next })
          }}
          className={selectClassName}
        >
          {CAR_ORDERING_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div
        role="radiogroup"
        aria-labelledby={typeGroupId}
        className="flex min-w-0 flex-col gap-2"
      >
        <p
          id={typeGroupId}
          className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Vehicle type
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            role="radio"
            aria-checked={server.vehicle_type === undefined}
            onClick={() => onServerChange({ vehicle_type: undefined })}
            className={chipClass(server.vehicle_type === undefined, large)}
          >
            <span>All types</span>
          </button>
          {VEHICLE_TYPES.map((type) => {
            const active = server.vehicle_type === type
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onServerChange({ vehicle_type: type })}
                className={chipClass(active, large)}
              >
                <span>{VEHICLE_TYPE_LABELS[type]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        role="group"
        aria-labelledby={rateGroupId}
        className="flex min-w-0 flex-col gap-2"
      >
        <p
          id={rateGroupId}
          className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Max per hour
        </p>
        <div className="flex flex-wrap gap-2">
          {CAR_MAX_RATE_BANDS.map((band) => {
            const active =
              band.value === null
                ? server.max_rate === undefined
                : server.max_rate === band.value
            return (
              <button
                key={band.label}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onServerChange({ max_rate: band.value ?? undefined })
                }
                className={chipClass(active, large)}
              >
                <span>{band.label}</span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={customRateId}
            className="text-xs font-medium text-foreground"
          >
            Custom cap (₦){" "}
            <span className="font-normal text-muted-foreground">
              e.g. {formatNaira("75000")}/hr
            </span>
          </label>
          <span className="flex gap-2">
            <input
              id={customRateId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={customActive ? String(server.max_rate) : "No cap"}
              value={rateInput}
              disabled={isPending}
              onChange={(event) => {
                setRateInput(event.target.value)
                if (rateError) setRateError(null)
              }}
              onBlur={applyCustomRate}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  applyCustomRate()
                }
              }}
              aria-invalid={rateError ? true : undefined}
              aria-describedby={rateError ? `${customRateId}-error` : undefined}
              className={cn(
                "h-11 w-full touch-manipulation rounded-xl border border-input/80 bg-background/80 px-3.5 text-sm font-medium tabular-nums shadow-xs transition-colors hover:border-foreground/20 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                rateError &&
                  "border-destructive focus-visible:border-destructive"
              )}
            />
            <Button
              type="button"
              variant="outline"
              size={large ? "default" : "sm"}
              onClick={applyCustomRate}
              disabled={isPending}
              className="shrink-0 touch-manipulation"
            >
              <span>Apply</span>
            </Button>
          </span>
          {rateError ? (
            <p
              id={`${customRateId}-error`}
              role="alert"
              className="text-xs font-medium text-destructive"
            >
              {rateError}
            </p>
          ) : customActive ? (
            <p className="text-xs text-muted-foreground">
              Custom cap {formatNaira(String(server.max_rate))}/hr active.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export interface CarFiltersProps {
  server: CarServerFilterValue
  visibleCount: number
  totalCount: number
  isPending?: boolean
  onServerChange: (patch: {
    vehicle_type?: VehicleType
    max_rate?: number
    ordering?: CarOrdering
  }) => void
  onResetFilters: () => void
}

/**
 * Desktop sidebar panel. Status line mirrors hotels: pending indicator,
 * applied-filter confirmation, and shareable-URL hint — never a dead panel.
 */
export function CarFilters({
  server,
  visibleCount,
  totalCount,
  isPending,
  onServerChange,
  onResetFilters,
}: CarFiltersProps) {
  const activeGroups = countActiveFilters(server)
  const isFiltering = activeGroups > 0

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          <HugeiconsIcon icon={FilterIcon} size={14} aria-hidden="true" />
          <span>
            Filters · {visibleCount} of {totalCount}
          </span>
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
      <CarFilterGroups
        server={server}
        isPending={isPending}
        onServerChange={onServerChange}
      />
      <div
        className="flex items-center gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full transition-colors",
            isPending
              ? "animate-ping bg-amber-500"
              : isFiltering
                ? "bg-primary"
                : "bg-muted-foreground/40"
          )}
        />
        <span>
          {isPending
            ? "Updating vehicles…"
            : isFiltering
              ? "Filters applied. URL updated for sharing."
              : "Filters update the address bar for shareable searches."}
        </span>
      </div>
    </div>
  )
}

/**
 * Mobile filter entry: trigger button with active-count badge + bottom sheet
 * with large tap targets and a sticky summary. Desktop panel stays mounted
 * separately in the sidebar — this renders nothing on `lg:` and up.
 */
export function CarMobileFilters({
  server,
  visibleCount,
  totalCount,
  isPending,
  onServerChange,
  onResetFilters,
}: CarFiltersProps) {
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
                      Filter & sort vehicles
                    </DrawerPrimitive.Title>
                    <DrawerPrimitive.Description className="sr-only">
                      Filter and sort vehicles by type and rate
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
                  <CarFilterGroups
                    server={server}
                    isPending={isPending}
                    large
                    onServerChange={onServerChange}
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
                      {visibleCount === 1 ? "vehicle" : "vehicles"} of{" "}
                      {totalCount}
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
