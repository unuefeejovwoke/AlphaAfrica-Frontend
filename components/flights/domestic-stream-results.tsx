"use client"

import * as React from "react"
import { motion } from "motion/react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  Message01Icon,
  FilterIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"
import { Button, ButtonLink, buttonVariants } from "@/components/ui/button"
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
  type FlightSortKey,
  parseNairaAmount,
  parseDurationMinutes,
  parseDepartureMinutes,
} from "@/lib/api/flight-filters"
import { useComparisonBadges } from "@/components/flights/use-comparison-badges"
import { FlightOfferSkeleton } from "@/components/flights/flight-offer-card"
import { GroupedFlightOffers } from "@/components/flights/grouped-flight-offers"
import { TrackLink } from "@/components/analytics/track-link"
import { useFilteredOffers } from "@/components/flights/use-filtered-offers"
import { FlightSidebarFilters } from "@/components/flights/flight-sidebar-filters"
import { FlightSortPills } from "@/components/flights/flight-sort-pills"
import { MOTION_DURATIONS } from "@/lib/motion/tokens"
import { BestDealsAirline } from "@/components/flights/best-deals-airline"
import { formatNaira } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface DomesticStreamResultsProps {
  cards: DomesticFlightCard[]
  isStreaming: boolean
  isFallingBack: boolean
  isComplete: boolean
  didFallback: boolean
  isCancelled: boolean
  searchId: string | null
  error: unknown | null
  onRetry: () => void
  onCancel: () => void
  onSelect: (offer: FlightOfferDisplay) => void
  trip?: FlightTripContext
}

