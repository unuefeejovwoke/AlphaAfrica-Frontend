"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { FlightSearchForm } from "@/components/flights/flight-search-form";
import { FlightOfferSkeleton } from "@/components/flights/flight-offer-card";
import { Button } from "@/components/ui/button";
import {
  type Airport,
  type Cabin,
  type FlightOffer,
  type FlightOfferDisplay,
  type FlightSearchFormValues,
  type FlightSearchPayload,
  tripTypeSchema,
  saveSelectedOffer,
  searchFlights,
} from "@/lib/api/flights";
import { ApiError, getHumanErrorMessage } from "@/lib/api/client";
import { track } from "@/lib/analytics";
import { getSupportWhatsAppUrl } from "@/lib/content/company";
import { isDomesticSearch, type DomesticSearchParams } from "@/lib/api/domestic";
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
        <p className="text-xs font-medium text-muted-foreground">
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

const VALID_CABINS = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] as const;
const VALID_TRIP_TYPES = ["one_way", "round_trip", "multi_city"] as const;
type TripType = (typeof VALID_TRIP_TYPES)[number];

interface ParsedLeg {
  origin: string;
  destination: string;
  date: string;
}

/**
 * Single shared parser for URL → validated payload.
 * Delegates to the tripTypeSchema discriminated union so URL hydration
 * enforces exactly the same rules as the form (return≥departure,
 * chronological multi-city chain, 2–6 legs).
 */
function parseSearchPayload(candidate: {
  trip_type?: unknown;
  origin?: unknown;
  destination?: unknown;
  departureDate?: unknown;
  returnDate?: unknown;
  legs?: unknown;
  adults?: unknown;
  children?: unknown;
  infants?: unknown;
  cabin?: unknown;
  non_stop?: unknown;
  max_stops?: unknown;
}) {
  const trip_type: TripType =
    candidate.trip_type === "round_trip" || candidate.trip_type === "multi_city"
      ? candidate.trip_type
      : "one_way";
  return tripTypeSchema.safeParse({
    trip_type,
    origin: typeof candidate.origin === "string" ? candidate.origin.toUpperCase() : candidate.origin,
    destination:
      typeof candidate.destination === "string" ? candidate.destination.toUpperCase() : candidate.destination,
    departureDate: candidate.departureDate,
    returnDate: candidate.returnDate,
    legs: Array.isArray(candidate.legs)
      ? candidate.legs.map((leg) => {
          if (typeof leg !== "object" || leg === null) return leg;
          const l = leg as Record<string, unknown>;
          return {
            ...l,
            origin: typeof l.origin === "string" ? l.origin.toUpperCase() : l.origin,
            destination:
              typeof l.destination === "string" ? l.destination.toUpperCase() : l.destination,
          };
        })
      : candidate.legs,
    adults: candidate.adults,
    children: candidate.children,
    infants: candidate.infants,
    cabin: candidate.cabin,
    currency: "NGN",
    non_stop: candidate.non_stop,
    max_stops: candidate.max_stops,
  });
}

/** Multi-city legs ride in one `legs` query param as JSON (opaque blob never in URL). */
function parseLegsParam(raw: string | null): ParsedLeg[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    const legs: ParsedLeg[] = [];
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue;
      const l = item as Record<string, unknown>;
      if (typeof l.origin !== "string" || typeof l.destination !== "string" || typeof l.date !== "string") {
        continue;
      }
      legs.push({ origin: l.origin.toUpperCase(), destination: l.destination.toUpperCase(), date: l.date });
    }
    return legs.length >= 2 ? legs : undefined;
  } catch {
    return undefined;
  }
}

function lightAirport(iata: string): Airport | null {
  return /^[A-Z]{3}$/.test(iata)
    ? ({ iata_code: iata, name: iata, city: "", country_name: "", country_code: "" } as Airport)
    : null;
}

