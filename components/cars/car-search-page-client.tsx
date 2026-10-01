"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { ErrorState } from "@/components/feedback/error-state"
import { CarResultsSkeleton } from "@/components/cars/car-results-skeleton"
import { CarCard } from "@/components/cars/car-card"
import { CarEmptyState } from "@/components/cars/car-empty-state"
import {
  CarFilters,
  CarMobileFilters,
  CarSortSelect,
} from "@/components/cars/car-filters"
import { CarPagination } from "@/components/cars/car-pagination"
import { ApiError } from "@/lib/api/client"
import { track } from "@/lib/analytics"
import { formatNaira } from "@/lib/format"
import {
  VEHICLE_TYPE_LABELS,
  buildCarSearchParams,
  getVehicles,
  parseCarSearchParams,
  validateCarSearchQuery,
  type CarOrdering,
  type CarSearchQuery,
  type PaginatedVehicles,
  type VehicleType,
} from "@/lib/api/cars"
import { countActiveFilters, getPagination } from "@/lib/api/shared"

type SearchStatus = "loading" | "success" | "empty" | "error"

/** Human line for the active server filters, e.g. "Executive SUV · up to ₦150,000". */
function describeActiveFilters(query: CarSearchQuery): string | null {
  const parts: string[] = []
  if (query.vehicle_type !== undefined) {
    parts.push(VEHICLE_TYPE_LABELS[query.vehicle_type])
  }
  if (query.max_rate !== undefined) {
    parts.push(`up to ${formatNaira(String(query.max_rate))}/hr`)
  }
  return parts.length > 0 ? parts.join(" · ") : null
}

/**
 * Vehicle listing — auto-loading sidebar layout.
 *
 * URL search state is the single source of truth: parsing it drives the
 * backend query, so back, refresh, and shared links restore exactly what the
 * guest saw. Bare `/cars` browses everything (page 1) with skeletons —
 * there is no idle gate. Filter transitions keep previous results visible
 * under a pending dim instead of flashing skeletons; pagination is numbered
 * with an honest `Showing A–B of N` range derived from the observed
 * full-page length (the backend exposes `count/next/previous` only).
 */
