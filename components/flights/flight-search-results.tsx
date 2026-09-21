"use client";

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, Message01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { getSupportWhatsAppUrl } from "@/lib/content/company";
import type { FlightOffer, FlightOfferDisplay } from "@/lib/api/flights";
import { normalizeFlightOffer } from "@/lib/api/flights";
import { FlightOfferCard, FlightOfferSkeleton } from "@/components/flights/flight-offer-card";

export interface FlightSearchResultsProps {
  offers: FlightOffer[];
  isLoading: boolean;
  error: unknown | null;
  onRetry: () => void;
  onSelect: (offer: FlightOfferDisplay) => void;
}

// Deferred rendering keeps input responsive while large lists reconcile
export function FlightSearchResults({ offers, isLoading, error, onRetry, onSelect }: FlightSearchResultsProps) {
  const deferredOffers = React.useDeferredValue(offers);
  const isStale = offers !== deferredOffers;

  // Normalize once — js-set-map-lookups: use Map for O(1) if filtering later
  const displays = React.useMemo(() => {
    return deferredOffers.map((offer, index) => normalizeFlightOffer(offer, index));
  }, [deferredOffers]);

  // Loading: skeleton, never a blank container (spec story 8)
  if (isLoading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground">Finding available flights — checking airlines…</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <FlightOfferSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error: human copy + retry + Talk to Alphaa, never blank
  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState
          preset="general"
          title="We could not find flights right now."
          error={error}
          onRetry={onRetry}
          retryLabel="Retry search"
        />
        <p className="text-center text-xs text-muted-foreground">
          No flights were booked and no payment was taken. Try another route or talk to Alphaa for help.
        </p>
      </div>
    );
  }

  // Empty: human copy + Talk to Alphaa
  if (displays.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
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
              <a href={getSupportWhatsAppUrl("finding a flight for my route")} target="_blank" rel="noopener noreferrer" />
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

  // Success: Flight Offer cards — ternary for conditional render (vercel: rendering-conditional-render)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
        {isStale ? "Updating results…" : `${displays.length} ${displays.length === 1 ? "flight" : "flights"} found`}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" style={{ opacity: isStale ? 0.85 : 1 }}>
        {displays.map((display) => (
          <FlightOfferCard key={display.id} offer={display} onSelect={onSelect} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="text-xs text-muted-foreground">Need help choosing?</p>
        <div className="flex gap-2">
          <Button
            render={<a href={getSupportWhatsAppUrl("choosing a flight from these results")} target="_blank" rel="noopener noreferrer" />}
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