function parseUrlState(searchParams: URLSearchParams): {
  values: Partial<FlightSearchFormValues>;
  originAirport: Airport | null;
  destinationAirport: Airport | null;
  legAirports: { origin: Airport | null; destination: Airport | null }[];
  isValid: boolean;
} {
  const tripRaw = searchParams.get("trip_type") ?? "one_way";
  const trip_type: TripType = (VALID_TRIP_TYPES as readonly string[]).includes(tripRaw)
    ? (tripRaw as TripType)
    : "one_way";
  const origin = searchParams.get("origin")?.toUpperCase() ?? "";
  const destination = searchParams.get("destination")?.toUpperCase() ?? "";
  const departureDate = searchParams.get("departureDate") ?? "";
  const returnDate = searchParams.get("returnDate") ?? "";
  const legs = parseLegsParam(searchParams.get("legs"));
  const adultsRaw = Number(searchParams.get("adults") ?? "1");
  const childrenRaw = Number(searchParams.get("children") ?? "0");
  const infantsRaw = Number(searchParams.get("infants") ?? "0");
  const cabinRaw = searchParams.get("cabin") ?? "ECONOMY";
  const non_stop = searchParams.get("non_stop") === "1" || searchParams.get("non_stop") === "true";
  const maxStopsRaw = searchParams.get("max_stops");

  const adults = Number.isFinite(adultsRaw) ? adultsRaw : 1;
  const children = Number.isFinite(childrenRaw) ? childrenRaw : 0;
  const infants = Number.isFinite(infantsRaw) ? infantsRaw : 0;
  const cabin: Cabin = (VALID_CABINS as readonly string[]).includes(cabinRaw) ? (cabinRaw as Cabin) : "ECONOMY";
  const max_stops = maxStopsRaw === null || maxStopsRaw === "" ? null : Number(maxStopsRaw);

  // URL hydration vs autocomplete guard (spec §52 + story 30):
  // Manual entry must pick via autocomplete (form enforces selectedAirport match).
  // Shared/back/refresh URLs carry IATA-only state — Zod + backend remain the
  // authority for unknown codes. We hydrate a light Airport so the form shows
  // the IATA and can submit without re-typing; city/name warm on next focus.
  const originAirport = lightAirport(origin);
  const destinationAirport = lightAirport(destination);
  const legAirports = (legs ?? []).map((leg) => ({
    origin: lightAirport(leg.origin),
    destination: lightAirport(leg.destination),
  }));

  const values: Partial<FlightSearchFormValues> = {
    trip_type,
    origin: origin || undefined,
    destination: destination || undefined,
    departureDate: departureDate || undefined,
    returnDate: returnDate || undefined,
    legs,
    adults,
    children,
    infants,
    cabin,
    non_stop,
    max_stops,
  };

  // Never trust URL — validate before auto-searching
  const hasRequired =
    trip_type === "multi_city"
      ? (legs?.length ?? 0) >= 2
      : trip_type === "round_trip"
        ? Boolean(origin && destination && departureDate && returnDate)
        : Boolean(origin && destination && departureDate);
  if (!hasRequired) {
    return { values, originAirport, destinationAirport, legAirports, isValid: false };
  }
  const parsed = parseSearchPayload({
    trip_type,
    origin,
    destination,
    departureDate,
    returnDate,
    legs,
    adults,
    children,
    infants,
    cabin,
    non_stop,
    max_stops,
  });
  return { values, originAirport, destinationAirport, legAirports, isValid: parsed.success };
}

function toSearchParams(payload: FlightSearchPayload): string {
  const p = new URLSearchParams();
  p.set("trip_type", payload.trip_type);
  if (payload.trip_type === "multi_city") {
    p.set(
      "legs",
      JSON.stringify(
        payload.legs.map((leg) => ({ origin: leg.origin, destination: leg.destination, date: leg.date })),
      ),
    );
  } else {
    p.set("origin", payload.origin);
    p.set("destination", payload.destination);
    p.set("departureDate", payload.departureDate);
    if (payload.trip_type === "round_trip") {
      p.set("returnDate", payload.returnDate);
    }
  }
  p.set("adults", String(payload.adults));
  p.set("children", String(payload.children));
  p.set("infants", String(payload.infants));
  p.set("cabin", payload.cabin);
  if (payload.non_stop) p.set("non_stop", "1");
  if (payload.max_stops !== null && payload.max_stops !== undefined) p.set("max_stops", String(payload.max_stops));
  // Never put opaque blobs, tokens, or PII in URL — only safe search state
  return p.toString();
}

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
  } = React.useMemo(() => parseUrlState(new URLSearchParams(paramsString)), [paramsString]);

  // Deferred URL values for non-urgent hydration (vercel: rerender-use-deferred-value)
  const deferredUrlValues = React.useDeferredValue(urlValues);

  const [offers, setOffers] = React.useState<FlightOffer[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState<unknown | null>(null);
  const [hasSearched, setHasSearched] = React.useState(hasValidUrlSearch);
  const lastTripTypeRef = React.useRef<TripType>("one_way");
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
        });
        const data = await searchFlights(payload);
        setOffers(data);
        track("flight_search_completed", {
          trip_type: payload.trip_type,
          results: String(data.length),
          route: "international",
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
    });
  }, [domestic.isComplete, domestic.isStreaming, domestic.isFallingBack, domestic.cards.length, domestic.didFallback, searchMode]);

  // On mount / URL change, auto-search if URL holds a valid search and we haven't yet
  React.useEffect(() => {
    if (!hasValidUrlSearch) return;
    const needle = paramsString;
    if (lastAutoSearchKey.current === needle) return;
    lastAutoSearchKey.current = needle;

    const parsed = parseSearchPayload({
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
  }, [hasValidUrlSearch, paramsString, urlValues, doSearch]);

  const handleSubmit = React.useCallback(
    (payload: FlightSearchPayload) => {
      // Preserve search state in URL for back/refresh/share
      const nextQuery = toSearchParams(payload);
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
    const parsed = parseSearchPayload({
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
      track("flight_selected", { trip_type: lastTripTypeRef.current, cabin: display.cabin });
      router.push("/flights/confirm");
    },
    [router],
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
            render={<a href={getSupportWhatsAppUrl("choosing a flight")} target="_blank" rel="noopener noreferrer" />}
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
              />
            </React.Suspense>
          ) : (
            <React.Suspense
              fallback={
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <FlightOfferSkeleton key={i} />
                  ))}
                </div>
              }
            >
              <FlightSearchResults offers={offers} isLoading={isSearching} error={error} onRetry={handleRetry} onSelect={handleSelect} />
            </React.Suspense>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-foreground">Ready to search</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Pick a trip type, fill in airports and dates above, then search to see live offers. Results stay shareable via URL.
            </p>
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
