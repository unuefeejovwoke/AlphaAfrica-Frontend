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
import { Button } from "@/components/ui/button"
import { formatNaira } from "@/lib/format"
import type {
  FlightAmenity,
  FlightJourneySegment,
  FlightOfferDisplay,
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

function cabinLine(seg: FlightJourneySegment, fallbackCabin: string): string {
  return (
    [
      seg.cabin || fallbackCabin,
      seg.bookingClass ? `Class ${seg.bookingClass}` : null,
      seg.brandedFare,
      seg.fareBasis,
    ]
      .filter(Boolean)
      .join(" · ") || fallbackCabin
  )
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

  const layoverSummary = React.useMemo(() => {
    const all = journeys.flatMap((j) => j.layovers ?? [])
    if (all.length === 0) return null
    return all.map((l) => `${l.airport} ${l.durationLabel}`).join(" · ")
  }, [journeys])

  const amenities: FlightAmenity[] = Array.isArray(offer.amenities)
    ? offer.amenities
    : []
  const fareRules = offer.fareRules ?? null
  const priceBreakdown = offer.priceBreakdown ?? null
  const allSegments = journeys.flatMap((j) => j.segments)
  const hasFareSection =
    fareRules !== null ||
    typeof offer.seatsAvailable === "number" ||
    !!offer.lastTicketingDate ||
    !!offer.validatingAirline
  const hasPriceBreakdown =
    priceBreakdown !== null &&
    (priceBreakdown.baseFare || priceBreakdown.markup)

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
          <p className="text-[11px] text-muted-foreground">
            Final price with Alphaa markup applied · {offer.currency}
          </p>
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
            onClick={() => setDetailsOpen(!detailsOpen)}
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

        {/* Expanded full itinerary details */}
        {detailsOpen ? (
          <div
            id={detailsId}
            className="mt-4 flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/20 p-4"
          >
            {/* 1 — Flight itinerary with layovers, terminals, aircraft */}
            <section aria-label="Flight itinerary">
              <h4 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Flight itinerary
              </h4>
              {journeys.length > 0 ? (
                <div className="space-y-5">
                  {journeys.map((journey) => (
                    <div key={journey.index}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-foreground">
                          {journeyLabel(journeys.length, journey.index)}
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground tabular-nums">
                          {journey.airportsLabel} · {journey.duration} ·{" "}
                          {journey.stopsLabel}
                        </p>
                      </div>
                      <ol className="space-y-0">
                        {journey.segments.map((seg, i) => {
                          const code = flightCode(seg)
                          const depTerminal = terminalLabel(
                            seg.departureTerminal
                          )
                          const arrTerminal = terminalLabel(seg.arrivalTerminal)
                          const baggageLabel = segmentBaggageLabel(seg)
                          const layover =
                            journey.layovers && journey.layovers[i]
                              ? journey.layovers[i]
                              : null
                          return (
                            <li key={i} className="flex flex-col">
                              <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3 text-xs">
                                <span
                                  aria-hidden="true"
                                  className="mt-1 size-2 shrink-0 rounded-full bg-primary"
                                />
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-bold text-foreground tabular-nums">
                                      {seg.departureAirport} ({seg.departureAt})
                                      → {seg.arrivalAirport} ({seg.arrivalAt})
                                    </p>
                                    {seg.duration ? (
                                      <span className="font-semibold text-muted-foreground tabular-nums">
                                        {seg.duration}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    {depTerminal
                                      ? `${seg.departureAirport} ${depTerminal} · `
                                      : ""}
                                    {arrTerminal
                                      ? `${seg.arrivalAirport} ${arrTerminal}`
                                      : ""}
                                    {!depTerminal && !arrTerminal
                                      ? `${seg.departureAirport} → ${seg.arrivalAirport}`
                                      : ""}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {[
                                      seg.carrierName || offer.airline,
                                      code ? `Flight ${code}` : null,
                                      seg.operatingCarrier &&
                                      seg.operatingCarrier !== seg.carrierCode
                                        ? `Operated by ${seg.operatingCarrier}`
                                        : null,
                                      seg.aircraft
                                        ? `Aircraft ${seg.aircraft}`
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {cabinLine(seg, offer.cabin)}
                                  </p>
                                  {baggageLabel ? (
                                    <p className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                                      <HugeiconsIcon
                                        icon={Luggage01Icon}
                                        size={12}
                                        aria-hidden="true"
                                      />
                                      <span>{baggageLabel}</span>
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              {layover ? (
                                <div
                                  aria-label={`Layover in ${layover.airport}, ${layover.durationLabel}`}
                                  className="ml-4 flex items-center gap-2 border-l-2 border-dashed border-amber-500/60 py-2 pl-3 text-[11px] text-muted-foreground"
                                >
                                  <HugeiconsIcon
                                    icon={Clock01Icon}
                                    size={13}
                                    aria-hidden="true"
                                    className="shrink-0 text-amber-600"
                                  />
                                  <p>
                                    <span className="font-bold text-foreground">
                                      Layover in {layover.airport}
                                    </span>{" "}
                                    · {layover.durationLabel}
                                    {layover.terminalChange ? (
                                      <span>
                                        {" "}
                                        · Terminal change{" "}
                                        {layover.terminalChange}
                                      </span>
                                    ) : null}
                                    {layover.overnight ? (
                                      <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-bold text-amber-700">
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
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The airline did not return segment times for this fare. Talk
                  to Alphaa if you need the full itinerary before booking.
                </p>
              )}
            </section>

            {/* 2 — Bags & onboard: per-segment allowances + amenities */}
            <section
              aria-label="Bags and onboard"
              className="border-t border-border/60 pt-4"
            >
              <h4 className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Bags & onboard
              </h4>
              {allSegments.some((s) => segmentBaggageLabel(s)) ||
              amenities.length > 0 ||
              offer.baggage ? (
                <div className="flex flex-col gap-2.5">
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
                        <li key={i} className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground tabular-nums">
                            {seg.departureAirport} → {seg.arrivalAirport}:
                          </span>{" "}
                          {label}
                        </li>
                      )
                    })}
                  </ul>
                  {amenities.length > 0 ? (
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
                  ) : null}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The airline did not include baggage details for this fare.
                  Confirm allowances with Alphaa before booking if bags matter
                  for your trip.
                </p>
              )}
            </section>

            {/* 3 — Fare conditions: refund / exchange / ticketing / seats */}
            {hasFareSection ? (
              <section
                aria-label="Fare conditions"
                className="border-t border-border/60 pt-4"
              >
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
                      Date changes allowed under airline terms — confirm fees
                      with Alphaa.
                    </li>
                  ) : null}
                  {fareRules?.exchangeAllowed === false ? (
                    <li>Date changes are not allowed on this fare.</li>
                  ) : null}
                  {fareRules?.revalidationAllowed === false ? (
                    <li>Ticket revalidation is not permitted for this fare.</li>
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

            {/* 4 — Price breakdown: base fare + markup + total */}
            {hasPriceBreakdown && priceBreakdown ? (
              <section
                aria-label="Price breakdown"
                className="border-t border-border/60 pt-4"
              >
                <h4 className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Price breakdown
                </h4>
                <dl className="flex flex-col gap-1.5 rounded-lg bg-card p-3 text-xs">
                  {priceBreakdown.baseFare ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">
                        Airline base fare
                      </dt>
                      <dd className="font-semibold text-foreground tabular-nums">
                        {formatNaira(priceBreakdown.baseFare)}
                      </dd>
                    </div>
                  ) : null}
                  {priceBreakdown.markup ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">
                        Alphaa service markup
                      </dt>
                      <dd className="font-semibold text-foreground tabular-nums">
                        {formatNaira(priceBreakdown.markup)}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-1.5">
                    <dt className="font-bold text-foreground">Total you pay</dt>
                    <dd className="font-extrabold text-foreground tabular-nums">
                      {priceBreakdown.total === "—"
                        ? "—"
                        : formatNaira(priceBreakdown.total)}{" "}
                      <span className="font-bold text-muted-foreground">
                        {priceBreakdown.currency}
                      </span>
                    </dd>
                  </div>
                </dl>
              </section>
            ) : null}
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