export function DomesticStreamResults({
  cards,
  isStreaming,
  isFallingBack,
  isComplete,
  didFallback,
  isCancelled,
  searchId,
  error,
  onRetry,
  onCancel,
  onSelect,
  trip,
}: DomesticStreamResultsProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false)
  const deferredCards = React.useDeferredValue(cards)

  const displays = React.useMemo(
    () =>
      deferredCards.map((card, index) => normalizeDomesticCard(card, index)),
    [deferredCards]
  )

  const filtered = useFilteredOffers(displays)
  const visibleCount = filtered.visible.length
  const badgeIds = useComparisonBadges(filtered.visible)

  const tripWithRef: FlightTripContext = {
    ...trip,
    reference: searchId ? `search ref ${searchId}` : trip?.reference,
  }
  const supportUrl = getFlightSupportWhatsAppUrl(
    "a domestic flight search",
    tripWithRef
  )

  const streamingActive = isStreaming || isFallingBack
  const progressCopy = isFallingBack
    ? "Streaming was slow — loading full domestic results…"
    : displays.length > 0
      ? `${displays.length} ${displays.length === 1 ? "flight" : "flights"} so far… airlines still checking…`
      : "Finding domestic flights…"

  // Quick-sort metrics
  const sortMetrics = React.useMemo(() => {
    let minPrice: number | null = null
    let minDurationMins = Infinity
    let minDurationLabel: string | null = null
    let earliestMins = Infinity
    let earliestLabel: string | null = null

    for (const d of displays) {
      const price = parseNairaAmount(d.price)
      if (price !== null && (minPrice === null || price < minPrice)) {
        minPrice = price
      }
      const durMins = parseDurationMinutes(d.duration)
      if (durMins !== null && durMins < minDurationMins) {
        minDurationMins = durMins
        minDurationLabel = d.duration
      }
      const depMins = parseDepartureMinutes(d.departureAt)
      if (depMins !== null && depMins < earliestMins) {
        earliestMins = depMins
        earliestLabel = d.departureAt
      }
    }
    return {
      cheapest: minPrice ? formatNaira(minPrice) : null,
      fastest: minDurationLabel,
      earliest: earliestLabel,
    }
  }, [displays])

  // Initial streaming with no cards yet, or the brief pre-start moment while
  // the auto-search effect kicks the stream off on a shared URL.
  if (
    (isStreaming && displays.length === 0 && !isFallingBack) ||
    (isFallingBack && displays.length === 0) ||
    (displays.length === 0 && !isComplete && !isCancelled && error === null)
  ) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">
            {progressCopy}
          </p>
          <div className="flex items-center gap-2">
            {searchId ? (
              <p className="font-variant-numeric text-xs font-medium text-muted-foreground tabular-nums">
                Search ref: {searchId}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              <span>Cancel search</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <FlightOfferSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Cancelled before any result arrived — honest state with retry.
  if (isCancelled && displays.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs"
      >
        <h3 className="text-base font-bold text-foreground">
          Search cancelled
        </h3>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          You stopped this domestic search, so no results were loaded. Nothing
          was booked and no payment was taken.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <span>Retry search</span>
        </Button>
      </div>
    )
  }

  // Error state
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

  // Complete but empty
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
          <TrackLink
            event="support_click"
            eventProps={{
              context: "a domestic flight search",
              channel: "whatsapp",
            }}
            href={supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </TrackLink>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left Column (Desktop Only): Sidebar Filters */}
        <aside className="hidden flex-col gap-5 lg:flex">
          <FlightSidebarFilters
            filters={filtered.filters}
            sort={filtered.sort}
            onFiltersChange={filtered.updateFilters}
            onReset={filtered.resetFilters}
            airlineOptions={filtered.airlineOptions}
            allOffers={displays}
            priceCeilings={filtered.priceCeilings}
            durationCeilings={filtered.durationCeilings}
          />
        </aside>

        {/* Right Column */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Top Bar for Results */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-2xs sm:p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground sm:text-base">
                {visibleCount} {visibleCount === 1 ? "flight" : "flights"} found
              </span>
              {streamingActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  Streaming live
                </span>
              ) : null}
            </div>

            {/* Quick Sorter Pills + Mobile Filter Button */}
            <div className="-mx-1 no-scrollbar flex w-full items-center gap-2 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              <FlightSortPills
                sort={filtered.sort}
                visibleCount={visibleCount}
                cheapest={sortMetrics.cheapest}
                fastest={sortMetrics.fastest}
                earliest={sortMetrics.earliest}
                onChange={filtered.changeSort}
              />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                aria-haspopup="dialog"
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold whitespace-nowrap text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden"
              >
                <HugeiconsIcon icon={FilterIcon} size={14} aria-hidden="true" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Streaming status details — live indicator while airlines respond;
              the completed message was removed per design (no post-search
              status line); the support ref stays for tracing. */}
          {isStreaming || searchId ? (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
              {isStreaming ? (
                <p aria-live="polite">Airlines still responding…</p>
              ) : null}
              {searchId ? (
                <p className="font-mono text-[11px] tabular-nums">
                  Ref: {searchId}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Best fares by airline */}
          <BestDealsAirline
            offers={displays}
            origin={trip?.origin ?? displays[0]?.origin}
            destination={trip?.destination ?? displays[0]?.destination}
            selectedAirlines={filtered.filters.airlines}
            onSelectAirline={(airline) => {
              const current = filtered.filters.airlines ?? []
              if (current.includes(airline)) {
                filtered.updateFilters({
                  airlines:
                    current.filter((a) => a !== airline).length > 0
                      ? current.filter((a) => a !== airline)
                      : null,
                })
              } else {
                filtered.updateFilters({ airlines: [airline] })
              }
            }}
          />

          {/* Cards Stack */}
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
                No domestic flights match your filters
              </h3>
              <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                Clear or adjust filters to view all available flights.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={filtered.resetFilters}
              >
                <span>Clear filters</span>
              </Button>
            </div>
          ) : (
            <div
              className="flex flex-col gap-4"
              style={{ opacity: filtered.isStale ? 0.85 : 1 }}
            >
              <GroupedFlightOffers
                visible={filtered.visible}
                badgeIds={badgeIds}
                onSelect={onSelect}
              />
            </div>
          )}

          {isStreaming ? (
            <motion.div
              role="status"
              aria-live="polite"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: MOTION_DURATIONS.quick }}
              className="flex flex-col gap-4"
            >
              {Array.from({ length: 2 }).map((_, i) => (
                <FlightOfferSkeleton key={`streaming-${i}`} />
              ))}
            </motion.div>
          ) : null}

          {/* Help footer */}
          <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground sm:text-sm">
              Need assistance booking or verifying domestic fares?
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <TrackLink
                event="support_click"
                eventProps={{
                  context: "a domestic flight search",
                  channel: "whatsapp",
                }}
                href={supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                <HugeiconsIcon
                  icon={Message01Icon}
                  size={14}
                  aria-hidden="true"
                />
                <span>Talk to Alphaa</span>
              </TrackLink>
              <ButtonLink href="/flights" variant="ghost" size="sm">
                <span>New search</span>
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <DrawerPrimitive.Root
        open={mobileDrawerOpen}
        onOpenChange={setMobileDrawerOpen}
      >
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 backdrop-blur-xs transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 sm:bg-black/10" />
          <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center p-4">
            <DrawerPrimitive.Popup className="max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-border bg-card p-5 text-foreground shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <DrawerPrimitive.Title className="text-base font-bold text-foreground">
                  Filters & Sorting
                </DrawerPrimitive.Title>
                <DrawerPrimitive.Close
                  aria-label="Close filters"
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={16}
                    aria-hidden="true"
                  />
                </DrawerPrimitive.Close>
              </div>

              <div className="mt-4">
                <FlightSidebarFilters
                  filters={filtered.filters}
                  sort={filtered.sort}
                  onFiltersChange={filtered.updateFilters}
                  onReset={filtered.resetFilters}
                  airlineOptions={filtered.airlineOptions}
                  allOffers={displays}
                  priceCeilings={filtered.priceCeilings}
                  durationCeilings={filtered.durationCeilings}
                />
              </div>

              <div className="sticky bottom-0 -mx-5 mt-5 border-t border-border bg-card px-5 pt-3">
                <Button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full justify-center rounded-xl bg-primary font-bold text-primary-foreground"
                >
                  <span>Show {visibleCount} Flights</span>
                </Button>
              </div>
            </DrawerPrimitive.Popup>
          </DrawerPrimitive.Viewport>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    </div>
  )
}
