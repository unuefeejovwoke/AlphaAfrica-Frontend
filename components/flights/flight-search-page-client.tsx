"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { FlightSearchForm } from "@/components/flights/flight-search-form";
import { FlightOfferSkeleton } from "@/components/flights/flight-offer-card";
import { Button } from "@/components/ui/button";
import { TrackLink } from "@/components/analytics/track-link";
import {
  type Airport,
  type FlightOffer,
  type FlightOfferDisplay,
  type FlightSearchPayload,
  type FlightTripContext,
  getFlightSupportWhatsAppUrl,
  saveSelectedOffer,
  searchFlights,
} from "@/lib/api/flights";
import {
  buildFlightSearchQuery,
  type FlightTripType,
  parseFlightSearchPayload,
  parseFlightSearchUrl,
} from "@/lib/api/flight-search-url";
import { ApiError, getHumanErrorMessage } from "@/lib/api/client";
import { track } from "@/lib/analytics";
import { getSupportWhatsAppUrl } from "@/lib/content/company";
import { isDomesticSearch, type DomesticSearchParams } from "@/lib/api/domestic";
import { FILTER_PARAM_KEYS } from "@/lib/api/flight-filters";
import { useDomesticStream } from "@/components/flights/use-domestic-stream";

// Heavy result component — dynamic import for bundle size (vercel: bundle-dynamic-imports)
const FlightSearchResults = dynamic(
  () => import("@/components/flights/flight-search-results").then((m) => m.FlightSearchResults),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <FlightOfferSkeleton key={i} />
        ))}
      </div>
    ),
  },
);

// Domestic streaming results — dynamic import so the SSE reader + card list
// never bloat the international first paint (vercel: bundle-dynamic-imports).
const DomesticStreamResults = dynamic(
  () =>
    import("@/components/flights/domestic-stream-results").then(
      (m) => m.DomesticStreamResults,
    ),
  {
    ssr: false,
    loading: () => (
      <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
        <p className="text-sm font-medium text-muted-foreground">
          Finding available flights… airlines being checked…
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <FlightOfferSkeleton key={i} />
          ))}
        </div>
      </div>
    ),
  },
);

