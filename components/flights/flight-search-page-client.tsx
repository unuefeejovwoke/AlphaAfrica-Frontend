"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { FlightSearchForm, type FlightSearchFormValues } from "@/components/flights/flight-search-form";
import { FlightOfferSkeleton } from "@/components/flights/flight-offer-card";
import { Button } from "@/components/ui/button";
import { type Airport, type FlightOffer, type FlightOfferDisplay, type OneWayFlightSearchPayload, oneWayFlightSearchSchema, searchFlights } from "@/lib/api/flights";
import { ApiError, getHumanErrorMessage } from "@/lib/api/client";
import { track } from "@/lib/analytics";
import { getSupportWhatsAppUrl } from "@/lib/content/company";
import { toast } from "sonner";

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

const SELECTED_OFFER_SESSION_KEY = "alphaa:selected-flight-offer:v1";

function parseUrlState(searchParams: URLSearchParams): {
  values: Partial<FlightSearchFormValues>;
  originAirport: Airport | null;
  destinationAirport: Airport | null;
  isValid: boolean;
} {
  const origin = searchParams.get("origin")?.toUpperCase() ?? "";
  const destination = searchParams.get("destination")?.toUpperCase() ?? "";
  const departureDate = searchParams.get("departureDate") ?? "";
  const adults = Number(searchParams.get("adults") ?? "1");
  const children = Number(searchParams.get("children") ?? "0");
  const infants = Number(searchParams.get("infants") ?? "0");
  const cabin = (searchParams.get("cabin") as FlightSearchFormValues["cabin"]) ?? "ECONOMY";
  const non_stop = searchParams.get("non_stop") === "1" || searchParams.get("non_stop") === "true";
  const max_stops = searchParams.get("max_stops");

  // Light reconstruction of Airport objects for autocomplete display
  // We keep name/city empty so UI shows IATA; fetch will warm on focus
  const originAirport = /^[A-Z]{3}$/.test(origin) ? { iata_code: origin, name: origin, city: "", country_name: "", country_code: "" } as Airport : null;
  const destinationAirport = /^[A-Z]{3}$/.test(destination) ? { iata_code: destination, name: destination, city: "", country_name: "", country_code: "" } as Airport : null;

  const values: Partial<FlightSearchFormValues> = {
    origin: origin || undefined,
    destination: destination || undefined,
    departureDate: departureDate || undefined,
    adults: Number.isFinite(adults) ? adults : 1,
    children: Number.isFinite(children) ? children : 0,
    infants: Number.isFinite(infants) ? infants : 0,
    cabin: (["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] as const).includes(cabin as never) ? cabin : "ECONOMY",
    non_stop,
    max_stops: max_stops === null || max_stops === "" ? null : Number(max_stops),
  };

  // Never trust URL — validate before auto-searching
  if (!origin || !destination || !departureDate) {
    return { values, originAirport, destinationAirport, isValid: false };
  }
  const parsed = oneWayFlightSearchSchema.safeParse({
    origin,
    destination,
    departureDate,
    adults: values.adults,
    children: values.children,
    infants: values.infants,
    cabin: values.cabin,
    currency: "NGN",
    non_stop: values.non_stop,
    max_stops: values.max_stops,
    trip_type: "one_way",
  });
  return { values, originAirport, destinationAirport, isValid: parsed.success };
}

function toSearchParams(payload: OneWayFlightSearchPayload): string {
  const p = new URLSearchParams();
  p.set("origin", payload.origin);
  p.set("destination", payload.destination);
  p.set("departureDate", payload.departureDate);
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

  const { values: urlValues, originAirport: urlOrigin, destinationAirport: urlDest, isValid: hasValidUrlSearch } = React.useMemo(
    () => parseUrlState(new URLSearchParams(paramsString)),
    [paramsString],
  );

  // Deferred URL values for non-urgent hydration (vercel: rerender-use-deferred-value)
  const deferredUrlValues = React.useDeferredValue(urlValues);

  const [offers, setOffers] = React.useState<FlightOffer[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState<unknown | null>(null);
  const [hasSearched, setHasSearched] = React.useState(hasValidUrlSearch);

  // Auto-search when hydration or URL popstate yields a valid search
  const lastAutoSearchKey = React.useRef<string | null>(null);

  const doSearch = React.useCallback(async (payload: OneWayFlightSearchPayload) => {
    const key = `${payload.origin}-${payload.destination}-${payload.departureDate}-${payload.adults}-${payload.children}-${payload.infants}-${payload.cabin}`;
    // Allow explicit retry with same key — guard only prevents double-fire in same tick
    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    // Keep input responsive: mark results update as transition (vercel: rerender-transitions)
    React.startTransition(() => {
      setOffers([]);
    });
    try {
      track("flight_search_started", { trip_type: "one_way", cabin: payload.cabin });
      const data = await searchFlights(payload);
      setOffers(data);
      track("flight_search_completed", { trip_type: "one_way", results: String(data.length) });
    } catch (e) {
      const human = getHumanErrorMessage(e);
      setError(e instanceof ApiError ? e : new ApiError(human, { code: "unknown", status: null }));
      setOffers([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // On mount / URL change, auto-search if URL holds a valid search and we haven't yet
  React.useEffect(() => {
    if (!hasValidUrlSearch) return;
    const needle = paramsString;
    if (lastAutoSearchKey.current === needle) return;
    lastAutoSearchKey.current = needle;

    const parsed = oneWayFlightSearchSchema.safeParse({
      origin: urlValues.origin,
      destination: urlValues.destination,
      departureDate: urlValues.departureDate,
      adults: urlValues.adults,
      children: urlValues.children,
      infants: urlValues.infants,
      cabin: urlValues.cabin ?? "ECONOMY",
      currency: "NGN",
      non_stop: urlValues.non_stop ?? false,
      max_stops: urlValues.max_stops ?? null,
      trip_type: "one_way",
    });
    if (parsed.success) {
      void doSearch(parsed.data);
    }
  }, [hasValidUrlSearch, paramsString, urlValues, doSearch]);

  const handleSubmit = React.useCallback(
    (payload: OneWayFlightSearchPayload) => {
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
    const parsed = oneWayFlightSearchSchema.safeParse({
      origin: urlValues.origin,
      destination: urlValues.destination,
      departureDate: urlValues.departureDate,
      adults: urlValues.adults ?? 1,
      children: urlValues.children ?? 0,
      infants: urlValues.infants ?? 0,
      cabin: urlValues.cabin ?? "ECONOMY",
      currency: "NGN",
      non_stop: urlValues.non_stop ?? false,
      max_stops: urlValues.max_stops ?? null,
      trip_type: "one_way",
    });
    if (parsed.success) {
      void doSearch(parsed.data);
    } else {
      // No valid URL to retry — scroll to form
      document.getElementById("flight-search-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [urlValues, doSearch]);

  const handleSelect = React.useCallback((display: FlightOfferDisplay) => {
    // Keep opaque blob in memory + sessionStorage backup, never in URL/analytics
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(SELECTED_OFFER_SESSION_KEY, JSON.stringify(display.raw));
      }
    } catch {
      // ignore
    }
    toast.success(`Selected ${display.airline} ${display.airportsLabel} — confirming live fare…`);
    // In full flow this would push to price confirmation; for ticket 01 we toast and track
    // Navigation placeholder: future phase will route to /flights/confirm or similar
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex max-w-3xl flex-col gap-3">
        <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Flights · One-way</span>
        <h1 className="text-4xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">Search one-way flights</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Choose two airports with autocomplete, pick a future date and party, and compare live offers with airline, timing, stops,
          duration, and total price in Naira. No account needed — you&apos;ll confirm the live fare before paying.
        </p>
      </header>

      <div id="flight-search-form">
        <FlightSearchForm
          defaultValues={deferredUrlValues}
          defaultOriginAirport={urlOrigin}
          defaultDestinationAirport={urlDest}
          onSubmit={handleSubmit}
          isSearching={isSearching}
        />
      </div>

      {/* Results */}
      <section aria-labelledby="flight-results-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="flight-results-heading" className="text-lg font-bold text-foreground">
            Flight offers
          </h2>
          <Button
            render={<a href={getSupportWhatsAppUrl("choosing a one-way flight")} target="_blank" rel="noopener noreferrer" />}
            variant="ghost"
            size="sm"
          >
            <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </Button>
        </div>

        {hasSearched ? (
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
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-foreground">Ready to search</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Fill in origin, destination, and departure date above, then search to see live offers. Results stay shareable via URL.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 text-xs leading-relaxed text-muted-foreground">
        <h3 className="text-sm font-semibold text-foreground">Why prices are live</h3>
        <p className="mt-1">
          International fares are fetched live from the airline and already include Alphaa&apos;s markup. The total you see on each offer
          is in Naira. If you select a flight, we re-check the live fare before traveller details — so you consent to any change.
        </p>
      </section>
    </div>
  );
}
