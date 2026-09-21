"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import {
  DEPARTURE_WINDOWS,
  FLIGHT_SORT_KEYS,
  countActiveFilterGroups,
  type DepartureWindow,
  type FlightFilters,
  type FlightSortKey,
} from "@/lib/api/flight-filters";
import type { AirlineOption } from "@/components/flights/use-filtered-offers";

export interface FlightFilterBarProps {
  filters: FlightFilters;
  sort: FlightSortKey;
  onFiltersChange: (patch: Partial<FlightFilters>) => void;
  onSortChange: (sort: FlightSortKey) => void;
  onReset: () => void;
  airlineOptions: AirlineOption[];
  visibleCount: number;
  isFiltering: boolean;
}

const PRICE_CEILINGS: { label: string; value: number | null }[] = [
  { label: "Any price", value: null },
  { label: "Under ₦150k", value: 150_000 },
  { label: "Under ₦300k", value: 300_000 },
  { label: "Under ₦600k", value: 600_000 },
];

const DURATION_CEILINGS: { label: string; value: number | null }[] = [
  { label: "Any duration", value: null },
  { label: "Under 2 hrs", value: 120 },
  { label: "Under 5 hrs", value: 300 },
  { label: "Under 10 hrs", value: 600 },
];

const STOPS_OPTIONS: { label: string; value: 0 | 1 | 2 }[] = [
  { label: "Non-stop", value: 0 },
  { label: "1 stop", value: 1 },
  { label: "2+ stops", value: 2 },
];

const DEPARTURE_LABELS: Record<DepartureWindow, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

const CABIN_OPTIONS: { label: string; value: string | null }[] = [
  { label: "Any cabin", value: null },
  { label: "Economy", value: "ECONOMY" },
  { label: "Premium economy", value: "PREMIUM_ECONOMY" },
  { label: "Business", value: "BUSINESS" },
  { label: "First", value: "FIRST" },
];

const SORT_LABELS: Record<FlightSortKey, string> = {
  recommended: "Recommended",
  cheapest: "Cheapest",
  fastest: "Fastest",
  earliest: "Earliest",
};

/** Toggle one value in a multi-select list; empty collapses to null (URL stays clean). */
function toggleValue<T>(list: readonly T[] | null, value: T): T[] | null {
  const current = list ?? [];
  if (current.includes(value)) {
    const next = current.filter((v) => v !== value);
    return next.length > 0 ? next : null;
  }
  return [...current, value];
}

function chipClass(active: boolean, large?: boolean): string {
  return cn(
    "inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-full border font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    large ? "min-h-12 px-5 text-sm" : "min-h-11 px-4 text-[13px]",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-foreground hover:bg-muted",
  );
}

interface FilterGroupsProps extends FlightFilterBarProps {
  large?: boolean;
}

function FilterGroups({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  airlineOptions,
  large,
}: FilterGroupsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div role="group" aria-label="Sort flights" className="flex min-w-0 flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Sort</p>
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

      <div role="group" aria-label="Filter flights by maximum price" className="flex min-w-0 flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Max price</p>
        <div className="flex flex-wrap gap-2">
          {PRICE_CEILINGS.map((option) => (
            <button
              key={option.label}
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

      <div role="group" aria-label="Filter flights by maximum duration" className="flex min-w-0 flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Max duration</p>
        <div className="flex flex-wrap gap-2">
          {DURATION_CEILINGS.map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={filters.maxDurationMin === option.value}
              onClick={() => onFiltersChange({ maxDurationMin: option.value })}
              className={chipClass(filters.maxDurationMin === option.value, large)}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div role="group" aria-label="Filter flights by stops" className="flex min-w-0 flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Stops</p>
        <div className="flex flex-wrap gap-2">
          {STOPS_OPTIONS.map((option) => {
            const active = filters.stops?.includes(option.value) ?? false;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onFiltersChange({ stops: toggleValue(filters.stops, option.value) })}
                className={chipClass(active, large)}
              >
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div role="group" aria-label="Filter flights by departure time" className="flex min-w-0 flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Departure time</p>
        <div className="flex flex-wrap gap-2">
          {DEPARTURE_WINDOWS.map((window) => {
            const active = filters.departureWindows?.includes(window) ?? false;
            return (
              <button
                key={window}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onFiltersChange({ departureWindows: toggleValue(filters.departureWindows, window) })
                }
                className={chipClass(active, large)}
              >
                <span>{DEPARTURE_LABELS[window]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {airlineOptions.length > 0 ? (
        <div role="group" aria-label="Filter flights by airline" className="flex min-w-0 flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Airline</p>
          <div className="flex flex-wrap gap-2">
            {airlineOptions.map((option) => {
              const active = filters.airlines?.includes(option.name) ?? false;
              return (
                <button
                  key={option.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onFiltersChange({ airlines: toggleValue(filters.airlines, option.name) })}
                  className={chipClass(active, large)}
                >
                  <span>{option.name}</span>
                  <span
                    aria-label={`${option.count} ${option.count === 1 ? "flight" : "flights"}`}
                    className={cn(
                      "rounded-full px-1.5 text-xs font-bold tabular-nums",
                      active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div role="group" aria-label="Filter flights by cabin" className="flex min-w-0 flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Cabin</p>
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
  );
}

/**
 * Live filter + sort controls (ticket 04, story 11).
 * Desktop: horizontal chip rows with airline count badges.
 * Mobile: bottom-sheet trigger with large tap targets and a sticky summary.
 */
export function FlightFilterBar(props: FlightFilterBarProps) {
  const { visibleCount, isFiltering, onReset } = props;
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const activeGroups = countActiveFilterGroups(props.filters, props.sort);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Desktop: horizontal filter chips with count badges */}
      <div className="hidden min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:flex">
        <FilterGroups {...props} />
        {isFiltering ? (
          <div>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-11 touch-manipulation items-center rounded-full px-4 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span>Clear all filters</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Mobile: bottom-sheet trigger with active-count badge */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          className="inline-flex min-h-12 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span>Filters & sort</span>
          {activeGroups > 0 ? (
            <span
              aria-label={`${activeGroups} refinements active`}
              className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold tabular-nums text-primary-foreground"
            >
              {activeGroups}
            </span>
          ) : null}
        </button>
        {isFiltering ? (
          <button
            type="button"
            onClick={onReset}
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
                      Filter & sort flights
                    </DrawerPrimitive.Title>
                    <DrawerPrimitive.Description className="mt-1 text-sm break-words text-muted-foreground">
                      Refinement applies instantly to every result on this screen.
                    </DrawerPrimitive.Description>
                  </div>
                  <DrawerPrimitive.Close
                    aria-label="Close filters"
                    className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
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
                      Show {visibleCount} {visibleCount === 1 ? "flight" : "flights"}
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
  );
}