export function CarSearchPageClient() {
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
    () => parseCarSearchParams(rawParams),
    [rawParams]
  )

  const [status, setStatus] = React.useState<SearchStatus>("loading")
  const [pageData, setPageData] = React.useState<PaginatedVehicles | null>(null)
  const [error, setError] = React.useState<unknown | null>(null)
  const [isFilterPending, startFilterTransition] = React.useTransition()
  const requestIdRef = React.useRef(0)
  const lastSearchedParamsRef = React.useRef<string | null>(null)
  // Observed full-page length — first full page wins so the last-page range
  // never reads `11–20 of 13`. Falls back to the current page length.
  const pageSizeRef = React.useRef<number>(0)
  const resultsHeadingRef = React.useRef<HTMLHeadingElement | null>(null)
  const pendingScrollRef = React.useRef(false)

  const runSearch = React.useCallback(async (query: CarSearchQuery) => {
    const requestId = ++requestIdRef.current
    // Background refetches (filter/page transitions) keep previous results
    // visible — the pending dim comes from `isFilterPending`. Only fresh
    // loads without data enter the skeleton state.
    setError(null)
    try {
      const page = await getVehicles(query)
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

  // Hydrate from the URL: every change (filter, sort, page, back/forward,
  // shared link) triggers exactly one backend search. Bare `/cars` parses to
  // page 1 with no filters and browses everything.
  React.useEffect(() => {
    if (lastSearchedParamsRef.current === paramsString) return
    lastSearchedParamsRef.current = paramsString
    const validation = validateCarSearchQuery(parsedQuery)
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
  }, [paramsString, parsedQuery, runSearch])

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

  const handleServerFilterChange = React.useCallback(
    (patch: {
      vehicle_type?: VehicleType
      max_rate?: number
      ordering?: CarOrdering
    }) => {
      const prev = parsedQuery
      const next: CarSearchQuery = { ...prev, ...patch, page: 1 }
      if (
        patch.vehicle_type !== undefined &&
        patch.vehicle_type !== prev.vehicle_type
      ) {
        track("car_search", {
          has_type: true,
          has_rate: next.max_rate !== undefined,
        })
      } else if (
        patch.max_rate !== undefined &&
        patch.max_rate !== prev.max_rate
      ) {
        track("car_search", {
          has_type: next.vehicle_type !== undefined,
          has_rate: true,
        })
      }
      pushQuery(buildCarSearchParams(next))
    },
    [parsedQuery, pushQuery]
  )

  const handleResetFilters = React.useCallback(() => {
    pushQuery(buildCarSearchParams({ page: 1 }))
  }, [pushQuery])

  const handleRetry = React.useCallback(() => {
    setStatus("loading")
    void runSearch(parsedQuery)
  }, [parsedQuery, runSearch])

  const handlePageChange = React.useCallback(
    (nextPage: number) => {
      pushQuery(buildCarSearchParams({ ...parsedQuery, page: nextPage }), {
        scrollToResults: true,
      })
    },
    [parsedQuery, pushQuery]
  )

  const handleBrowseAll = React.useCallback(() => {
    pushQuery("")
  }, [pushQuery])

  const isSearching = status === "loading" && pageData === null
  const isUpdating = isFilterPending

  const serverFilters = React.useMemo(
    () => ({
      vehicle_type: parsedQuery.vehicle_type,
      max_rate: parsedQuery.max_rate,
      ordering: parsedQuery.ordering,
    }),
    [parsedQuery.vehicle_type, parsedQuery.max_rate, parsedQuery.ordering]
  )
  const activeFilterCount = countActiveFilters(serverFilters)

  const count = pageData?.count ?? 0
  const visibleCount = pageData?.results.length ?? 0
  const pageSize =
    pageSizeRef.current > 0 ? pageSizeRef.current : Math.max(visibleCount, 1)
  const { totalPages, start, end } = getPagination({
    page: parsedQuery.page,
    totalCount: count,
    pageSize,
    visibleCount,
  })
  const filterLine = describeActiveFilters(parsedQuery)
  const summary =
    status === "success"
      ? [`${count} ${count === 1 ? "vehicle" : "vehicles"}`, filterLine]
          .filter(Boolean)
          .join(" · ")
      : null

  const filtersPanel = (
    <CarFilters
      server={serverFilters}
      visibleCount={visibleCount}
      totalCount={count}
      isPending={isFilterPending}
      onServerChange={handleServerFilterChange}
      onResetFilters={handleResetFilters}
    />
  )

  const resultsContent = (() => {
    if (isSearching) return <CarResultsSkeleton count={6} />

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
                : "We could not load vehicles right now."
            }
            description={isValidationError ? error.message : undefined}
            error={error}
            onRetry={isValidationError ? undefined : handleRetry}
            retryLabel="Retry search"
            supportContext="finding a car for my trip"
          />
          {!isValidationError ? (
            <p className="text-center text-xs text-muted-foreground">
              No booking was made and no payment was taken. Try again or talk to
              Alphaa for help.
            </p>
          ) : null}
        </div>
      )
    }

    if (status === "empty") {
      return (
        <CarEmptyState
          hasTypeFilter={parsedQuery.vehicle_type !== undefined}
          hasRateCap={parsedQuery.max_rate !== undefined}
          onClearFilters={handleResetFilters}
          onStartOver={handleBrowseAll}
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
            aria-label="Vehicle results"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {(pageData?.results ?? []).map((vehicle) => (
              <li
                key={vehicle.id}
                className="[contain-intrinsic-size:auto_480px] [content-visibility:auto]"
              >
                <CarCard vehicle={vehicle} />
              </li>
            ))}
          </ul>
        </div>
        {isUpdating ? <CarResultsSkeleton count={2} dimmed /> : null}
        <CarPagination
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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      <div className="flex items-start justify-between gap-3">
        <h1
          ref={resultsHeadingRef}
          id="car-results-heading"
          tabIndex={-1}
          className="text-xl font-extrabold tracking-tight text-foreground focus-visible:outline-none sm:text-2xl"
        >
          {parsedQuery.vehicle_type
            ? `${VEHICLE_TYPE_LABELS[parsedQuery.vehicle_type]}s`
            : "All vehicles"}
          {activeFilterCount > 0 ? (
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              ({activeFilterCount}{" "}
              {activeFilterCount === 1 ? "filter" : "filters"})
            </span>
          ) : null}
        </h1>

        {/* Sorting sits with the results, not in the filter rail: it does not
            narrow the set, and the guest's eye is already here. The rail keeps
            only refinements. Hidden below lg, where the sheet carries it.
            The single "Talk to Alphaa" escape hatch for this page is the
            site-wide assistant widget, so this row adds no competing CTA. */}
        <CarSortSelect
          ordering={parsedQuery.ordering ?? ""}
          onOrderingChange={(next) =>
            handleServerFilterChange({
              ordering: next === "" ? undefined : next,
            })
          }
          isPending={isFilterPending}
          className="hidden shrink-0 lg:flex"
        />
      </div>

      <CarMobileFilters
        server={serverFilters}
        visibleCount={visibleCount}
        totalCount={count}
        isPending={isFilterPending}
        onServerChange={handleServerFilterChange}
        onResetFilters={handleResetFilters}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* `self-stretch` is what makes the pin work. The row is `lg:items-start`,
            which sized this aside to its own content, and a sticky child cannot
            travel inside a containing block no taller than itself — so the rail
            scrolled away despite carrying `sticky`. */}
        <aside
          aria-label="Vehicle filters"
          className="hidden w-72 shrink-0 lg:block lg:self-stretch"
        >
          <div className="sticky top-20">{filtersPanel}</div>
        </aside>

        <section
          aria-labelledby="car-results-heading"
          className="flex min-w-0 flex-1 flex-col gap-4"
        >
          {resultsContent}
        </section>
      </div>
    </div>
  )
}