export function FlightSearchPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsString = searchParams.toString();

  const {
    values: urlValues,
    originAirport: urlOrigin,
    destinationAirport: urlDest,
    legAirports: urlLegAirports,
    isValid: hasValidUrlSearch,
  } = React.useMemo(() => parseFlightSearchUrl(new URLSearchParams(paramsString)), [paramsString]);

  // Auto-search needle strips filter/sort keys: refining results updates the
  // URL (back/refresh/share) but must never retrigger a backend search.
  // A fresh submit carries search-only params, so local filter state resets
  // through URL adoption in useFilteredOffers.
  const searchNeedle = React.useMemo(() => {
    const stripped = new URLSearchParams(paramsString);
    for (const key of FILTER_PARAM_KEYS) stripped.delete(key);
    return stripped.toString();
  }, [paramsString]);

  // Deferred URL values for non-urgent hydration (vercel: rerender-use-deferred-value)
  const deferredUrlValues = React.useDeferredValue(urlValues);

  // Trip context for support hatches — route, dates, party from the URL
  // search state, so specialists see what the customer searched.
  const tripContext = React.useMemo<FlightTripContext>(() => {
    const values = urlValues as Record<string, unknown>;
    const legs = Array.isArray(values.legs) ? (values.legs as Record<string, unknown>[]) : [];
    const firstLeg = legs.length > 0 ? legs[0] : null;
    const text = (value: unknown) => (typeof value === "string" && value ? value : null);
    const count = (value: unknown) => (typeof value === "number" && value > 0 ? value : null);
    return {
      origin: text(values.origin) ?? (firstLeg ? text(firstLeg.origin) : null),
      destination: text(values.destination) ?? (firstLeg ? text(firstLeg.destination) : null),
      departureDate: text(values.departureDate) ?? (firstLeg ? text(firstLeg.date) : null),
      returnDate: text(values.returnDate),
      adults: count(values.adults),
      children: count(values.children),
      infants: count(values.infants),
    };
  }, [urlValues]);

  const [offers, setOffers] = React.useState<FlightOffer[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState<unknown | null>(null);
  const [hasSearched, setHasSearched] = React.useState(hasValidUrlSearch);
  const lastTripTypeRef = React.useRef<FlightTripType>("one_way");
  const lastLegCountRef = React.useRef<number>(1);
  // Auto-detected journey: both-Nigerian one-way/round-trip → domestic SSE,
  // otherwise the international Amadeus legs path. No manual toggle in v1
  // (ADR-0004); multi-city always uses the international path since the SSE
  // endpoint expresses a single route. URL criteria stay the single source.
  const [searchMode, setSearchMode] = React.useState<"domestic" | "international" | null>(() => {
    try {
      if (!hasValidUrlSearch) return null;
      const t = urlValues.trip_type ?? "one_way";
      if (t === "multi_city") return "international";
      const o = typeof urlValues.origin === "string" ? urlValues.origin : "";
      const d = typeof urlValues.destination === "string" ? urlValues.destination : "";
      if (o && d && isDomesticSearch(o, d)) return "domestic";
      return "international";
    } catch {
      return null;
    }
  });
  const domestic = useDomesticStream();
  const domesticStart = domestic.start;
  const domesticAbort = domestic.abort;

  // Auto-search when hydration or URL popstate yields a valid search
  const lastAutoSearchKey = React.useRef<string | null>(null);

  const doSearch = React.useCallback(
    async (payload: FlightSearchPayload) => {
      lastTripTypeRef.current = payload.trip_type;
      lastLegCountRef.current =
        payload.trip_type === "multi_city"
          ? payload.legs.length
          : payload.trip_type === "round_trip"
            ? 2
            : 1;
      setHasSearched(true);

      // Domestic streaming path: one-way / round-trip between two Nigerian
      // airports. Multi-city stays international (single-route SSE endpoint).
      const domesticParams: DomesticSearchParams | null =
        payload.trip_type === "one_way" &&
        isDomesticSearch(payload.origin, payload.destination)
          ? {
              origin: payload.origin,
              destination: payload.destination,
              date: payload.departureDate,
              adults: payload.adults,
              children: payload.children,
              infants: payload.infants,
            }
          : payload.trip_type === "round_trip" &&
              isDomesticSearch(payload.origin, payload.destination)
            ? {
                origin: payload.origin,
                destination: payload.destination,
                date: payload.departureDate,
                adults: payload.adults,
                children: payload.children,
                infants: payload.infants,
                return_date: payload.returnDate,
              }
            : null;

      if (domesticParams) {
        setSearchMode("domestic");
        setError(null);
        React.startTransition(() => {
          setOffers([]);
        });
        track("flight_search_started", {
          trip_type: payload.trip_type,
          cabin: payload.cabin,
          route: "domestic",
          leg_count: String(lastLegCountRef.current),
        });
        await domesticStart(domesticParams);
        return;
      }

      // International legs path — abort any in-flight domestic stream so
      // stale SSE chunks never commit after the mode switch.
      domesticAbort();
      setSearchMode("international");
      setIsSearching(true);
      setError(null);
      // Keep input responsive: mark results update as transition (vercel: rerender-transitions)
      React.startTransition(() => {
        setOffers([]);
      });
      try {
        // One search request for the whole itinerary — never one fetch per leg.
        track("flight_search_started", {
          trip_type: payload.trip_type,
          cabin: payload.cabin,
          route: "international",
          leg_count: String(lastLegCountRef.current),
        });
        const data = await searchFlights(payload);
        setOffers(data);
        track("flight_search_completed", {
          trip_type: payload.trip_type,
          results: String(data.length),
          route: "international",
          leg_count: String(lastLegCountRef.current),
        });
      } catch (e) {
        const human = getHumanErrorMessage(e);
        setError(e instanceof ApiError ? e : new ApiError(human, { code: "unknown", status: null }));
        setOffers([]);
      } finally {
        setIsSearching(false);
      }
    },
    [domesticStart, domesticAbort],
  );

  // Domestic completion analytics — the hook resolves async after doSearch
  // returns, so completion is tracked here (search_id stays out of analytics).
  const domesticCompletedTrackedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!domestic.isComplete || domestic.isStreaming || domestic.isFallingBack) return;
    const key = `${domestic.cards.length}:${domestic.didFallback ? "fb" : "sse"}:${searchMode}`;
    if (domesticCompletedTrackedRef.current === key) return;
    domesticCompletedTrackedRef.current = key;
    track("flight_search_completed", {
      trip_type: lastTripTypeRef.current,
      results: String(domestic.cards.length),
      route: "domestic",
      leg_count: String(lastLegCountRef.current),
    });
  }, [domestic.isComplete, domestic.isStreaming, domestic.isFallingBack, domestic.cards.length, domestic.didFallback, searchMode]);

  // On mount / URL change, auto-search if URL holds a valid search and we haven't yet
  React.useEffect(() => {
    if (!hasValidUrlSearch) return;
    const needle = searchNeedle;
    if (lastAutoSearchKey.current === needle) return;
    lastAutoSearchKey.current = needle;

    const parsed = parseFlightSearchPayload({
      trip_type: urlValues.trip_type ?? "one_way",
      origin: urlValues.origin,
      destination: urlValues.destination,
      departureDate: urlValues.departureDate,
      returnDate: urlValues.returnDate,
      legs: urlValues.legs,
      adults: urlValues.adults ?? 1,
      children: urlValues.children ?? 0,
      infants: urlValues.infants ?? 0,
      cabin: urlValues.cabin ?? "ECONOMY",
      non_stop: urlValues.non_stop ?? false,
      max_stops: urlValues.max_stops ?? null,
    });
    if (parsed.success) {
      void doSearch(parsed.data);
    }
  }, [hasValidUrlSearch, searchNeedle, urlValues, doSearch]);

  const handleSubmit = React.useCallback(
    (payload: FlightSearchPayload) => {
      // Preserve search state in URL for back/refresh/share
      const nextQuery = buildFlightSearchQuery(payload);
      const currentQuery = searchParams.toString();
      if (nextQuery !== currentQuery) {
        router.push(`?${nextQuery}`, { scroll: false });
      }
      // Always run search even if URL unchanged (supports retry without navigation)
      void doSearch(payload);
    },
    [router, searchParams, doSearch],
  );

  const handleRetry = React.useCallback(() => {
    const parsed = parseFlightSearchPayload({
      trip_type: urlValues.trip_type ?? "one_way",
      origin: urlValues.origin,
      destination: urlValues.destination,
      departureDate: urlValues.departureDate,
      returnDate: urlValues.returnDate,
      legs: urlValues.legs,
      adults: urlValues.adults ?? 1,
      children: urlValues.children ?? 0,
      infants: urlValues.infants ?? 0,
      cabin: urlValues.cabin ?? "ECONOMY",
      non_stop: urlValues.non_stop ?? false,
      max_stops: urlValues.max_stops ?? null,
    });
    if (parsed.success) {
      void doSearch(parsed.data);
    } else {
      // No valid URL to retry — scroll to form
      document.getElementById("flight-search-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [urlValues, doSearch]);

  const handleSelect = React.useCallback(
    (display: FlightOfferDisplay) => {
      // Keep the opaque blob in memory + sessionStorage backup, never in
      // URL/analytics, then enter the dedicated fare-confirmation step
      // (ticket 05) inside the distraction-free checkout shell.
      saveSelectedOffer(display.raw);
      track("flight_selected", {
        trip_type: lastTripTypeRef.current,
        cabin: display.cabin,
        route: searchMode ?? "international",
        leg_count: String(lastLegCountRef.current),
      });
      router.push("/flights/confirm");
    },
    [router, searchMode],
  );

  const formBusy = isSearching || domestic.isStreaming || domestic.isFallingBack;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex max-w-3xl flex-col gap-3">
        <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Flights · One-way, round-trip & multi-city
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
          Search flights
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Pick a trip type, choose airports with autocomplete, add future dates and party, and compare live offers with
          airline, timing, stops, duration, and total price in Naira. Flights within Nigeria stream in as airlines
          respond and can take up to a minute. No account needed — you&apos;ll confirm the live
          fare before paying.
        </p>
      </header>

      <div id="flight-search-form">
        <FlightSearchForm
          defaultValues={deferredUrlValues}
          defaultOriginAirport={urlOrigin}
          defaultDestinationAirport={urlDest}
          defaultLegAirports={urlLegAirports}
          onSubmit={handleSubmit}
          isSearching={formBusy}
        />
      </div>

      {/* Results */}
      <section aria-labelledby="flight-results-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="flight-results-heading" className="text-lg font-bold text-foreground">
            {searchMode === "domestic" ? "Domestic flights" : "Flight offers"}
          </h2>
          <Button
            render={
              <TrackLink
                event="support_click"
                eventProps={{ context: "choosing a flight", channel: "whatsapp" }}
                href={getFlightSupportWhatsAppUrl("choosing a flight", tripContext)}
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

        {hasSearched ? (
          searchMode === "domestic" ? (
            <React.Suspense
              fallback={
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  className="flex flex-col gap-4"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    Finding available flights… airlines being checked…
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <FlightOfferSkeleton key={i} />
                    ))}
                  </div>
                </div>
              }
            >
              <DomesticStreamResults
                cards={domestic.cards}
                isStreaming={domestic.isStreaming}
                isFallingBack={domestic.isFallingBack}
                isComplete={domestic.isComplete}
                didFallback={domestic.didFallback}
                searchId={domestic.searchId}
                error={domestic.error}
                onRetry={handleRetry}
                onSelect={handleSelect}
                trip={tripContext}
              />
            </React.Suspense>
          ) : (
            <React.Suspense
              fallback={
                <div role="status" aria-live="polite" aria-busy="true" className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <p className="sr-only">Finding available flights — checking airlines…</p>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <FlightOfferSkeleton key={i} />
                  ))}
                </div>
              }
            >
              <FlightSearchResults offers={offers} isLoading={isSearching} error={error} onRetry={handleRetry} onSelect={handleSelect} trip={tripContext} />
            </React.Suspense>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-foreground">Ready to search</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Pick a trip type, fill in airports and dates above, then search to see live offers. Results stay shareable via URL.
            </p>
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{ context: "planning a flight search", channel: "whatsapp" }}
                  href={getSupportWhatsAppUrl("planning a flight search")}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              variant="ghost"
              size="sm"
              className="mt-3"
            >
              <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
              <span>Not sure where to start? Talk to Alphaa</span>
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 text-xs leading-relaxed text-muted-foreground">
        <h3 className="text-sm font-semibold text-foreground">Why prices are live</h3>
        <p className="mt-1">
          Fares are fetched live from the airline and already include Alphaa&apos;s markup. The total you see on each
          offer is in Naira. Domestic searches check airlines live and can take 30–60 seconds — results appear as
          they arrive with a search ref for support. If you select a flight, we re-check the live fare before
          traveller details — so you consent to any change.
        </p>
      </section>
    </div>
  );
}
