"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Luggage01Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  Clock01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { Button } from "@/components/ui/button"
import { formatNaira } from "@/lib/format"
import {
  airportResultCache,
  type FlightAmenity,
  type FlightJourney,
  type FlightJourneySegment,
  type FlightOfferDisplay,
} from "@/lib/api/flights"
import { AirlineLogo } from "@/components/flights/airline-logo"
import { cn } from "@/lib/utils"

export interface FlightOfferCardProps {
  offer: FlightOfferDisplay
  onSelect: (offer: FlightOfferDisplay) => void
  isSelecting?: boolean
  isCheapest?: boolean
  isFastest?: boolean
  relatedFlightCount?: number
  onViewRelated?: (airline: string) => void
  className?: string
}

/** Outbound/Return for round trips, numbered legs beyond two, else Itinerary. */
function journeyLabel(count: number, index: number): string {
  if (count === 2) return index === 0 ? "Outbound" : "Return"
  if (count > 2) return `Leg ${index + 1}`
  return "Itinerary"
}

/** Direction badge in the reference style: Outbound / Inbound / Leg N. */
function directionBadge(count: number, index: number): string {
  if (count === 2) return index === 0 ? "Outbound" : "Inbound"
  return journeyLabel(count, index)
}

/** "2026-11-20" → "Mon 28 Sept" for route headers. */
function formatRouteDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null
  const parsed = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return isoDate
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(parsed)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("weekday")} ${get("day")} ${get("month")}`
}

/** Best-effort city name from the autocomplete cache; always falls back to the IATA code. */
function cityOrCode(code: string): string {
  if (!code || code === "—") return code
  const upper = code.toUpperCase()
  for (const list of airportResultCache.values()) {
    const hit = list.find((a) => a.iata_code.toUpperCase() === upper)
    if (hit?.city) return hit.city
  }
  return code
}

/** ISO date of a journey's first departure — drives the route header. */
function journeyDate(
  journey: FlightJourney,
  offer: FlightOfferDisplay,
  index: number
): string | null {
  const firstRaw = journey.segments[0]?.departureAtRaw ?? ""
  const match = firstRaw.match(/(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]
  if (index === 0) {
    const fallback = offer.departureDate
    if (fallback) return fallback
  }
  return null
}

function prettifyCabin(cabin: string): string {
  const lower = cabin.trim().toLowerCase().replace(/\s+/g, " ")
  return lower.replace(/(^|\s)\S/g, (c) => c.toUpperCase())
}

/** Reference-style cabin token: "Economy - Class W". */
function cabinMeta(seg: FlightJourneySegment, fallbackCabin: string): string {
  const cabin = prettifyCabin(seg.cabin || fallbackCabin)
  return seg.bookingClass ? `${cabin} - Class ${seg.bookingClass}` : cabin
}

function formatLongDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null
  const parsed = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function terminalLabel(terminal: string | null | undefined): string | null {
  if (!terminal) return null
  const cleaned = terminal.trim().replace(/^terminal\s+/i, "")
  return cleaned ? `Terminal ${cleaned}` : null
}

function flightCode(seg: FlightJourneySegment): string | null {
  const carrier = (seg.carrierCode ?? "").trim()
  const number = (seg.flightNumber ?? "").trim()
  if (carrier && number) {
    // Clean cards already prefix the number ("AT554"); never render "AT AT554".
    if (number.toUpperCase().startsWith(carrier.toUpperCase())) return number
    return `${carrier} ${number}`
  }
  return carrier || number || null
}

function prettifyAmenity(description: string): string {
  const lower = description.trim().toLowerCase().replace(/\s+/g, " ")
  return lower.replace(/(^|\s)\S/g, (c) => c.toUpperCase())
}

function segmentBaggageLabel(seg: FlightJourneySegment): string | null {
  const parts: string[] = []
  if (typeof seg.checkedBags === "number") {
    parts.push(
      seg.checkedBags === 0
        ? "No checked bag"
        : `${seg.checkedBags} checked ${seg.checkedBags === 1 ? "bag" : "bags"}`
    )
  }
  if (typeof seg.cabinBags === "number") {
    parts.push(
      seg.cabinBags === 0
        ? "No cabin bag"
        : `${seg.cabinBags} cabin ${seg.cabinBags === 1 ? "bag" : "bags"}`
    )
  }
  return parts.length > 0 ? parts.join(" · ") : null
}

/** Label for one leg's own stop count — a segment is one takeoff-to-landing
 * flight, so unknown defaults to Non-stop and only an explicit airline
 * count (>0) may claim a stop. Journey-level counts must never reach here. */
function segmentStopsLabel(stops: number | null | undefined): string {
  if (typeof stops === "number" && stops > 0) {
    return `${stops} ${stops === 1 ? "stop" : "stops"}`
  }
  return "Non-stop"
}

export function FlightOfferCard({
  offer,
  onSelect,
  isSelecting,
  isCheapest,
  isFastest,
  relatedFlightCount,
  onViewRelated,
  className,
}: FlightOfferCardProps) {
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [tab, setTab] = React.useState("details")

  const journeys = Array.isArray(offer.journeys) ? offer.journeys : []
  const firstJourney = journeys[0]
  const segments = firstJourney?.segments ?? []
  const detailsId = React.useId()

  // Extract layover airport code(s) for stops e.g. "1 stop · NBO"
  const layoverCode = React.useMemo(() => {
    if (offer.stops === 0) return "Direct"
    if (segments.length > 1) {
      const layovers = segments
        .slice(0, -1)
        .map((s) => s.arrivalAirport)
        .filter((code) => code && code !== "—" && code !== offer.destination)
      if (layovers.length > 0) {
        return `${offer.stops} ${offer.stops === 1 ? "stop" : "stops"} · ${layovers.join(", ")}`
      }
    }
    return offer.stopsLabel
  }, [offer.stops, offer.stopsLabel, offer.destination, segments])

  // Scoped to the displayed (first) journey — other directions show their
  // own layovers inside the expanded details, never blended here.
  const layoverSummary = React.useMemo(() => {
    const layovers = firstJourney?.layovers ?? []
    if (layovers.length === 0) return null
    return layovers.map((l) => `${l.airport} ${l.durationLabel}`).join(" · ")
  }, [firstJourney])

  const amenities: FlightAmenity[] = Array.isArray(offer.amenities)
    ? offer.amenities
    : []
  const fareRules = offer.fareRules ?? null
  const allSegments = journeys.flatMap((j) => j.segments)
  const hasFareSection =
    fareRules !== null ||
    typeof offer.seatsAvailable === "number" ||
    !!offer.lastTicketingDate ||
    !!offer.validatingAirline

  const factBadges = React.useMemo(() => {
    const badges: string[] = []
    if (typeof offer.seatsAvailable === "number") {
      badges.push(
        offer.seatsAvailable === 1
          ? "Only 1 seat left"
          : `Only ${offer.seatsAvailable} seats left`
      )
    }
    if (fareRules?.refundable === false) badges.push("Non-refundable")
    if (fareRules?.refundable === true) badges.push("Refund terms apply")
    if (offer.fareBrand) badges.push(offer.fareBrand)
    return badges
  }, [offer.seatsAvailable, offer.fareBrand, fareRules])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <article
        aria-label={`Flight offer ${offer.airline} ${offer.airportsLabel}`}
        className="flex min-w-0 flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-shadow hover:shadow-md sm:p-5"
        style={{ contentVisibility: "auto" } as React.CSSProperties}
      >
        {/* Card Header: Airline Info + Select CTA */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-3">
            <AirlineLogo airline={offer.airline} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground sm:text-lg">
                  {offer.airline}
                </h3>
                {isCheapest ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Cheapest
                  </span>
                ) : null}
                {isFastest ? (
                  <span className="inline-flex items-center rounded-full bg-sky-600/10 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                    Fastest
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {offer.cabin} · {offer.airportsLabel}
                {offer.bookingClass ? ` · Class ${offer.bookingClass}` : null}
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="default"
            onClick={() => onSelect(offer)}
            disabled={!!isSelecting}
            isLoading={!!isSelecting}
            className="rounded-xl bg-primary px-6 font-bold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.98]"
          >
            <span>Select flight</span>
          </Button>
        </div>

        {/* Total fare */}
        <div className="my-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <div>
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Total fare
            </p>
            <p className="text-lg font-extrabold text-foreground tabular-nums sm:text-xl">
              {offer.price === "—" ? "—" : formatNaira(offer.price)}
            </p>
          </div>
        </div>

        {/* Flight Timing & Path Row */}
        <div className="rounded-xl bg-muted/30 p-3.5 sm:p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {firstJourney
              ? `${journeyLabel(journeys.length, firstJourney.index)} · ${firstJourney.stopsLabel}`
              : offer.airline}
          </p>

          <div className="flex items-center justify-between gap-3 sm:gap-6">
            {/* Departure */}
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-foreground tabular-nums sm:text-2xl">
                {offer.departureAt}
              </p>
              <p className="text-xs font-bold text-muted-foreground sm:text-sm">
                {offer.origin}
              </p>
              {offer.departureDate ? (
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {offer.departureDate}
                </p>
              ) : null}
            </div>

            {/* Path Graphic & Duration */}
            <div className="flex flex-1 flex-col items-center justify-center px-2">
              <p className="text-xs font-bold text-foreground tabular-nums">
                {offer.duration}
              </p>
              <div className="relative my-1.5 flex w-full max-w-[200px] items-center">
                <span className="size-2 rounded-full border-2 border-primary bg-background" />
                <div className="h-0.5 flex-1 bg-border" />
                {offer.stops > 0 ? (
                  <span
                    className="size-2.5 rounded-full bg-amber-500"
                    title={layoverCode}
                  />
                ) : (
                  <HugeiconsIcon
                    icon={Airplane01Icon}
                    size={14}
                    className="text-primary"
                    aria-hidden="true"
                  />
                )}
                <div className="h-0.5 flex-1 bg-border" />
                <span className="size-2 rounded-full border-2 border-primary bg-background" />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {layoverCode}
              </p>
            </div>

            {/* Arrival */}
            <div className="min-w-0 text-right">
              <p className="text-xl font-extrabold text-foreground tabular-nums sm:text-2xl">
                {offer.arrivalAt}
                {offer.arrivalDayOffset && offer.arrivalDayOffset > 0 ? (
                  <sup className="ml-1 text-xs font-black text-primary">
                    +{offer.arrivalDayOffset}
                  </sup>
                ) : null}
              </p>
              <p className="text-xs font-bold text-muted-foreground sm:text-sm">
                {offer.destination}
              </p>
              {offer.arrivalDate ? (
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {offer.arrivalDate}
                </p>
              ) : null}
            </div>
          </div>

          {/* Layover durations — connection times from the live itinerary */}
          {layoverSummary ? (
            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <HugeiconsIcon icon={Clock01Icon} size={13} aria-hidden="true" />
              <span>Layover {layoverSummary}</span>
            </p>
          ) : null}

          {/* Truthful fact badges — only airline-provided facts, never invented */}
          {factBadges.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {factBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center rounded-full border border-border/70 bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : null}

          {/* Baggage — only when the airline provides it */}
          {offer.baggage ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <HugeiconsIcon
                  icon={Luggage01Icon}
                  size={14}
                  aria-hidden="true"
                />
                <span>{offer.baggage}</span>
              </span>
            </div>
          ) : null}
        </div>

        {/* Footer: View Details Toggle */}
        <div className="mt-3.5 flex items-center justify-end border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={() => {
              if (!detailsOpen) setTab("details")
              setDetailsOpen(!detailsOpen)
            }}
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span>{detailsOpen ? "Hide Details" : "View Flight Details"}</span>
            <HugeiconsIcon
              icon={detailsOpen ? ChevronUpIcon : ChevronDownIcon}
              size={14}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Expanded details: tabbed Flight Details / Fare Rules */}
        {detailsOpen ? (
          <div
            id={detailsId}
            className="mt-4 rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5"
          >
            <TabsPrimitive.Root
              value={tab}
              onValueChange={(value) => setTab(String(value))}
            >
              <TabsPrimitive.List
                aria-label="Flight information"
                className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1"
              >
                <TabsPrimitive.Tab
                  value="details"
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98]",
                    tab === "details"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Flight Details
                </TabsPrimitive.Tab>
                <TabsPrimitive.Tab
                  value="rules"
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98]",
                    tab === "rules"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Fare Rules
                </TabsPrimitive.Tab>
              </TabsPrimitive.List>

              <TabsPrimitive.Panel value="details">
                <h4 className="sr-only">Flight itinerary</h4>
                {/* Depart / Return strip */}
                {journeys.length > 0 ? (
                  <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {journeys.map((journey) => {
                      const first = journey.segments[0]
                      const last = journey.segments[journey.segments.length - 1]
                      if (!first || !last) return null
                      return (
                        <div
                          key={journey.index}
                          className="rounded-lg border border-border/50 bg-card px-3 py-2"
                        >
                          <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                            {directionBadge(journeys.length, journey.index)}
                          </p>
                          <p className="text-sm font-extrabold text-foreground tabular-nums">
                            {first.departureAt} → {last.arrivalAt}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {journey.airportsLabel} · {journey.duration}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
                {journeys.length > 0 ? (
                  <div
                    className={
                      journeys.length > 1
                        ? "grid grid-cols-1 items-start gap-6 lg:grid-cols-2"
                        : "flex flex-col"
                    }
                  >
                    {journeys.map((journey, journeyPosition) => {
                      const routeDate = formatRouteDate(
                        journeyDate(journey, offer, journeyPosition)
                      )
                      return (
                        <div key={journey.index} className="min-w-0">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-foreground">
                              {cityOrCode(journey.origin)} to{" "}
                              {cityOrCode(journey.destination)}
                              {routeDate ? `, ${routeDate}` : null}
                            </p>
                            <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                              {directionBadge(journeys.length, journey.index)}
                            </span>
                          </div>
                          <ol className="flex flex-col gap-3">
                            {journey.segments.map((seg, i) => {
                              const code = flightCode(seg)
                              const depTerminal = terminalLabel(
                                seg.departureTerminal
                              )
                              const arrTerminal = terminalLabel(
                                seg.arrivalTerminal
                              )
                              const segDate = formatRouteDate(
                                seg.departureAtRaw?.match(
                                  /(\d{4}-\d{2}-\d{2})/
                                )?.[1] ?? null
                              )
                              const baggageLabel = segmentBaggageLabel(seg)
                              const layover =
                                journey.layovers && journey.layovers[i]
                                  ? journey.layovers[i]
                                  : null
                              return (
                                <li key={i} className="flex flex-col">
                                  {i > 0 ? (
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                      <p className="text-xs font-bold text-foreground">
                                        {cityOrCode(seg.departureAirport)} to{" "}
                                        {cityOrCode(seg.arrivalAirport)}
                                        {segDate ? `, ${segDate}` : null}
                                      </p>
                                      <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 uppercase">
                                        Connecting Flight
                                      </span>
                                    </div>
                                  ) : null}
                                  <div className="rounded-xl border border-border/50 bg-card p-3 sm:p-4">
                                    <div className="flex items-center gap-2">
                                      <AirlineLogo
                                        airline={
                                          seg.carrierName || offer.airline
                                        }
                                        carrierCode={
                                          seg.carrierCode || undefined
                                        }
                                        size="sm"
                                      />
                                      <p className="text-xs font-bold text-foreground">
                                        {seg.carrierName || offer.airline}
                                      </p>
                                      <span className="ml-auto text-[11px] font-semibold text-muted-foreground tabular-nums">
                                        {[seg.duration, "Non-stop"]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </span>
                                    </div>
                                    <div className="mt-2.5 flex items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-xl font-extrabold text-foreground tabular-nums">
                                          {seg.departureAt}
                                        </p>
                                        <p className="text-[11px] font-semibold text-muted-foreground">
                                          {cityOrCode(seg.departureAirport)} (
                                          {seg.departureAirport})
                                        </p>
                                        {depTerminal ? (
                                          <p className="text-[11px] text-muted-foreground">
                                            {depTerminal}
                                          </p>
                                        ) : null}
                                      </div>
                                      <div className="flex flex-1 flex-col items-center px-1">
                                        <HugeiconsIcon
                                          icon={Airplane01Icon}
                                          size={14}
                                          className="text-primary"
                                          aria-hidden="true"
                                        />
                                        <div
                                          aria-hidden="true"
                                          className="my-1 h-0.5 w-full max-w-[120px] bg-border"
                                        />
                                        <p className="text-[10px] font-semibold text-muted-foreground">
                                          {segmentStopsLabel(seg.segmentStops)}
                                        </p>
                                      </div>
                                      <div className="min-w-0 text-right">
                                        <p className="text-xl font-extrabold text-foreground tabular-nums">
                                          {seg.arrivalAt}
                                        </p>
                                        <p className="text-[11px] font-semibold text-muted-foreground">
                                          {cityOrCode(seg.arrivalAirport)} (
                                          {seg.arrivalAirport})
                                        </p>
                                        {arrTerminal ? (
                                          <p className="text-[11px] text-muted-foreground">
                                            {arrTerminal}
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>
                                    <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border/50 pt-2 text-[11px] sm:grid-cols-4">
                                      <div className="min-w-0">
                                        <dt className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                          Date
                                        </dt>
                                        <dd className="font-semibold text-foreground tabular-nums">
                                          {segDate ?? "—"}
                                        </dd>
                                      </div>
                                      <div className="min-w-0">
                                        <dt className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                          Flight
                                        </dt>
                                        <dd className="font-semibold text-foreground tabular-nums">
                                          {code ? `Flight ${code}` : "—"}
                                        </dd>
                                      </div>
                                      <div className="min-w-0">
                                        <dt className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                          Baggage
                                        </dt>
                                        <dd className="font-semibold text-foreground">
                                          {baggageLabel ?? "—"}
                                        </dd>
                                      </div>
                                      <div className="min-w-0">
                                        <dt className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                          Cabin
                                        </dt>
                                        <dd className="font-semibold text-foreground">
                                          {cabinMeta(seg, offer.cabin)}
                                        </dd>
                                      </div>
                                    </dl>
                                    {seg.aircraft ||
                                    (seg.operatingCarrier &&
                                      seg.operatingCarrier !==
                                        seg.carrierCode) ? (
                                      <p className="mt-1 text-[11px] text-muted-foreground">
                                        {[
                                          seg.aircraft
                                            ? `Aircraft ${seg.aircraft}`
                                            : null,
                                          seg.operatingCarrier &&
                                          seg.operatingCarrier !==
                                            seg.carrierCode
                                            ? `Operated by ${seg.operatingCarrier}`
                                            : null,
                                        ]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </p>
                                    ) : null}
                                    {seg.brandedFare || seg.fareBasis ? (
                                      <p className="mt-1 text-[11px] text-muted-foreground">
                                        {[seg.brandedFare, seg.fareBasis]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </p>
                                    ) : null}
                                  </div>
                                  {layover ? (
                                    <div
                                      aria-label={`Layover in ${layover.airport}, ${layover.durationLabel}`}
                                      className="mt-2 rounded-lg border border-dashed border-amber-500/60 bg-amber-500/5 px-3 py-2 text-[11px] text-muted-foreground"
                                    >
                                      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                        <HugeiconsIcon
                                          icon={Clock01Icon}
                                          size={13}
                                          aria-hidden="true"
                                          className="shrink-0 text-amber-600"
                                        />
                                        <span className="font-bold text-foreground">
                                          Layover in {layover.airport} (
                                          {cityOrCode(layover.airport)} airport)
                                        </span>
                                        <span className="ml-auto font-semibold text-amber-700 tabular-nums">
                                          {layover.durationLabel}
                                        </span>
                                        {layover.terminalChange ? (
                                          <span>
                                            · Terminal change{" "}
                                            {layover.terminalChange}
                                          </span>
                                        ) : null}
                                        {layover.overnight ? (
                                          <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-bold text-amber-700">
                                            Overnight
                                          </span>
                                        ) : null}
                                      </p>
                                    </div>
                                  ) : null}
                                </li>
                              )
                            })}
                          </ol>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The airline did not return segment times for this fare. Talk
                    to Alphaa if you need the full itinerary before booking.
                  </p>
                )}
                {amenities.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                      Onboard services
                    </p>
                    <ul
                      className="flex flex-wrap gap-1.5"
                      aria-label="Onboard services"
                    >
                      {amenities.map((amenity) => (
                        <li
                          key={amenity.description}
                          className="inline-flex items-center rounded-full border border-border/70 bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                          title={
                            amenity.chargeable
                              ? "Available for a fee"
                              : "Included"
                          }
                        >
                          {prettifyAmenity(amenity.description)}
                          {amenity.chargeable ? " · Paid" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </TabsPrimitive.Panel>

              <TabsPrimitive.Panel value="rules">
                <h4 className="sr-only">Fare rules</h4>
                {hasFareSection ? (
                  <section aria-label="Fare conditions">
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      <HugeiconsIcon
                        icon={InformationCircleIcon}
                        size={13}
                        aria-hidden="true"
                      />
                      <span>Fare conditions</span>
                    </h4>
                    <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                      {fareRules?.refundable === false ? (
                        <li>
                          <span className="font-bold text-foreground">
                            Non-refundable
                          </span>
                          {" — this fare cannot be refunded if you cancel."}
                        </li>
                      ) : null}
                      {fareRules?.refundable === true ? (
                        <li>
                          <span className="font-bold text-foreground">
                            Refund terms apply
                          </span>
                          {
                            " — refunds are subject to airline terms; confirm with Alphaa before paying."
                          }
                        </li>
                      ) : null}
                      {fareRules?.exchangeAllowed === true &&
                      fareRules.exchangePenalty ? (
                        <li>
                          Date changes allowed with a penalty of up to{" "}
                          <span className="font-bold text-foreground tabular-nums">
                            {formatNaira(fareRules.exchangePenalty)}
                          </span>
                          .
                        </li>
                      ) : null}
                      {fareRules?.exchangeAllowed === true &&
                      !fareRules.exchangePenalty ? (
                        <li>
                          Date changes allowed under airline terms — confirm
                          fees with Alphaa.
                        </li>
                      ) : null}
                      {fareRules?.exchangeAllowed === false ? (
                        <li>Date changes are not allowed on this fare.</li>
                      ) : null}
                      {fareRules?.revalidationAllowed === false ? (
                        <li>
                          Ticket revalidation is not permitted for this fare.
                        </li>
                      ) : null}
                      {offer.validatingAirline ? (
                        <li>
                          Ticket issued by{" "}
                          <span className="font-semibold text-foreground">
                            {offer.validatingAirline}
                          </span>
                          .
                        </li>
                      ) : null}
                      {typeof offer.seatsAvailable === "number" ? (
                        <li>
                          <span className="font-bold text-foreground tabular-nums">
                            {offer.seatsAvailable}{" "}
                            {offer.seatsAvailable === 1 ? "seat" : "seats"} left
                          </span>{" "}
                          at this fare.
                        </li>
                      ) : null}
                      {offer.lastTicketingDate ? (
                        <li>
                          Must be ticketed by{" "}
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatLongDate(offer.lastTicketingDate) ??
                              offer.lastTicketingDate}
                          </span>
                          .
                        </li>
                      ) : null}
                    </ul>
                  </section>
                ) : null}
                <section
                  aria-label="Baggage allowance"
                  className={
                    hasFareSection ? "mt-4 border-t border-border/60 pt-4" : ""
                  }
                >
                  <h4 className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Baggage allowance
                  </h4>
                  {allSegments.some((s) => segmentBaggageLabel(s)) ||
                  offer.baggage ? (
                    <div className="flex flex-col gap-2">
                      {offer.baggage ? (
                        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <HugeiconsIcon
                            icon={Luggage01Icon}
                            size={14}
                            aria-hidden="true"
                          />
                          <span>Included: {offer.baggage}</span>
                        </p>
                      ) : null}
                      <ul className="flex flex-col gap-1.5">
                        {allSegments.map((seg, i) => {
                          const label = segmentBaggageLabel(seg)
                          if (!label) return null
                          return (
                            <li
                              key={i}
                              className="text-xs text-muted-foreground"
                            >
                              <span className="font-semibold text-foreground tabular-nums">
                                {seg.departureAirport} → {seg.arrivalAirport}:
                              </span>{" "}
                              {label}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      The airline did not include baggage details for this fare.
                      Confirm allowances with Alphaa before booking if bags
                      matter for your trip.
                    </p>
                  )}
                </section>
              </TabsPrimitive.Panel>
            </TabsPrimitive.Root>
          </div>
        ) : null}
      </article>

      {/* Accordion to view more flights from this airline */}
      {relatedFlightCount && relatedFlightCount > 1 ? (
        <button
          type="button"
          onClick={() => onViewRelated?.(offer.airline)}
          className="flex items-center justify-center gap-1.5 py-1 text-xs font-bold tracking-wide text-primary uppercase transition-colors hover:text-primary/80"
        >
          <span>
            +{relatedFlightCount - 1} {offer.airline} Flights
          </span>
          <HugeiconsIcon icon={ChevronDownIcon} size={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

export function FlightOfferSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        </div>
        <div className="h-9 w-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      </div>

      <div className="h-20 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />

      <div className="h-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
    </div>
  )
}
