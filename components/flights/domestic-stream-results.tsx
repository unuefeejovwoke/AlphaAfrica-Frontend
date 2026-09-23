"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon, Message01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import {
  normalizeDomesticCard,
  type DomesticFlightCard,
} from "@/lib/api/domestic"
import {
  getFlightSupportWhatsAppUrl,
  type FlightOfferDisplay,
  type FlightTripContext,
} from "@/lib/api/flights"
import {
  FlightOfferCard,
  FlightOfferSkeleton,
} from "@/components/flights/flight-offer-card"
import { FlightFilterBar } from "@/components/flights/flight-filter-bar"
import { TrackLink } from "@/components/analytics/track-link"
import { useFilteredOffers } from "@/components/flights/use-filtered-offers"

export interface DomesticStreamResultsProps {
  cards: DomesticFlightCard[]
  isStreaming: boolean
  isFallingBack: boolean
  isComplete: boolean
  didFallback: boolean
  searchId: string | null
  error: unknown | null
  onRetry: () => void
  onSelect: (offer: FlightOfferDisplay) => void
  /** Trip context (route, dates, party) for support hatches. */
  trip?: FlightTripContext
}

/**
 * Progressive domestic results — cards render as airlines respond inside a
 * Suspense boundary (parent), with honest progress copy (story 6), a
 * terminal completion state retaining search_id (story 7), and human
 * error copy with retry + Talk to Alphaa (story 8).
 *
 * - Deferred card rendering keeps input responsive (vercel: rerender-use-deferred-value)
 * - Ternary conditional renders (vercel: rendering-conditional-render)
 */
export function DomesticStreamResults({
  cards,
  isStreaming,
  isFallingBack,
  isComplete,
  didFallback,
  searchId,
  error,
  onRetry,
  onSelect,
  trip,
}: DomesticStreamResultsProps) {
  const deferredCards = React.useDeferredValue(cards)

  const displays = React.useMemo(
    () =>
      deferredCards.map((card, index) => normalizeDomesticCard(card, index)),
    [deferredCards]
  )

  // Live client-side filter/sort over accumulated cards (ticket 04) — cards
  // arriving mid-stream flow through automatically, no refetch.
  const filtered = useFilteredOffers(displays)

  // Trip context plus the search ref so specialists can trace the stream.
  const tripWithRef: FlightTripContext = {
    ...trip,
    reference: searchId ? `search ref ${searchId}` : trip?.reference,
  }
  const supportUrl = getFlightSupportWhatsAppUrl(
    "a domestic flight search",
    tripWithRef
  )

  // Streaming with nothing yet — skeleton, never blank (story 6).
  if (
    (isStreaming && displays.length === 0 && !isFallingBack) ||
    isFallingBack
  ) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex flex-col gap-4"
      >
        <p className="text-sm font-medium text-muted-foreground">
          {isFallingBack
            ? "Streaming was slow — loading the full results…"
            : "Finding available flights… airlines being checked…"}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <FlightOfferSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Error only when the blocking fallback also failed — human copy + recovery.
  if (error && !isStreaming && !isFallingBack && displays.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState
          preset="general"
          title="We could not find flights right now."
          error={error}
          onRetry={onRetry}
          retryLabel="Retry search"
          supportContext={`a domestic flight search${searchId ? ` (search ref ${searchId})` : ""}`}
        />
        <p className="text-center text-xs text-muted-foreground">
          No flights were booked and no payment was taken. Try again or talk to
          Alphaa for help.
        </p>
      </div>
    )
  }

  // Empty after a clean completion — human copy + Talk to Alphaa, announced.
  if (isComplete && !isStreaming && displays.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          No domestic flights found — try another date or talk to Alphaa
        </h3>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          Airlines returned no matching flights for this route and date. Try
          shifting the date by a few days or ask a specialist to check
          alternatives.
          {searchId ? ` Keep ref ${searchId} when you contact support.` : ""}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <span>Retry search</span>
          </Button>
          <Button
            render={
              <TrackLink
                event="support_click"
                eventProps={{
                  context: "a domestic flight search",
                  channel: "whatsapp",
                }}
                href={supportUrl}
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
        {searchId ? (
          <p className="font-variant-numeric text-xs font-medium text-muted-foreground tabular-nums">
            Search ref: {searchId}
          </p>
        ) : null}
      </div>
    )
  }

  // Progressive / complete list — ternary, never && (vercel guideline).
  const visibleCount = filtered.visible.length
  const resultSummary = isStreaming
    ? `${visibleCount} ${visibleCount === 1 ? "flight" : "flights"} so far… airlines still being checked…`
    : filtered.isStale
      ? "Updating results…"
      : filtered.isFiltering
        ? `${visibleCount} of ${filtered.totalCount} ${filtered.totalCount === 1 ? "flight" : "flights"} match your filters`
        : `${visibleCount} ${visibleCount === 1 ? "flight" : "flights"} found${didFallback ? " · full results loaded" : ""}`

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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className="text-sm font-medium text-muted-foreground"
          aria-live="polite"
        >
          {resultSummary}
        </p>
        {searchId ? (
          <p className="font-variant-numeric text-xs font-medium text-muted-foreground tabular-nums">
            Search ref: {searchId}
          </p>
        ) : null}
      </div>

      {visibleCount === 0 && filtered.isFiltering && !isStreaming ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              size={24}
              aria-hidden="true"
            />
          </div>
          <h3 className="text-base font-bold text-foreground">
            No flights match your filters — try adjusting
          </h3>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Loosen a filter or clear them to see every available flight. Nothing
            was booked and no payment was taken.
            {searchId ? ` Keep ref ${searchId} when you contact support.` : ""}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={filtered.resetFilters}
            >
              <span>Clear filters</span>
            </Button>
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{
                    context: "a domestic flight search",
                    channel: "whatsapp",
                  }}
                  href={supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={16}
                aria-hidden="true"
              />
              <span>Talk to Alphaa</span>
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          style={{ opacity: filtered.isStale ? 0.85 : 1 }}
        >
          {filtered.visible.map((display) => (
            <FlightOfferCard
              key={display.id}
              offer={display}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {isStreaming ? (
        <div
          role="status"
          aria-live="polite"
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          {Array.from({ length: 2 }).map((_, i) => (
            <FlightOfferSkeleton key={`streaming-${i}`} />
          ))}
        </div>
      ) : null}

      {isComplete ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {searchId
              ? `Search complete · Ref ${searchId} — keep it for support.`
              : "Search complete."}{" "}
            Need help choosing?
          </p>
          <div className="flex gap-2">
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{
                    context: "a domestic flight search",
                    channel: "whatsapp",
                  }}
                  href={supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              variant="outline"
              size="sm"
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={14}
                aria-hidden="true"
              />
              <span>Talk to Alphaa</span>
            </Button>
            <Button render={<Link href="/flights" />} variant="ghost" size="sm">
              <span>New search</span>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
