"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Message01Icon,
  Airplane01Icon,
  SecurityCheckIcon,
  Tick01Icon,
  InformationCircleIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"
import { FlightSearchForm } from "@/components/flights/flight-search-form"
import { FlightOfferSkeleton } from "@/components/flights/flight-offer-card"
import { Button } from "@/components/ui/button"
import { TrackLink } from "@/components/analytics/track-link"
import {
  type Airport,
  type FlightOffer,
  type FlightOfferDisplay,
  type FlightSearchPayload,
  type FlightTripContext,
  fetchAirportByIata,
  getFlightSupportWhatsAppUrl,
  saveSelectedOffer,
  saveSelectedParty,
  clearSelectedOffer,
  searchFlights,
} from "@/lib/api/flights"
import {
  buildFlightSearchQuery,
  type FlightTripType,
  parseFlightSearchPayload,
  parseFlightSearchUrl,
} from "@/lib/api/flight-search-url"
import { ApiError, getHumanErrorMessage } from "@/lib/api/client"
import { track } from "@/lib/analytics"
import { getSupportWhatsAppUrl } from "@/lib/content/company"
import { isDomesticSearch, type DomesticSearchParams, saveSelectedDomesticCard, clearSelectedDomesticCard, resolveBookingBranch } from "@/lib/api/domestic"
import { FILTER_PARAM_KEYS, parseNairaAmount } from "@/lib/api/flight-filters"
import { useDomesticStream } from "@/components/flights/use-domestic-stream"
import { FlightJourneyHeader } from "@/components/flights/flight-journey-header"
import { NearbyDatesBar } from "@/components/flights/nearby-dates-bar"

// Heavy result component — dynamic import for bundle size (vercel: bundle-dynamic-imports)
const FlightSearchResults = dynamic(
  () =>
    import("@/components/flights/flight-search-results").then(
      (m) => m.FlightSearchResults
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <FlightOfferSkeleton key={i} />
        ))}
      </div>
    ),
  }
)

// Domestic streaming results — dynamic import so the SSE reader + card list
// never bloat the international first paint (vercel: bundle-dynamic-imports).
const DomesticStreamResults = dynamic(
  () =>
    import("@/components/flights/domestic-stream-results").then(
      (m) => m.DomesticStreamResults
    ),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex flex-col gap-4"
      >
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
  }
)

