"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Hotel01Icon,
  Message01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { TrackLink } from "@/components/analytics/track-link";
import { HotelSearchForm } from "@/components/hotels/hotel-search-form";
import { HotelResultsSkeleton } from "@/components/hotels/hotel-results-skeleton";
import { ApiError } from "@/lib/api/client";
import {
  DEFAULT_HOTEL_GUESTS,
  DEFAULT_HOTEL_ROOMS,
  buildHotelSearchParams,
  getHotelSupportWhatsAppUrl,
  getHotels,
  hasHotelSearchParams,
  parseHotelSearchParams,
  validateHotelSearchQuery,
  type HotelSearchQuery,
  type HotelStayContext,
  type PaginatedHotels,
} from "@/lib/api/hotels";

type SearchStatus = "idle" | "loading" | "success" | "empty" | "error";

const BROWSE_ALL_QUERY: HotelSearchQuery = {
  destination: "",
  check_in: "",
  check_out: "",
  guests: DEFAULT_HOTEL_GUESTS,
  rooms: DEFAULT_HOTEL_ROOMS,
  page: 1,
};

/**
 * Hotel listing shell (Phase 4, ticket 01).
 *
 * URL search state is the single source of truth: parsing it drives the
 * backend query, so back, refresh, and shared links restore exactly what the
 * guest saw. A bare `/hotels` is the idle search landing; submitting a search
 * (including an empty destination, which browses every Hotel) writes the
 * party plus any destination/dates to the URL and fetches with `no-store`.
 *
 * States are explicit and never render a blank container: idle, loading
 * (skeletons), success, empty, and error with retry — each offering Talk to
 * Alphaa. Cards, filters, ordering, and amenity refinement are ticket 02.
 */
