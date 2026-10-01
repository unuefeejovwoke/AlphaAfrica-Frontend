"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { Tick01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import {
  describeSortSelection,
  isSortPressed,
  SORT_LABELS,
  type FlightSortKey,
} from "@/lib/api/flight-filters"

export interface FlightSortPillsProps {
  sort: FlightSortKey
  visibleCount: number
  cheapest: string | null
  fastest: string | null
  earliest: string | null
  onChange: (next: FlightSortKey) => void
}

const PILLS: {
  key: Exclude<FlightSortKey, "recommended">
  metric: keyof Omit<FlightSortPillsProps, "sort" | "visibleCount" | "onChange">
}[] = [
  { key: "cheapest", metric: "cheapest" },
  { key: "fastest", metric: "fastest" },
  { key: "earliest", metric: "earliest" },
]

/**
 * Quick-sort pills shared by both results views (international + domestic).
 * Selected state is exposed three ways — `aria-pressed`, a check mark, and
 * colour — so it is never signalled by colour alone; the active sort is
 * announced through a polite live region.
 */
export function FlightSortPills({
  sort,
  visibleCount,
  onChange,
  ...metrics
}: FlightSortPillsProps) {
  return (
    <div
      role="group"
      aria-label="Sort flights"
      className="flex items-center gap-2 sm:flex-wrap"
    >
      {PILLS.map((pill) => {
        const pressed = isSortPressed(sort, pill.key)
        const metric = metrics[pill.metric]
        return (
          <button
            key={pill.key}
            type="button"
            onClick={() => onChange(pill.key)}
            aria-pressed={pressed}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              pressed
                ? "bg-secondary text-secondary-foreground shadow-xs"
                : "border border-border bg-card text-foreground hover:bg-muted/60"
            )}
          >
            {pressed ? (
              <HugeiconsIcon
                icon={Tick01Icon}
                size={13}
                aria-hidden="true"
                className="shrink-0"
              />
            ) : null}
            <span>{SORT_LABELS[pill.key]}</span>
            {metric ? (
              <span className="tabular-nums opacity-90">{metric}</span>
            ) : null}
          </button>
        )
      })}
      <p aria-live="polite" className="sr-only">
        {describeSortSelection(sort, visibleCount)}
      </p>
    </div>
  )
}
