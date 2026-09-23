"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Hotel01Icon,
  Message01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import { TrackLink } from "@/components/analytics/track-link"
import { HotelSearchForm } from "@/components/hotels/hotel-search-form"
import { HotelResultsSkeleton } from "@/components/hotels/hotel-results-skeleton"
import { HotelCard } from "@/components/hotels/hotel-card"
import { HotelEmptyState } from "@/components/hotels/hotel-empty-state"
import {
  HotelFilters,
  type HotelServerFilterValue,
} from "@/components/hotels/hotel-filters"
import { ApiError } from "@/lib/api/client"
import { formatNaira } from "@/lib/format"
import {
  DEFAULT_HOTEL_GUESTS,
  DEFAULT_HOTEL_ROOMS,
  buildHotelSearchParams,
  collectAmenityOptions,
  filterHotelsByAmenities,
  getHotelSupportWhatsAppUrl,
  getHotels,
  hasHotelSearchParams,
  parseHotelSearchParams,
  validateHotelSearchQuery,
  type HotelOrdering,
  type HotelSearchQuery,
  type HotelStayContext,
  type PaginatedHotels,
} from "@/lib/api/hotels"

type SearchStatus = "idle" | "loading" | "success" | "empty" | "error"

const BROWSE_ALL_QUERY: HotelSearchQuery = {
  destination: "",
  check_in: "",
  check_out: "",
  guests: DEFAULT_HOTEL_GUESTS,
  rooms: DEFAULT_HOTEL_ROOMS,
  page: 1,
}

/** Human line for the active server filters, e.g. "up to ₦150,000 · 4+ stars". */
function describeServerFilters(query: HotelSearchQuery): string | null {
  const parts: string[] = []
  if (query.max_price !== undefined)
    parts.push(`up to ${formatNaira(String(query.max_price))}`)
  if (query.min_stars !== undefined) {
    parts.push(
      query.min_stars === 5 ? "5-star only" : `${query.min_stars}+ stars`
    )
  }
  return parts.length > 0 ? parts.join(" · ") : null
}

/**
 * Hotel listing shell (Phase 4, tickets 01 + 02).
 *
 * URL search state is the single source of truth: parsing it drives the
 * backend query, so back, refresh, and shared links restore exactly what the
 * guest saw. A bare `/hotels` is the idle search landing; submitting a search
 * (including an empty destination, which browses every Hotel) writes the
 * party plus any destination/dates to the URL and fetches with `no-store`.
 *
 * Filter split (ADR-0005): max per-night price, min stars, ordering, and
 * pagination are server query parameters reflected in the URL; amenity
 * multi-select refines the fetched page instantly with no new search; the
 * backend count stays authoritative; location is display-only place context.
 *
 * States are explicit and never render a blank container: idle, loading
 * (skeletons), success (Hotel cards), empty (widening actions), refined-empty
 * (amenities match nothing on this page), and error with retry — each
 * offering Talk to Alphaa.
 */
