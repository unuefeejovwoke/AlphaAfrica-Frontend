"use client";

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, Message01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import {
  describeFlightTrip,
  getFlightSupportWhatsAppUrl,
  type FlightOffer,
  type FlightOfferDisplay,
  type FlightTripContext,
} from "@/lib/api/flights";
import { normalizeFlightOffer } from "@/lib/api/flights";
import { FlightOfferCard, FlightOfferSkeleton } from "@/components/flights/flight-offer-card";
import { FlightFilterBar } from "@/components/flights/flight-filter-bar";
import { TrackLink } from "@/components/analytics/track-link";
import { useFilteredOffers } from "@/components/flights/use-filtered-offers";

export interface FlightSearchResultsProps {
  offers: FlightOffer[];
  isLoading: boolean;
  error: unknown | null;
  onRetry: () => void;
  onSelect: (offer: FlightOfferDisplay) => void;
  /** Trip context (route, dates, party) for support hatches. */
  trip?: FlightTripContext;
}

// Deferred rendering keeps input responsive while large lists reconcile
export function FlightSearchResults({ offers, isLoading, error, onRetry, onSelect, trip }: FlightSearchResultsProps) {
  const deferredOffers = React.useDeferredValue(offers);

  // Normalize once — js-set-map-lookups: use Map for O(1) if filtering later
  const displays = React.useMemo(() => {
    return deferredOffers.map((offer, index) => normalizeFlightOffer(offer, index));
  }, [deferredOffers]);

  // Live client-side filter/sort over accumulated cards (ticket 04) — no refetch.
  const filtered = useFilteredOffers(displays);

  // Loading: skeleton, never a blank container (spec story 8)
  if (isLoading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
        <p className="text-sm font-medium text-muted-foreground">Finding available flights — checking airlines…</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <FlightOfferSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error: human copy + retry + Talk to Alphaa with trip context, never blank
  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState
          preset="general"
          title="We could not find flights right now."
          error={error}
          onRetry={onRetry}
          retryLabel="Retry search"
          supportContext={`finding a flight for my route${trip ? ` (${describeFlightTrip(trip)})` : ""}`}
        />
        <p className="text-center text-xs text-muted-foreground">
          No flights were booked and no payment was taken. Try another route or talk to Alphaa for help.
        </p>
      </div>
    );
  }

  // Empty: human copy + Talk to Alphaa — role=status announces it (ticket 04).
  if (displays.length === 0) {
    return (
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-foreground">No flights found — try another route or talk to Alphaa</h3>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          There are no matching flights for this route and date. Try shifting the date by a few days, swapping the cabin, or
          ask a specialist to check alternatives.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <span>Retry search</span>
          </Button>
          <Button
            render={
              <TrackLink
                event="support_click"
                eventProps={{ context: "finding a flight for my route", channel: "whatsapp" }}
                href={getFlightSupportWhatsAppUrl("finding a flight for my route", trip)}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </Button>
        </div>
      </div>
    );
  }

  // Success: filter bar + Flight Offer cards — ternary for conditional render (vercel: rendering-conditional-render)
  const visibleCount = filtered.visible.length;
  const resultSummary = filtered.isStale
    ? "Updating results…"
    : filtered.isFiltering
      ? `${visibleCount} of ${filtered.totalCount} ${filtered.totalCount === 1 ? "flight" : "flights"} match your filters`
      : `${visibleCount} ${visibleCount === 1 ? "flight" : "flights"} found`;

  return (
    <div className="flex flex-col gap-4">
      <FlightFilterBar
        filters={filtered.filters}
        sort={filtered.sort}
        onFiltersChange={filtered.updateFilters}
        onSortChange={filtered.changeSort}
        onReset={filtered.resetFilters}
        airlineOptions={filtered.airlineOptions}
        visibleCount={visibleCount}
        isFiltering={filtered.isFiltering}
      />

      <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
        {resultSummary}
      </p>

      {visibleCount === 0 ? (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-foreground">No flights match your filters — try adjusting</h3>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Loosen a filter or clear them to see every available flight. Nothing was booked and no payment was taken.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={filtered.resetFilters}>
              <span>Clear filters</span>
            </Button>
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{ context: "finding a flight for my route", channel: "whatsapp" }}
                  href={getFlightSupportWhatsAppUrl("finding a flight for my route", trip)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
              <span>Talk to Alphaa</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2" style={{ opacity: filtered.isStale ? 0.85 : 1 }}>
          {filtered.visible.map((display) => (
            <FlightOfferCard key={display.id} offer={display} onSelect={onSelect} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="text-sm text-muted-foreground">Need help choosing?</p>
        <div className="flex gap-2">
          <Button
            render={
              <TrackLink
                event="support_click"
                eventProps={{ context: "choosing a flight from these results", channel: "whatsapp" }}
                href={getFlightSupportWhatsAppUrl("choosing a flight from these results", trip)}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            variant="outline"
            size="sm"
          >
            <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </Button>
          <Button render={<Link href="/flights" />} variant="ghost" size="sm">
            <span>New search</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
