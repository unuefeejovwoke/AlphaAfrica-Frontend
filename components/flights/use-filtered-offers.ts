"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  filterOffers,
  hasActiveFilters,
  readFilterState,
  serializeFilterState,
  sortOffers,
  writeFilterState,
  type FlightFilters,
  type FlightSortKey,
} from "@/lib/api/flight-filters";
import type { FlightOfferDisplay } from "@/lib/api/flights";

export interface AirlineOption {
  name: string;
  count: number;
}

/**
 * Live filter/sort state over accumulated result cards (ticket 04).
 *
 * - Local state updates instantly (urgent); the expensive filter+sort over
 *   the card list rides `useDeferredValue` (vercel: rerender-use-deferred-value)
 *   and is memoized (vercel: rerender-memo), so rapid chip taps and cards
 *   arriving mid-stream never block input.
 * - Filter/sort state syncs to URL searchParams (safe primitives only) for
 *   back/refresh/share (story 30). Sync uses `replace` — no history growth,
 *   no scroll jump — and external URL changes (back/forward) are adopted.
 * - The auto-search needle in the page client excludes filter keys, so
 *   refining never triggers a backend refetch.
 */
export function useFilteredOffers(displays: FlightOfferDisplay[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramsString = searchParams.toString();

  // URL state recomputed only when the query string changes.
  const urlState = React.useMemo(
    () => readFilterState(new URLSearchParams(paramsString)),
    [paramsString],
  );
  const urlKey = serializeFilterState(urlState.filters, urlState.sort);

  // Local state is the urgent source of truth for instant chip feedback.
  const [filters, setFiltersState] = React.useState<FlightFilters>(() => urlState.filters);
  const [sort, setSortState] = React.useState<FlightSortKey>(() => urlState.sort);

  // Adopt external URL changes (back/forward navigation): render-phase
  // adjustment (vercel: rerender-derived-state-no-effect). Writes we make
  // ourselves serialize identically, so they are never re-adopted.
  const lastUrlKeyRef = React.useRef(urlKey);
  if (urlKey !== lastUrlKeyRef.current) {
    lastUrlKeyRef.current = urlKey;
    if (urlKey !== serializeFilterState(filters, sort)) {
      setFiltersState(urlState.filters);
      setSortState(urlState.sort);
    }
  }

  // Local → URL sync (non-urgent, in an effect, never during render).
  // Falls back to the bare pathname so clearing filters never leaves a
  // trailing "?" in a shareable URL.
  const localKey = serializeFilterState(filters, sort);
  React.useEffect(() => {
    if (localKey === urlKey) return;
    const next = writeFilterState(new URLSearchParams(paramsString), filters, sort);
    const query = next.toString();
    router.replace(query ? `?${query}` : pathname, { scroll: false });
  }, [localKey, urlKey, paramsString, filters, sort, router, pathname]);

  // Deferred triple: filter+sort recompute lags urgent chip taps (vercel:
  // rerender-use-deferred-value); reference compare detects staleness.
  const current = React.useMemo(
    () => ({ displays, filters, sort }),
    [displays, filters, sort],
  );
  const deferred = React.useDeferredValue(current);
  const isStale = deferred !== current;

  // Filter in one pass, then sort the survivors (vercel: js-combine-iterations).
  const visible = React.useMemo(
    () => sortOffers(filterOffers(deferred.displays, deferred.filters), deferred.sort),
    [deferred],
  );

  // Airline options with counts — Map for O(1) accumulation (vercel:
  // js-index-maps, js-set-map-lookups).
  const airlineOptions = React.useMemo<AirlineOption[]>(() => {
    const counts = new Map<string, number>();
    for (const display of displays) {
      counts.set(display.airline, (counts.get(display.airline) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [displays]);

  // Non-urgent list updates stay in transitions (vercel: rerender-transitions).
  const updateFilters = React.useCallback((patch: Partial<FlightFilters>) => {
    React.startTransition(() => {
      setFiltersState((prev) => ({ ...prev, ...patch }));
    });
  }, []);

  const changeSort = React.useCallback((next: FlightSortKey) => {
    React.startTransition(() => {
      setSortState(next);
    });
  }, []);

  const resetFilters = React.useCallback(() => {
    React.startTransition(() => {
      setFiltersState(DEFAULT_FILTERS);
      setSortState(DEFAULT_SORT);
    });
  }, []);

  return {
    filters,
    sort,
    updateFilters,
    changeSort,
    resetFilters,
    visible,
    isStale,
    isFiltering: hasActiveFilters(filters),
    totalCount: displays.length,
    airlineOptions,
  };
}

export type UseFilteredOffers = ReturnType<typeof useFilteredOffers>;