export function HotelSearchPageClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const paramsString = searchParams.toString()

  const rawParams = React.useMemo(
    () =>
      Object.fromEntries(searchParams.entries()) as Record<
        string,
        string | undefined
      >,
    [searchParams]
  )

  const parsedQuery = React.useMemo(
    () => parseHotelSearchParams(rawParams),
    [rawParams]
  )
  const hasSearch = React.useMemo(
    () => hasHotelSearchParams(rawParams),
    [rawParams]
  )

  // Deferred defaults keep the form in step with the URL without blocking
  // typing on navigation (vercel: rerender-use-deferred-value).
  const deferredDefaults = React.useDeferredValue(parsedQuery)

  const [status, setStatus] = React.useState<SearchStatus>(
    hasSearch ? "loading" : "idle"
  )
  const [pageData, setPageData] = React.useState<PaginatedHotels | null>(null)
  const [error, setError] = React.useState<unknown | null>(null)

  // Client-side amenity refinement over the fetched page. Never in the URL,
  // never a new search — a new result set resets it so a stale selection
  // cannot silently empty the next page.
  const [selectedAmenities, setSelectedAmenities] = React.useState<string[]>([])

  // Server-filter transitions keep input responsive: the previous results
  // stay visible with a pending indicator instead of flashing skeletons.
  const [isFilterPending, startFilterTransition] = React.useTransition()

  // Ignore stale responses when a newer search supersedes an in-flight one.
  const requestIdRef = React.useRef(0)
  // Last URL search state that was hydrated, so each change searches once.
  const lastSearchedParamsRef = React.useRef<string | null>(null)

  const runSearch = React.useCallback(async (query: HotelSearchQuery) => {
    const requestId = ++requestIdRef.current
    setStatus("loading")
    setError(null)
    try {
      const page = await getHotels(query)
      if (requestId !== requestIdRef.current) return
      setPageData(page)
      setStatus(page.results.length > 0 ? "success" : "empty")
    } catch (caught) {
      if (requestId !== requestIdRef.current) return
      setError(caught)
      setPageData(null)
      setStatus("error")
    }
  }, [])

  // Hydrate from the URL: a change in search state (submit, back/forward,
  // shared link, filter change, pagination) triggers exactly one backend
  // search. URL state is untrusted — invalid dates surface a human error
  // instead of a request; invalid filter values were already dropped at parse.
  React.useEffect(() => {
    if (!hasSearch) {
      lastSearchedParamsRef.current = null
      setStatus("idle")
      setPageData(null)
      setError(null)
      setSelectedAmenities([])
      return
    }
    if (lastSearchedParamsRef.current === paramsString) return
    lastSearchedParamsRef.current = paramsString
    setSelectedAmenities([])

    const validation = validateHotelSearchQuery(parsedQuery)
    if (!validation.success) {
      requestIdRef.current += 1
      setPageData(null)
      setError(
        new ApiError(validation.message, { status: 400, code: "validation" })
      )
      setStatus("error")
      return
    }
    void runSearch(parsedQuery)
  }, [hasSearch, paramsString, parsedQuery, runSearch])

  const stayContext = React.useMemo<HotelStayContext>(
    () => ({
      destination: parsedQuery.destination,
      check_in: parsedQuery.check_in,
      check_out: parsedQuery.check_out,
      guests: parsedQuery.guests,
      rooms: parsedQuery.rooms,
    }),
    [parsedQuery]
  )

  // Narrow subscription: amenity options derive from the fetched page only,
  // and refinement defers so checking boxes never blocks input (vercel:
  // rerender-use-deferred-value, rerender-transitions).
  const amenityOptions = React.useMemo(
    () => collectAmenityOptions(pageData?.results ?? []),
    [pageData]
  )
  const deferredAmenities = React.useDeferredValue(selectedAmenities)
  const visibleHotels = React.useMemo(
    () => filterHotelsByAmenities(pageData?.results ?? [], deferredAmenities),
    [pageData, deferredAmenities]
  )

  const serverFilters = React.useMemo<HotelServerFilterValue>(
    () => ({
      max_price: parsedQuery.max_price,
      min_stars: parsedQuery.min_stars,
      ordering: parsedQuery.ordering,
    }),
    [parsedQuery.max_price, parsedQuery.min_stars, parsedQuery.ordering]
  )
  const hasServerFilters =
    parsedQuery.max_price !== undefined ||
    parsedQuery.min_stars !== undefined ||
    parsedQuery.ordering !== undefined

  const pushQuery = React.useCallback(
    (params: string) => {
      startFilterTransition(() => {
        router.push(params ? `${pathname}?${params}` : pathname, {
          scroll: false,
        })
      })
    },
    [pathname, router]
  )

  const handleSearch = React.useCallback(
    (query: HotelSearchQuery) => {
      // The search form owns destination, dates, and party only — active
      // server filters survive a new search instead of being dropped.
      const merged: HotelSearchQuery = {
        ...query,
        max_price: parsedQuery.max_price,
        min_stars: parsedQuery.min_stars,
        ordering: parsedQuery.ordering,
        page: 1,
      }
      const params = buildHotelSearchParams(merged)
      if (params !== paramsString) {
        pushQuery(params)
      } else {
        // Same URL (e.g. retry) — run directly so an unchanged link re-searches.
        void runSearch(merged)
      }
    },
    [paramsString, parsedQuery, pushQuery, runSearch]
  )

  const handleServerFilterChange = React.useCallback(
    (patch: {
      max_price?: number
      min_stars?: number
      ordering?: HotelOrdering
    }) => {
      pushQuery(buildHotelSearchParams({ ...parsedQuery, ...patch, page: 1 }))
    },
    [parsedQuery, pushQuery]
  )

  const handleResetFilters = React.useCallback(() => {
    setSelectedAmenities([])
    pushQuery(
      buildHotelSearchParams({
        ...parsedQuery,
        max_price: undefined,
        min_stars: undefined,
        ordering: undefined,
        page: 1,
      })
    )
  }, [parsedQuery, pushQuery])

  const handleRetry = React.useCallback(() => {
    void runSearch(parsedQuery)
  }, [parsedQuery, runSearch])

  const handlePageChange = React.useCallback(
    (nextPage: number) => {
      pushQuery(buildHotelSearchParams({ ...parsedQuery, page: nextPage }))
    },
    [parsedQuery, pushQuery]
  )

  const handleClearDates = React.useCallback(() => {
    handleSearch({ ...parsedQuery, check_in: "", check_out: "", page: 1 })
  }, [parsedQuery, handleSearch])

  const handleRaisePriceCap = React.useCallback(() => {
    handleServerFilterChange({ max_price: undefined })
  }, [handleServerFilterChange])

  const handleLowerStars = React.useCallback(() => {
    handleServerFilterChange({ min_stars: undefined })
  }, [handleServerFilterChange])

  const handleStartOver = React.useCallback(() => {
    pushQuery("")
  }, [pushQuery])

  const handleReviewSearch = React.useCallback(() => {
    const form = document.getElementById("hotel-search-form")
    form?.scrollIntoView({ behavior: "smooth", block: "start" })
    form?.querySelector<HTMLInputElement>("input")?.focus()
  }, [])

  const isSearching = status === "loading"

  const resultsContent = (() => {
    if (status === "idle") {
      return (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HugeiconsIcon icon={Hotel01Icon} size={24} aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            Where would you like to stay?
          </h3>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Type a city or Hotel name and add your dates, or browse every Hotel
            Alphaa has to offer. Everything stays shareable in the address bar.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={() => handleSearch(BROWSE_ALL_QUERY)}
            >
              <HugeiconsIcon icon={Hotel01Icon} size={16} aria-hidden="true" />
              <span>Browse all Hotels</span>
            </Button>
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{
                    context: "planning a hotel stay",
                    channel: "whatsapp",
                  }}
                  href={getHotelSupportWhatsAppUrl("planning a hotel stay")}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              variant="ghost"
              size="sm"
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={14}
                aria-hidden="true"
              />
              <span>Talk to Alphaa</span>
            </Button>
          </div>
        </div>
      )
    }

    if (status === "loading") {
      return <HotelResultsSkeleton />
    }

    if (status === "error") {
      const isValidationError =
        error instanceof ApiError && error.code === "validation"
      return (
        <div className="flex flex-col gap-4">
          <ErrorState
            preset="general"
            title={
              isValidationError
                ? "That search needs a quick review."
                : "We could not load Hotels right now."
            }
            description={isValidationError ? error.message : undefined}
            error={error}
            onRetry={isValidationError ? undefined : handleRetry}
            retryLabel="Retry search"
            supportContext="finding a Hotel for my stay"
          />
          {isValidationError ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReviewSearch}
              >
                <span>Review search</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="text-center text-xs text-muted-foreground">
                No booking was made and no payment was taken. Try again or talk
                to Alphaa for help.
              </p>
              {hasServerFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                >
                  <span>Clear filters and retry</span>
                </Button>
              ) : null}
            </div>
          )}
        </div>
      )
    }

    if (status === "empty") {
      return (
        <div className="flex flex-col gap-4">
          {hasServerFilters || amenityOptions.length > 0 ? (
            <HotelFilters
              server={serverFilters}
              amenityOptions={[]}
              selectedAmenities={[]}
              onAmenitiesChange={() => {}}
              visibleCount={0}
              totalCount={pageData?.count ?? 0}
              isPending={isFilterPending}
              onServerChange={handleServerFilterChange}
              onResetFilters={handleResetFilters}
            />
          ) : null}
          <HotelEmptyState
            stayContext={stayContext}
            hasDates={
              parsedQuery.check_in !== "" || parsedQuery.check_out !== ""
            }
            hasPriceCap={parsedQuery.max_price !== undefined}
            hasStarFloor={parsedQuery.min_stars !== undefined}
            onWidenDates={handleClearDates}
            onRaisePriceCap={handleRaisePriceCap}
            onLowerStars={handleLowerStars}
            onStartOver={handleStartOver}
          />
        </div>
      )
    }

    // success — backend total stays authoritative; amenities refine the page.
    const count = pageData?.count ?? 0
    const countLabel = `${count} ${count === 1 ? "Hotel" : "Hotels"}`
    const filterLine = describeServerFilters(parsedQuery)
    const summary = [
      parsedQuery.destination.trim().length > 0
        ? `${countLabel} matching “${parsedQuery.destination.trim()}”`
        : `${countLabel} available`,
      filterLine,
    ]
      .filter(Boolean)
      .join(" · ")
    const currentPage = parsedQuery.page
    const refinedEmpty = visibleHotels.length === 0

    return (
      <div className="flex flex-col gap-4">
        <p
          className="text-sm font-medium text-muted-foreground"
          aria-live="polite"
        >
          {summary}
        </p>

        <HotelFilters
          server={serverFilters}
          amenityOptions={amenityOptions}
          selectedAmenities={selectedAmenities}
          onAmenitiesChange={setSelectedAmenities}
          visibleCount={visibleHotels.length}
          totalCount={count}
          isPending={isFilterPending}
          onServerChange={handleServerFilterChange}
          onResetFilters={handleResetFilters}
        />

        {refinedEmpty ? (
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
              No Hotels on this page match those amenities
            </h3>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              Amenities refine only the Hotels on this page. Clear them to see
              every Hotel, or turn the page for more options.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedAmenities([])}
              >
                <span>Clear amenities</span>
              </Button>
              <Button
                render={
                  <TrackLink
                    event="support_click"
                    eventProps={{
                      context: "finding a hotel for my stay",
                      channel: "whatsapp",
                    }}
                    href={getHotelSupportWhatsAppUrl(
                      "finding a hotel for my stay",
                      stayContext
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                variant="ghost"
                size="sm"
              >
                <HugeiconsIcon
                  icon={Message01Icon}
                  size={14}
                  aria-hidden="true"
                />
                <span>Talk to Alphaa</span>
              </Button>
            </div>
          </div>
        ) : (
          <ul
            aria-label="Hotel results"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visibleHotels.map((hotel) => (
              <li
                key={hotel.id}
                className="[contain-intrinsic-size:auto_480px] [content-visibility:auto]"
              >
                <HotelCard hotel={hotel} />
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pageData?.previous}
            aria-label="Go to previous Hotels page"
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              size={14}
              aria-hidden="true"
            />
            <span>Previous</span>
          </Button>
          <span
            className="text-xs font-medium text-muted-foreground"
            aria-live="polite"
          >
            Showing {visibleHotels.length} of {count}{" "}
            {count === 1 ? "Hotel" : "Hotels"} · Page {currentPage}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pageData?.next}
            aria-label="Go to next Hotels page"
          >
            <span>Next</span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>
    )
  })()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <HotelSearchForm
        defaultValues={deferredDefaults}
        onSearch={handleSearch}
        onClear={handleStartOver}
        isSearching={isSearching}
      />

      <section
        aria-labelledby="hotel-results-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="hotel-results-heading"
            className="text-lg font-bold text-foreground"
          >
            {parsedQuery.destination.trim().length > 0
              ? `Hotels in ${parsedQuery.destination.trim()}`
              : "Hotel results"}
          </h2>
          <Button
            render={
              <TrackLink
                event="support_click"
                eventProps={{
                  context: "choosing a hotel",
                  channel: "whatsapp",
                }}
                href={getHotelSupportWhatsAppUrl(
                  "choosing a hotel",
                  stayContext
                )}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            variant="ghost"
            size="sm"
          >
            <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </Button>
        </div>

        {resultsContent}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 text-xs leading-relaxed text-muted-foreground">
        <h3 className="text-sm font-semibold text-foreground">
          How hotel pricing works
        </h3>
        <p className="mt-1">
          From-prices are per night in Naira and reflect the lowest Room Type at
          each Hotel. Your stay dates and party travel in the address bar, so
          you can share or revisit this search. The exact amount is confirmed
          before you pay.
        </p>
      </section>
    </div>
  )
}