export function HotelSearchPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramsString = searchParams.toString();

  const rawParams = React.useMemo(
    () => Object.fromEntries(searchParams.entries()) as Record<string, string | undefined>,
    [searchParams],
  );

  const parsedQuery = React.useMemo(() => parseHotelSearchParams(rawParams), [rawParams]);
  const hasSearch = React.useMemo(() => hasHotelSearchParams(rawParams), [rawParams]);

  // Deferred defaults keep the form in step with the URL without blocking
  // typing on navigation (vercel: rerender-use-deferred-value).
  const deferredDefaults = React.useDeferredValue(parsedQuery);

  const [status, setStatus] = React.useState<SearchStatus>(hasSearch ? "loading" : "idle");
  const [pageData, setPageData] = React.useState<PaginatedHotels | null>(null);
  const [error, setError] = React.useState<unknown | null>(null);

  // Ignore stale responses when a newer search supersedes an in-flight one.
  const requestIdRef = React.useRef(0);
  // Last URL search state that was hydrated, so each change searches once.
  const lastSearchedParamsRef = React.useRef<string | null>(null);

  const runSearch = React.useCallback(async (query: HotelSearchQuery) => {
    const requestId = ++requestIdRef.current;
    setStatus("loading");
    setError(null);
    try {
      const page = await getHotels(query);
      if (requestId !== requestIdRef.current) return;
      setPageData(page);
      setStatus(page.results.length > 0 ? "success" : "empty");
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      setError(caught);
      setPageData(null);
      setStatus("error");
    }
  }, []);

  // Hydrate from the URL: a change in search state (submit, back/forward,
  // shared link, pagination) triggers exactly one backend search. URL state
  // is untrusted — invalid dates surface a human error instead of a request.
  React.useEffect(() => {
    if (!hasSearch) {
      lastSearchedParamsRef.current = null;
      setStatus("idle");
      setPageData(null);
      setError(null);
      return;
    }
    if (lastSearchedParamsRef.current === paramsString) return;
    lastSearchedParamsRef.current = paramsString;

    const validation = validateHotelSearchQuery(parsedQuery);
    if (!validation.success) {
      requestIdRef.current += 1;
      setPageData(null);
      setError(new ApiError(validation.message, { status: 400, code: "validation" }));
      setStatus("error");
      return;
    }
    void runSearch(parsedQuery);
  }, [hasSearch, paramsString, parsedQuery, runSearch]);

  const stayContext = React.useMemo<HotelStayContext>(
    () => ({
      destination: parsedQuery.destination,
      check_in: parsedQuery.check_in,
      check_out: parsedQuery.check_out,
      guests: parsedQuery.guests,
      rooms: parsedQuery.rooms,
    }),
    [parsedQuery],
  );

  const pushQuery = React.useCallback(
    (params: string) => {
      React.startTransition(() => {
        router.push(params ? `${pathname}?${params}` : pathname, { scroll: false });
      });
    },
    [pathname, router],
  );

  const handleSearch = React.useCallback(
    (query: HotelSearchQuery) => {
      const params = buildHotelSearchParams({ ...query, page: 1 });
      if (params !== paramsString) {
        pushQuery(params);
      } else {
        // Same URL (e.g. retry) — run directly so an unchanged link re-searches.
        void runSearch(query);
      }
    },
    [paramsString, pushQuery, runSearch],
  );

  const handleRetry = React.useCallback(() => {
    void runSearch(parsedQuery);
  }, [parsedQuery, runSearch]);

  const handlePageChange = React.useCallback(
    (nextPage: number) => {
      pushQuery(buildHotelSearchParams({ ...parsedQuery, page: nextPage }));
    },
    [parsedQuery, pushQuery],
  );

  const handleClearDates = React.useCallback(() => {
    handleSearch({ ...parsedQuery, check_in: "", check_out: "", page: 1 });
  }, [parsedQuery, handleSearch]);

  const handleStartOver = React.useCallback(() => {
    pushQuery("");
  }, [pushQuery]);

  const handleReviewSearch = React.useCallback(() => {
    const form = document.getElementById("hotel-search-form");
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
    form?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);

  const isSearching = status === "loading";

  const resultsContent = (() => {
    if (status === "idle") {
      return (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HugeiconsIcon icon={Hotel01Icon} size={24} aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-foreground">Where would you like to stay?</h3>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Type a city or Hotel name and add your dates, or browse every Hotel Alphaa has to offer. Everything stays
            shareable in the address bar.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button type="button" size="sm" onClick={() => handleSearch(BROWSE_ALL_QUERY)}>
              <HugeiconsIcon icon={Hotel01Icon} size={16} aria-hidden="true" />
              <span>Browse all Hotels</span>
            </Button>
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{ context: "planning a hotel stay", channel: "whatsapp" }}
                  href={getHotelSupportWhatsAppUrl("planning a hotel stay")}
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
        </div>
      );
    }

    if (status === "loading") {
      return <HotelResultsSkeleton />;
    }

    if (status === "error") {
      const isValidationError = error instanceof ApiError && error.code === "validation";
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
              <Button type="button" variant="outline" size="sm" onClick={handleReviewSearch}>
                <span>Review search</span>
              </Button>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              No booking was made and no payment was taken. Try again or talk to Alphaa for help.
            </p>
          )}
        </div>
      );
    }

    if (status === "empty") {
      const hasDates = parsedQuery.check_in !== "" || parsedQuery.check_out !== "";
      return (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Hotels found for this search</h3>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            {hasDates
              ? "Try widening your dates or searching a nearby city. Our specialists can also check options for you."
              : "Try a different city or Hotel name, or browse every Hotel Alphaa has to offer."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {hasDates ? (
              <Button type="button" variant="outline" size="sm" onClick={handleClearDates}>
                <span>Widen dates</span>
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => handleSearch(BROWSE_ALL_QUERY)}>
                <span>Browse all Hotels</span>
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={handleStartOver}>
              <span>Start over</span>
            </Button>
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{ context: "finding a hotel for my stay", channel: "whatsapp" }}
                  href={getHotelSupportWhatsAppUrl("finding a hotel for my stay", stayContext)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              variant="secondary"
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

    // success
    const count = pageData?.count ?? 0;
    const countLabel = `${count} ${count === 1 ? "Hotel" : "Hotels"}`;
    const summary =
      parsedQuery.destination.trim().length > 0
        ? `${countLabel} matching “${parsedQuery.destination.trim()}”`
        : `${countLabel} available`;
    const currentPage = parsedQuery.page;
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
          {summary}
        </p>

        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          {(pageData?.results ?? []).map((hotel) => (
            <li key={hotel.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
              <span className="text-sm font-semibold text-foreground">{hotel.name}</span>
              <span className="text-xs text-muted-foreground">
                {hotel.city}
                {hotel.country ? `, ${hotel.country}` : ""}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pageData?.previous}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} aria-hidden="true" />
            <span>Previous</span>
          </Button>
          <span className="text-xs font-medium text-muted-foreground" aria-live="polite">
            Page {currentPage}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pageData?.next}
          >
            <span>Next</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  })();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <HotelSearchForm
        defaultValues={deferredDefaults}
        onSearch={handleSearch}
        onClear={handleStartOver}
        isSearching={isSearching}
      />

      <section aria-labelledby="hotel-results-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="hotel-results-heading" className="text-lg font-bold text-foreground">
            {parsedQuery.destination.trim().length > 0
              ? `Hotels in ${parsedQuery.destination.trim()}`
              : "Hotel results"}
          </h2>
          <Button
            render={
              <TrackLink
                event="support_click"
                eventProps={{ context: "choosing a hotel", channel: "whatsapp" }}
                href={getHotelSupportWhatsAppUrl("choosing a hotel", stayContext)}
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
        <h3 className="text-sm font-semibold text-foreground">How hotel pricing works</h3>
        <p className="mt-1">
          From-prices are per night in Naira and reflect the lowest Room Type at each Hotel. Your stay dates and party
          travel in the address bar, so you can share or revisit this search. The exact amount is confirmed before you
          pay.
        </p>
      </section>
    </div>
  );
}
