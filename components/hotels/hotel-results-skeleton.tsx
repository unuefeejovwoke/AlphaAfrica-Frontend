import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Loading placeholder for the hotel results grid. Mirrors the eventual card
 * grid shape so the transition to results does not shift layout, and
 * announces the wait to assistive technology instead of showing a blank
 * container. `dimmed` keeps previous results visible under a pending filter
 * transition — mirrors the cars results skeleton.
 */
export function HotelResultsSkeleton({
  count = 6,
  dimmed = false,
}: {
  count?: number
  dimmed?: boolean
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col gap-4"
    >
      {!dimmed ? (
        <p className="text-sm font-medium text-muted-foreground">
          Finding Hotels for your stay…
        </p>
      ) : null}
      <ul
        aria-label="Loading Hotels"
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2",
          dimmed && "pointer-events-none opacity-60"
        )}
      >
        {Array.from({ length: count }).map((_, index) => (
          <li
            key={index}
            className="flex animate-pulse flex-col gap-3 rounded-3xl border border-border/60 bg-card p-2"
          >
            <div className="aspect-[16/10] w-full rounded-[calc(1.5rem-2px)] bg-muted" />
            <div className="flex flex-col gap-2 p-3">
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="mt-2 h-5 w-1/3 rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
