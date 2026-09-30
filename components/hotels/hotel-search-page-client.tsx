"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Message01Icon } from "@hugeicons/core-free-icons"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ErrorState } from "@/components/feedback/error-state"
import { TrackLink } from "@/components/analytics/track-link"
import { HotelSearchForm } from "@/components/hotels/hotel-search-form"
import { HotelResultsSkeleton } from "@/components/hotels/hotel-results-skeleton"
import { HotelCard } from "@/components/hotels/hotel-card"
import { HotelEmptyState } from "@/components/hotels/hotel-empty-state"
import {
  HotelFilters,
  HotelMobileFilters,
  type HotelServerFilterValue,
} from "@/components/hotels/hotel-filters"
import { HotelPagination } from "@/components/hotels/hotel-pagination"
import { ApiError } from "@/lib/api/client"
import { track } from "@/lib/analytics"
import { formatNaira } from "@/lib/format"
import {
  DEFAULT_HOTEL_GUESTS,
  DEFAULT_HOTEL_ROOMS,
  buildHotelSearchParams,
  countActiveHotelFilters,
  getHotelPagination,
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

type SearchStatus = "loading" | "success" | "empty" | "error"

const DEFAULT_LISTING_QUERY: HotelSearchQuery = {
  destination: "",
  check_in: "",
  check_out: "",
  guests: DEFAULT_HOTEL_GUESTS,
  rooms: DEFAULT_HOTEL_ROOMS,
  page: 1,
}
/** Sentinel marking the one automatic browse-all load on the clean entry. */
const AUTO_BROWSE_KEY = "auto:browse-all"

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
 * Hotel listing shell — auto-loading sidebar catalogue mirroring the cars
 * listing.
 *
 * URL listing state is the single source of truth: parsing it drives the
 * backend query, so back, refresh, and shared links restore exactly what the
 * guest saw. A bare `/hotels` auto-loads browse-all without writing the URL;
 * submitting a destination (empty still means browse-all) writes it plus any
 * server filters.
 *
 * Filter transitions keep previous results visible under a pending dim
 * instead of flashing skeletons; pagination is numbered with an honest
 * `Showing A–B of N` range derived from the observed full-page length.
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

  // Deferred default keeps the field in step with the URL without blocking
  // typing on navigation (vercel: rerender-use-deferred-value).
  const deferredDestination = React.useDeferredValue(parsedQuery.destination)

  const [status, setStatus] = React.useState<SearchStatus>("loading")
  const [pageData, setPageData] = React.useState<PaginatedHotels | null>(null)
  const [error, setError] = React.useState<unknown | null>(null)

  // Server-filter transitions keep input responsive: the previous results
  // stay visible with a pending indicator instead of flashing skeletons.
  const [isFilterPending, startFilterTransition] = React.useTransition()

  // Ignore stale responses when a newer search supersedes an in-flight one.
  const requestIdRef = React.useRef(0)
  // Last URL search state that was hydrated, so each change searches once.
  const lastSearchedParamsRef = React.useRef<string | null>(null)
  // Observed full-page length — first full page wins so the last-page range
  // never reads `11–20 of 13`. Falls back to the current page length.
  const pageSizeRef = React.useRef<number>(0)
  const resultsHeadingRef = React.useRef<HTMLHeadingElement | null>(null)
  const pendingScrollRef = React.useRef(false)

  const runSearch = React.useCallback(async (query: HotelSearchQuery) => {
    const requestId = ++requestIdRef.current
    setError(null)
    try {
      const page = await getHotels(query)
      if (requestId !== requestIdRef.current) return
      if (query.page === 1 && page.results.length > 0) {
        pageSizeRef.current = page.results.length
      } else if (pageSizeRef.current === 0 && page.results.length > 0) {
        pageSizeRef.current = page.results.length
      }
      setPageData(page)
      setStatus(page.results.length > 0 ? "success" : "empty")
      if (pendingScrollRef.current) {
        pendingScrollRef.current = false
        requestAnimationFrame(() => {
          resultsHeadingRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
          resultsHeadingRef.current?.focus({ preventScroll: true })
        })
      }
    } catch (caught) {
      if (requestId !== requestIdRef.current) return
      pendingScrollRef.current = false
      setError(caught)
      setPageData(null)
      setStatus("error")
    }
  }, [])

  // Hydrate from the URL: a change in listing state triggers exactly one backend search.
  React.useEffect(() => {
    if (!hasSearch) {
      if (lastSearchedParamsRef.current === AUTO_BROWSE_KEY) return
      lastSearchedParamsRef.current = AUTO_BROWSE_KEY
      void runSearch(DEFAULT_LISTING_QUERY)
      return
    }
    if (lastSearchedParamsRef.current === paramsString) return
    lastSearchedParamsRef.current = paramsString

    const validation = validateHotelSearchQuery(parsedQuery)
    if (!validation.success) {
      requestIdRef.current += 1
      pendingScrollRef.current = false
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
    () => ({ destination: parsedQuery.destination }),
    [parsedQuery.destination]
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
  const activeFilterCount = countActiveHotelFilters(serverFilters)

  const pushQuery = React.useCallback(
    (params: string, options?: { scrollToResults?: boolean }) => {
      if (options?.scrollToResults) pendingScrollRef.current = true
      startFilterTransition(() => {
        router.push(params ? `${pathname}?${params}` : pathname, {
          scroll: false,
        })
      })
    },
    [pathname, router]
  )

  const handleSearch = React.useCallback(
    (destination: string) => {
      track("hotel_search", {
        has_destination: destination.trim().length > 0,
        has_filters:
          parsedQuery.max_price !== undefined ||
          parsedQuery.min_stars !== undefined ||
          parsedQuery.ordering !== undefined,
      })
      const merged: HotelSearchQuery = {
        destination: destination.trim(),
        check_in: "",
        check_out: "",
        guests: DEFAULT_HOTEL_GUESTS,
        rooms: DEFAULT_HOTEL_ROOMS,
        max_price: parsedQuery.max_price,
        min_stars: parsedQuery.min_stars,
        ordering: parsedQuery.ordering,
        page: 1,
      }
      const params = buildHotelSearchParams(merged)
      if (params !== paramsString) {
        pushQuery(params)
      } else {
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
    setStatus("loading")
    void runSearch(parsedQuery)
  }, [parsedQuery, runSearch])

  const handlePageChange = React.useCallback(
    (nextPage: number) => {
      pushQuery(buildHotelSearchParams({ ...parsedQuery, page: nextPage }), {
        scrollToResults: true,
      })
    },
    [parsedQuery, pushQuery]
  )

  const handleStartOver = React.useCallback(() => {
    pushQuery("")
  }, [pushQuery])

  const handleRaisePriceCap = React.useCallback(() => {
    handleServerFilterChange({ max_price: undefined })
  }, [handleServerFilterChange])

  const handleLowerStars = React.useCallback(() => {
    handleServerFilterChange({ min_stars: undefined })
  }, [handleServerFilterChange])

  const handleReviewSearch = React.useCallback(() => {
    const form = document.getElementById("hotel-search-form")
    form?.scrollIntoView({ behavior: "smooth", block: "start" })
    form?.querySelector<HTMLInputElement>("input")?.focus()
  }, [])

  const isSearching = status === "loading" && pageData === null
  const isUpdating = isFilterPending

  const count = pageData?.count ?? 0
  const hotels = pageData?.results ?? []
  const pageSize =
    pageSizeRef.current > 0 ? pageSizeRef.current : Math.max(hotels.length, 1)
  const { totalPages, start, end } = getHotelPagination({
    page: parsedQuery.page,
    totalCount: count,
    pageSize,
    visibleCount: hotels.length,
  })
  const filterLine = describeServerFilters(parsedQuery)
  const summary =
    status === "success"
      ? [`${count} ${count === 1 ? "Hotel" : "Hotels"}`, filterLine]
          .filter(Boolean)
          .join(" · ")
      : null

  const filtersPanel = (
    <HotelFilters
      server={serverFilters}
      totalCount={count}
      isPending={isFilterPending}
      onServerChange={handleServerFilterChange}
      onResetFilters={handleResetFilters}
    />
  )

  const resultsContent = (() => {
    if (isSearching) {
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
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReviewSearch}
              >
                <span>Review search</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleStartOver}
              >
                <span>Start over</span>
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
        <HotelEmptyState
          stayContext={stayContext}
          hasPriceCap={parsedQuery.max_price !== undefined}
          hasStarFloor={parsedQuery.min_stars !== undefined}
          onRaisePriceCap={handleRaisePriceCap}
          onLowerStars={handleLowerStars}
          onStartOver={handleStartOver}
        />
      )
    }

    return (
      <div className="flex flex-col gap-5" aria-busy={isUpdating || undefined}>
        {summary ? (
          <p
            className="text-sm font-medium text-muted-foreground"
            aria-live="polite"
          >
            {summary}
            {isUpdating ? " · Updating…" : ""}
          </p>
        ) : null}

        <div className={cn(isUpdating && "pointer-events-none opacity-60")}>
          <ul
            aria-label="Hotel results"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {hotels.map((hotel) => (
              <li
                key={hotel.id}
                className="[contain-intrinsic-size:auto_480px] [content-visibility:auto]"
              >
                <HotelCard hotel={hotel} />
              </li>
            ))}
          </ul>
        </div>

        {isUpdating ? <HotelResultsSkeleton count={2} dimmed /> : null}
        <HotelPagination
          page={parsedQuery.page}
          totalPages={totalPages}
          start={start}
          end={end}
          totalCount={count}
          isPending={isFilterPending}
          onPageChange={handlePageChange}
        />
      </div>
    )
  })()

  const resultsHeading =
    parsedQuery.destination.trim().length > 0
      ? `Hotels in ${parsedQuery.destination.trim()}`
      : "All Hotels"

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      <HotelSearchForm
        defaultValues={{ destination: deferredDestination }}
        onSearch={handleSearch}
        onClear={handleStartOver}
        isSearching={isSearching}
      />

      <div className="flex items-center justify-between gap-3">
        <h1
          ref={resultsHeadingRef}
          id="hotel-results-heading"
          tabIndex={-1}
          className="text-xl font-extrabold tracking-tight text-foreground focus-visible:outline-none sm:text-2xl"
        >
          {resultsHeading}
          {activeFilterCount > 0 ? (
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              ({activeFilterCount}{" "}
              {activeFilterCount === 1 ? "filter" : "filters"})
            </span>
          ) : null}
        </h1>
        <TrackLink
          event="support_click"
          eventProps={{
            context: "choosing a hotel",
            channel: "whatsapp",
          }}
          href={getHotelSupportWhatsAppUrl("choosing a hotel", stayContext)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
          <span>Talk to Alphaa</span>
        </TrackLink>
      </div>

      <HotelMobileFilters
        server={serverFilters}
        totalCount={count}
        isPending={isFilterPending}
        onServerChange={handleServerFilterChange}
        onResetFilters={handleResetFilters}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside
          aria-label="Hotel filters"
          className="hidden w-72 shrink-0 lg:block"
        >
          <div className="sticky top-24">{filtersPanel}</div>
        </aside>

        <section
          aria-labelledby="hotel-results-heading"
          className="flex min-w-0 flex-1 flex-col gap-4"
        >
          {resultsContent}
        </section>
      </div>
    </div>
  )
}