export function FlightSearchPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramsString = searchParams.toString()

  const {
    values: urlValues,
    originAirport: urlOrigin,
    destinationAirport: urlDest,
    legAirports: urlLegAirports,
    isValid: hasValidUrlSearch,
  } = React.useMemo(
    () => parseFlightSearchUrl(new URLSearchParams(paramsString)),
    [paramsString]
  )

  // Auto-search needle strips filter/sort keys: refining results updates the
  // URL (back/refresh/share) but must never retrigger a backend search.
  // A fresh submit carries search-only params, so local filter state resets
  // through URL adoption in useFilteredOffers.
  const searchNeedle = React.useMemo(() => {
    const stripped = new URLSearchParams(paramsString)
    for (const key of FILTER_PARAM_KEYS) stripped.delete(key)
    return stripped.toString()
  }, [paramsString])

  // Shared-link hydration: light IATA airports enrich to full city + name
  // via the airport lookup with graceful fallback to the bare code. Display
  // only — validation still gates on IATA, so a failed lookup never blocks
  // search. Run-guarded so a superseded URL never commits stale names.
  const [hydratedOrigin, setHydratedOrigin] =
    React.useState<Airport | null>(urlOrigin)
  const [hydratedDest, setHydratedDest] =
    React.useState<Airport | null>(urlDest)
  const [hydratedLegs, setHydratedLegs] =
    React.useState<{ origin: Airport | null; destination: Airport | null }[]>(
      urlLegAirports
    )
  const enrichRunRef = React.useRef(0)
  const enrichAbortRef = React.useRef<AbortController | null>(null)
  const enrichKey = React.useMemo(() => {
    const legs = (urlLegAirports ?? [])
      .map((l) => `${l.origin?.iata_code ?? ""}:${l.destination?.iata_code ?? ""}`)
      .join("|")
    return `${urlOrigin?.iata_code ?? ""}:${urlDest?.iata_code ?? ""}:${legs}`
  }, [urlOrigin?.iata_code, urlDest?.iata_code, urlLegAirports])

  React.useEffect(() => {
    // Reset to light immediately so a new URL never shows the old names.
    setHydratedOrigin(urlOrigin)
    setHydratedDest(urlDest)
    setHydratedLegs(urlLegAirports)
    enrichAbortRef.current?.abort()
    const runId = enrichRunRef.current + 1
    enrichRunRef.current = runId
    const controller = new AbortController()
    enrichAbortRef.current = controller
    const { signal } = controller
    const needsEnrich = (a: Airport | null) =>
      a !== null && (!a.city || !a.name || a.name === a.iata_code)
    const targets: { iata: string }[] = []
    if (needsEnrich(urlOrigin) && urlOrigin) targets.push({ iata: urlOrigin.iata_code })
    if (needsEnrich(urlDest) && urlDest) targets.push({ iata: urlDest.iata_code })
    for (const leg of urlLegAirports ?? []) {
      if (needsEnrich(leg.origin) && leg.origin) targets.push({ iata: leg.origin.iata_code })
      if (needsEnrich(leg.destination) && leg.destination)
        targets.push({ iata: leg.destination.iata_code })
    }
    if (targets.length === 0) return
    void (async () => {
      try {
        const unique = [...new Set(targets.map((t) => t.iata))]
        const resolved = await Promise.all(
          unique.map(async (iata) => {
            try {
              const full = await fetchAirportByIata(iata, { signal })
              return [iata, full] as const
            } catch {
              return [iata, null] as const
            }
          })
        )
        if (runId !== enrichRunRef.current || signal.aborted) return
        const byIata = new Map(resolved)
        if (urlOrigin && byIata.get(urlOrigin.iata_code)) {
          setHydratedOrigin(byIata.get(urlOrigin.iata_code) ?? urlOrigin)
        }
        if (urlDest && byIata.get(urlDest.iata_code)) {
          setHydratedDest(byIata.get(urlDest.iata_code) ?? urlDest)
        }
        if ((urlLegAirports ?? []).length > 0) {
          setHydratedLegs(
            (urlLegAirports ?? []).map((leg) => ({
              origin:
                (leg.origin && byIata.get(leg.origin.iata_code)) ?? leg.origin,
              destination:
                (leg.destination && byIata.get(leg.destination.iata_code)) ??
                leg.destination,
            }))
          )
        }
      } catch {
        // Graceful fallback — light IATA airports stay on screen.
      }
    })()
    return () => {
      controller.abort()
    }
    // Enrich only when the IATA identity changes — never on object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichKey])

  // Deferred URL values for non-urgent hydration (vercel: rerender-use-deferred-value)
  const deferredUrlValues = React.useDeferredValue(urlValues)

  // Trip context for support hatches — route, dates, party from the URL
  // search state, so specialists see what the customer searched.
  const tripContext = React.useMemo<FlightTripContext>(() => {
    const values = urlValues as Record<string, unknown>
    const legs = Array.isArray(values.legs)
      ? (values.legs as Record<string, unknown>[])
      : []
    const firstLeg = legs.length > 0 ? legs[0] : null
    const text = (value: unknown) =>
      typeof value === "string" && value ? value : null
    const count = (value: unknown) =>
      typeof value === "number" && value > 0 ? value : null
    return {
      origin: text(values.origin) ?? (firstLeg ? text(firstLeg.origin) : null),
      destination:
        text(values.destination) ??
        (firstLeg ? text(firstLeg.destination) : null),
      departureDate:
        text(values.departureDate) ?? (firstLeg ? text(firstLeg.date) : null),
      returnDate: text(values.returnDate),
      adults: count(values.adults),
      children: count(values.children),
      infants: count(values.infants),
    }
  }, [urlValues])

  const [offers, setOffers] = React.useState<FlightOffer[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [error, setError] = React.useState<unknown | null>(null)
  const [hasSearched, setHasSearched] = React.useState(hasValidUrlSearch)
  const lastTripTypeRef = React.useRef<FlightTripType>("one_way")
  const lastLegCountRef = React.useRef<number>(1)
  // Auto-detected journey: both-Nigerian one-way/round-trip → domestic SSE,
  // otherwise the international Amadeus legs path. No manual toggle in v1
  // (ADR-0004); multi-city always uses the international path since the SSE
  // endpoint expresses a single route. URL criteria stay the single source.
  const [searchMode, setSearchMode] = React.useState<
    "domestic" | "international" | null
  >(() => {
    try {
      if (!hasValidUrlSearch) return null
      const t = urlValues.trip_type ?? "one_way"
      if (t === "multi_city") return "international"
      const o = typeof urlValues.origin === "string" ? urlValues.origin : ""
      const d =
        typeof urlValues.destination === "string" ? urlValues.destination : ""
      if (o && d && isDomesticSearch(o, d)) return "domestic"
      return "international"
    } catch {
      return null
    }
  })
  const domestic = useDomesticStream()
  const domesticStart = domestic.start
  const domesticAbort = domestic.abort

  // International request lifecycle: abort + run-guard so rapid re-search
  // never lets an older response overwrite a newer one. Unmount cancels
  // in-flight work via the cleanup below.
  const searchRunRef = React.useRef(0)
  const searchAbortRef = React.useRef<AbortController | null>(null)
  React.useEffect(() => {
    return () => {
      searchRunRef.current += 1
      searchAbortRef.current?.abort()
      searchAbortRef.current = null
      enrichAbortRef.current?.abort()
    }
  }, [])

  // Collapsible form: after a search runs, the long form collapses into a
  // sticky itinerary summary with an Edit action. Declared before doSearch
  // so the search itself collapses the form.
  const [formExpanded, setFormExpanded] = React.useState(true)
  const formSectionRef = React.useRef<HTMLDivElement | null>(null)
  // Ref-based scroll that honors reduced motion (never smooth-scrolls users
  // who asked for less motion).
  const scrollToForm = React.useCallback(() => {
    requestAnimationFrame(() => {
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      formSectionRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      })
    })
  }, [])
  const expandForm = React.useCallback(() => {
    setFormExpanded(true)
    scrollToForm()
  }, [scrollToForm])

  // Auto-search when hydration or URL popstate yields a valid search
  const lastAutoSearchKey = React.useRef<string | null>(null)

  const doSearch = React.useCallback(
    async (payload: FlightSearchPayload) => {
      lastTripTypeRef.current = payload.trip_type
      lastLegCountRef.current =
        payload.trip_type === "multi_city"
          ? payload.legs.length
          : payload.trip_type === "round_trip"
            ? 2
            : 1
      setHasSearched(true)
      // After a search runs, the full form collapses into the sticky
      // itinerary summary; Edit re-expands it.
      setFormExpanded(false)

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
            : null

      if (domesticParams) {
        // Cancel any in-flight international request before switching modes.
        searchRunRef.current += 1
        searchAbortRef.current?.abort()
        searchAbortRef.current = null
        setSearchMode("domestic")
        setError(null)
        // Abandon the international spinner if a slow request was in flight.
        setIsSearching(false)
        React.startTransition(() => {
          setOffers([])
        })
        track("flight_search_started", {
          trip_type: payload.trip_type,
          cabin: payload.cabin,
          route: "domestic",
          leg_count: String(lastLegCountRef.current),
        })
        await domesticStart(domesticParams)
        return
      }

      // International legs path — abort any in-flight domestic stream so
      // stale SSE chunks never commit after the mode switch, plus abort any
      // prior international request so only the latest results stay on screen.
      domesticAbort()
      searchAbortRef.current?.abort()
      const runId = searchRunRef.current + 1
      searchRunRef.current = runId
      const controller = new AbortController()
      searchAbortRef.current = controller
      setSearchMode("international")
      setIsSearching(true)
      setError(null)
      // Keep input responsive: mark results update as transition (vercel: rerender-transitions)
      React.startTransition(() => {
        setOffers([])
      })
      try {
        // One search request for the whole itinerary — never one fetch per leg.
        // The bounded max_offers rides inside toFlightSearchRequest.
        track("flight_search_started", {
          trip_type: payload.trip_type,
          cabin: payload.cabin,
          route: "international",
          leg_count: String(lastLegCountRef.current),
        })
        const data = await searchFlights(payload, {
          signal: controller.signal,
        })
        if (runId !== searchRunRef.current || controller.signal.aborted) return
        setOffers(data)
        track("flight_search_completed", {
          trip_type: payload.trip_type,
          results: String(data.length),
          route: "international",
          leg_count: String(lastLegCountRef.current),
        })
      } catch (e) {
        if (runId !== searchRunRef.current || controller.signal.aborted) return
        if (
          (e instanceof DOMException && e.name === "AbortError") ||
          (e instanceof Error && e.name === "AbortError")
        ) {
          return
        }
        const human = getHumanErrorMessage(e)
        setError(
          e instanceof ApiError
            ? e
            : new ApiError(human, { code: "unknown", status: null })
        )
        setOffers([])
      } finally {
        if (runId === searchRunRef.current && !controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    },
    [domesticStart, domesticAbort]
  )

  // Domestic completion analytics — the hook resolves async after doSearch
  // returns, so completion is tracked here (search_id stays out of analytics).
  const domesticCompletedTrackedRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!domestic.isComplete || domestic.isStreaming || domestic.isFallingBack)
      return
    const key = `${domestic.cards.length}:${domestic.didFallback ? "fb" : "sse"}:${searchMode}`
    if (domesticCompletedTrackedRef.current === key) return
    domesticCompletedTrackedRef.current = key
    track("flight_search_completed", {
      trip_type: lastTripTypeRef.current,
      results: String(domestic.cards.length),
      route: "domestic",
      leg_count: String(lastLegCountRef.current),
    })
  }, [
    domestic.isComplete,
    domestic.isStreaming,
    domestic.isFallingBack,
    domestic.cards.length,
    domestic.didFallback,
    searchMode,
  ])

  // On mount / URL change, auto-search if URL holds a valid search and we haven't yet
  React.useEffect(() => {
    if (!hasValidUrlSearch) return
    const needle = searchNeedle
    if (lastAutoSearchKey.current === needle) return
    lastAutoSearchKey.current = needle

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
    })
    if (parsed.success) {
      void doSearch(parsed.data)
    }
  }, [hasValidUrlSearch, searchNeedle, urlValues, doSearch])

  const handleSubmit = React.useCallback(
    (payload: FlightSearchPayload) => {
      // Preserve search state in URL for back/refresh/share
      const nextQuery = buildFlightSearchQuery(payload)
      const currentQuery = searchParams.toString()
      if (nextQuery !== currentQuery) {
        router.push(`?${nextQuery}`, { scroll: false })
      }
      // Always run search even if URL unchanged (supports retry without navigation)
      void doSearch(payload)
    },
    [router, searchParams, doSearch]
  )

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
    })
    if (parsed.success) {
      void doSearch(parsed.data)
    } else {
      // No valid URL to retry — scroll to form
      scrollToForm()
    }
  }, [urlValues, doSearch, scrollToForm])

  const handleSelect = React.useCallback(
    (display: FlightOfferDisplay) => {
      // Party travels with the selection so Traveller entry opens the exact
      // slot count — the opaque blob carries no party. Safe counts only.
      const values = urlValues as Record<string, unknown>
      const party = {
        adults:
          typeof values.adults === "number" && values.adults >= 1
            ? values.adults
            : 1,
        children:
          typeof values.children === "number" && values.children >= 0
            ? values.children
            : 0,
        infants:
          typeof values.infants === "number" && values.infants >= 0
            ? values.infants
            : 0,
      }
      // Domestic cards take an explicit domestic branch — never submit card
      // fields as an opaque Amadeus blob. The fare-confirmation step reads
      // the domestic session key first and skips Amadeus revalidation.
      // Each branch clears the other so a back-then-reselect never shadows
      // the fresh selection with a stale card.
      const raw = display.raw as unknown
      if (resolveBookingBranch(searchMode, raw) === "domestic") {
        clearSelectedOffer()
        saveSelectedDomesticCard(
          (typeof raw === "object" && raw !== null
            ? (raw as Record<string, unknown>)
            : {}) as never
        )
        saveSelectedParty(party)
        track("flight_selected", {
          trip_type: lastTripTypeRef.current,
          cabin: display.cabin,
          route: "domestic",
          leg_count: String(lastLegCountRef.current),
        })
        router.push("/flights/confirm")
        return
      }
      // Keep the opaque blob in memory + sessionStorage backup, never in
      // URL/analytics, then enter the dedicated fare-confirmation step
      // (ticket 05) inside the distraction-free checkout shell.
      clearSelectedDomesticCard()
      saveSelectedOffer(display.raw)
      saveSelectedParty(party)
      track("flight_selected", {
        trip_type: lastTripTypeRef.current,
        cabin: display.cabin,
        route: searchMode ?? "international",
        leg_count: String(lastLegCountRef.current),
      })
      router.push("/flights/confirm")
    },
    [router, searchMode, urlValues]
  )

  const handleCancelDomestic = React.useCallback(() => {
    // Cancel stops streaming or fallback promptly; the run-guard drops any
    // late commits so no stale cards appear after cancel.
    domesticAbort()
  }, [domesticAbort])

  const formBusy = isSearching || domestic.isStreaming || domestic.isFallingBack

  const summary = React.useMemo(() => {
    const values = urlValues as Record<string, unknown>
    const text = (value: unknown) =>
      typeof value === "string" && value ? value : null
    const trip = (values.trip_type as string) ?? "one_way"
    const adults = typeof values.adults === "number" ? values.adults : 1
    const children = typeof values.children === "number" ? values.children : 0
    const infants = typeof values.infants === "number" ? values.infants : 0
    const total = adults + children + infants
    const partyLabel =
      total === 1 && adults === 1
        ? "1 adult"
        : `${total} travellers (${adults}A${children ? ` ${children}C` : ""}${infants ? ` ${infants}I` : ""})`
    const cabinLabel = text(values.cabin) ?? "ECONOMY"
    if (trip === "multi_city" && Array.isArray(values.legs)) {
      const legs = values.legs as Record<string, unknown>[]
      const first = legs[0]
      const last = legs[legs.length - 1]
      const dates = [text(first?.date), text(last?.date)]
        .filter(Boolean)
        .join(" → ")
      return {
        route: `Multi-city · ${legs.length} legs`,
        dates: dates || null,
        party: partyLabel,
        cabin: cabinLabel,
      }
    }
    const origin = text(values.origin)
    const destination = text(values.destination)
    const departure = text(values.departureDate)
    const ret = text(values.returnDate)
    return {
      route:
        origin && destination
          ? `${origin} → ${destination}${trip === "round_trip" ? " · Return" : ""}`
          : null,
      dates: [departure, trip === "round_trip" ? ret : null]
        .filter(Boolean)
        .join(" → ") || null,
      party: partyLabel,
      cabin: cabinLabel,
    }
  }, [urlValues])

  const lowestPrice = React.useMemo(() => {
    if (offers.length === 0 && domestic.cards.length === 0) return null
    const allPrices: number[] = []
    for (const o of offers) {
      const raw = (o as Record<string, unknown>).price
      if (typeof raw === "string" || typeof raw === "number") {
        const val = parseNairaAmount(String(raw))
        if (val) allPrices.push(val)
      } else if (typeof raw === "object" && raw !== null) {
        const total = (raw as Record<string, unknown>).total
        if (typeof total === "string" || typeof total === "number") {
          const val = parseNairaAmount(String(total))
          if (val) allPrices.push(val)
        }
      }
    }
    for (const c of domestic.cards) {
      if (c.price) {
        const val = parseNairaAmount(String(c.price))
        if (val) allPrices.push(val)
      }
    }
    return allPrices.length > 0 ? Math.min(...allPrices) : null
  }, [offers, domestic.cards])

  const handleDateChange = React.useCallback(
    (nextDate: string) => {
      const currentValues = urlValues as Record<string, unknown>
      const trip = (currentValues.trip_type as FlightTripType) || "one_way"
      const parsed = parseFlightSearchPayload({
        trip_type: trip,
        origin: typeof currentValues.origin === "string" ? currentValues.origin : "",
        destination: typeof currentValues.destination === "string" ? currentValues.destination : "",
        departureDate: nextDate,
        returnDate: typeof currentValues.returnDate === "string" ? currentValues.returnDate : undefined,
        legs: Array.isArray(currentValues.legs) ? (currentValues.legs as never) : [],
        adults: typeof currentValues.adults === "number" ? currentValues.adults : 1,
        children: typeof currentValues.children === "number" ? currentValues.children : 0,
        infants: typeof currentValues.infants === "number" ? currentValues.infants : 0,
        cabin: typeof currentValues.cabin === "string" ? (currentValues.cabin as never) : "ECONOMY",
        non_stop: typeof currentValues.non_stop === "boolean" ? currentValues.non_stop : false,
        max_stops: typeof currentValues.max_stops === "number" ? currentValues.max_stops : null,
      })
      if (parsed.success) {
        handleSubmit(parsed.data)
      }
    },
    [urlValues, handleSubmit]
  )

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <FlightJourneyHeader current={hasSearched ? 2 : 1} />

      <div id="flight-search-form" ref={formSectionRef} className="flex flex-col gap-3">
        {hasSearched ? (
          <>
            {/* Sleek Route Summary Bar using website brand color (Brand Plum #571563, NO gradients) */}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-secondary bg-secondary p-4 text-secondary-foreground shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-base font-black tracking-tight text-white sm:text-lg">
                  {summary.route || "Flight Search"}
                </span>
                <span className="text-xs font-medium text-purple-100 sm:text-sm">
                  {[summary.dates, summary.party, summary.cabin].filter(Boolean).join(" · ")}
                </span>
                {searchMode ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white uppercase">
                    <span
                      aria-hidden="true"
                      className={
                        searchMode === "domestic"
                          ? "size-1.5 animate-pulse rounded-full bg-emerald-400"
                          : "size-1.5 rounded-full bg-sky-300"
                      }
                    />
                    <span>
                      {searchMode === "domestic"
                        ? "Domestic · Live"
                        : "International · Instant"}
                    </span>
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setFormExpanded(!formExpanded)}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 active:scale-[0.98] sm:text-sm"
              >
                {formExpanded ? (
                  <>
                    <HugeiconsIcon icon={Cancel01Icon} size={15} aria-hidden="true" />
                    <span>Close</span>
                  </>
                ) : (
                  <span>Modify</span>
                )}
              </button>
            </div>

            {/* In-place Modification Panel when user clicks Modify */}
            {formExpanded ? (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Modify your flight search
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Update routes, travel dates, passenger party, or cabin class
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormExpanded(false)}
                    aria-label="Close modification"
                    className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden="true" />
                  </button>
                </div>
                <FlightSearchForm
                  defaultValues={deferredUrlValues}
                  defaultOriginAirport={hydratedOrigin}
                  defaultDestinationAirport={hydratedDest}
                  defaultLegAirports={hydratedLegs}
                  onSubmit={(payload) => {
                    handleSubmit(payload)
                    setFormExpanded(false)
                  }}
                  onCancel={() => setFormExpanded(false)}
                  isSearching={formBusy}
                />
              </div>
            ) : (
              /* Nearby Dates Bar */
              <NearbyDatesBar
                currentDate={typeof urlValues.departureDate === "string" ? urlValues.departureDate : null}
                lowestPrice={lowestPrice}
                onSelectDate={handleDateChange}
              />
            )}
          </>
        ) : (
          /* Initial search state (no search executed yet) */
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6">
            <FlightSearchForm
              defaultValues={deferredUrlValues}
              defaultOriginAirport={hydratedOrigin}
              defaultDestinationAirport={hydratedDest}
              defaultLegAirports={hydratedLegs}
              onSubmit={handleSubmit}
              isSearching={formBusy}
            />
          </div>
        )}
      </div>

      {/* Results */}
      <section
        aria-labelledby="flight-results-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="flight-results-heading" className="sr-only">
          {searchMode === "domestic" ? "Domestic flights" : "Flight offers"}
        </h2>

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
                startedAt={domestic.startedAt}
                onRetry={handleRetry}
                onCancel={handleCancelDomestic}
                onSelect={handleSelect}
                trip={tripContext}
              />
            </React.Suspense>
          ) : (
            <React.Suspense
              fallback={
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                  <p className="sr-only">
                    Finding available flights — checking airlines…
                  </p>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <FlightOfferSkeleton key={i} />
                  ))}
                </div>
              }
            >
              <FlightSearchResults
                offers={offers}
                isLoading={isSearching}
                error={error}
                onRetry={handleRetry}
                onSelect={handleSelect}
                trip={tripContext}
              />
            </React.Suspense>
          )
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border/80 bg-muted/20 p-8 text-center sm:p-12">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
              <HugeiconsIcon
                icon={Airplane01Icon}
                size={24}
                aria-hidden="true"
              />
            </div>
            <p className="text-base font-bold text-foreground">
              Ready to search
            </p>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Pick your route and travel dates above, then click Search flights
              to see live airline availability and transparent fares in Naira.
            </p>
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{
                    context: "planning a flight search",
                    channel: "whatsapp",
                  }}
                  href={getSupportWhatsAppUrl("planning a flight search")}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              variant="outline"
              size="sm"
              className="mt-2 rounded-xl"
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={14}
                aria-hidden="true"
              />
              <span>Not sure where to start? Talk to Alphaa</span>
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border/80 bg-card/95 p-6 shadow-xs backdrop-blur-xl sm:p-7">
        <div className="flex items-start gap-3.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={18}
              aria-hidden="true"
            />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Why prices are live
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Fares are fetched live from the airline and already include
              Alphaa&apos;s markup. The total you see on each offer is in Naira.
              Domestic searches check airlines live and can take 30–60 seconds —
              results appear as they arrive with a search ref for support. If
              you select a flight, we re-check the live fare before traveller
              details — so you consent to any change.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
