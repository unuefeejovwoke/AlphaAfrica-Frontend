import * as React from "react";
import { CardSkeleton } from "@/components/ui/skeleton";

/** Number of placeholder cards — fills the results grid without implying a
 *  result count. */
const SKELETON_CARDS = 6;

/**
 * Loading placeholder for the hotel results grid. Mirrors the eventual card
 * grid shape so the transition to results does not shift layout (spec §35),
 * and announces the wait to assistive technology instead of showing a blank
 * container.
 */
export function HotelResultsSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
      <p className="text-sm font-medium text-muted-foreground">Finding Hotels for your stay…</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: SKELETON_CARDS }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
