"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Cancel01Icon,
  Clock01Icon,
  InformationCircleIcon,
  Luggage01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons"
import { AirlineLogo } from "@/components/flights/airline-logo"
import { ButtonLink } from "@/components/ui/button"
import { formatNaira } from "@/lib/format"
import type { FlightOfferDisplay } from "@/lib/api/flights"

const AIRPORT_CITIES: Record<string, string> = {
  LOS: "Lagos",
  ABV: "Abuja",
  PHC: "Port Harcourt",
  KAN: "Kano",
  ENU: "Enugu",
  QUO: "Uyo",
  BNI: "Benin City",
  KGL: "Kigali",
  ACC: "Accra",
  NBO: "Nairobi",
  JNB: "Johannesburg",
  CPT: "Cape Town",
  CAI: "Cairo",
  ADD: "Addis Ababa",
  DXB: "Dubai",
  DOH: "Doha",
  LHR: "London",
  LGW: "London",
  JFK: "New York",
  EWR: "New York",
  CDG: "Paris",
  AMS: "Amsterdam",
  FRA: "Frankfurt",
  IST: "Istanbul",
  MAD: "Madrid",
  BCN: "Barcelona",
  ZNZ: "Zanzibar",
  DAR: "Dar es Salaam",
  MRU: "Mauritius",
  SEZ: "Seychelles",
}

function resolveCity(iata: string): string {
  const code = iata.trim().toUpperCase()
  return AIRPORT_CITIES[code] || code
}

function formatDateLabel(dateStr?: string | null): string {
  if (!dateStr || dateStr === "—") return "Departure"
  try {
    const [year, month, day] = dateStr.split("-").map(Number)
    if (year && month && day) {
      const d = new Date(Date.UTC(year, month - 1, day))
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    }
    return dateStr
  } catch {
    return dateStr
  }
}

export interface CheckoutBookingSummaryProps {
  display: FlightOfferDisplay
  onClearFlight?: () => void
}

export function CheckoutBookingSummary({
  display,
}: CheckoutBookingSummaryProps) {
  const journeys = display.journeys && display.journeys.length > 0
    ? display.journeys
    : [
        {
          index: 0,
          duration: display.duration,
          stops: display.stops,
          stopsLabel: display.stopsLabel,
          origin: display.origin,
          destination: display.destination,
          airportsLabel: display.airportsLabel,
          segments: [],
          layovers: [],
        },
      ]

  const total = formatNaira(display.price)
  const isRefundable = display.fareRules?.refundable === true
  const baggageText = display.baggage
    ? display.baggage
    : `${display.cabin || "Economy"} • 1 × 7kg cabin • 2 × 23kg checked`

  return (
    <section aria-label="Step 1: Booking Summary" className="flex flex-col gap-4">
      {/* Step Header */}
      <div className="flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-xs sm:size-8 sm:text-sm">
          1
        </span>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Booking Summary
        </h2>
      </div>

      {/* Top flight strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-2xs sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HugeiconsIcon icon={Airplane01Icon} size={18} aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-[11px] font-extrabold tracking-wider text-primary uppercase">
              FLIGHT
            </span>
            <span className="hidden text-muted-foreground/50 sm:inline">·</span>
            <span className="truncate text-sm font-bold text-foreground">
              {display.origin} → {display.destination} · {display.airline}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="font-variant-numeric text-base font-extrabold text-foreground tabular-nums sm:text-lg">
            {total}
          </span>
          <ButtonLink
            href="/flights"
            variant="ghost"
            size="sm"
            className="size-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Change flight"
            aria-label="Change flight"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>

      {/* Flight Detail Cards for each Journey */}
      {journeys.map((journey, jIdx) => {
        const segment = journey.segments[0]
        const flightNumber = segment?.flightNumber
          ? `${segment.carrierCode || display.airlineCode || ""}${segment.flightNumber}`
          : display.airlineCode || ""
        const aircraft = segment?.aircraft || "Scheduled Flight"
        const departDate = formatDateLabel(display.departureDate)

        return (
          <div
            key={journey.index ?? jIdx}
            className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
          >
            {/* Depart pill & Date */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-bold tracking-wider text-foreground uppercase">
                  {jIdx === 0 ? "DEPART" : "RETURN"}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {departDate}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AirlineLogo
                  airline={display.airline}
                  carrierCode={display.airlineCode || undefined}
                  logoUrl={display.airlineLogo}
                  size="sm"
                />
                <span className="text-xs font-semibold text-foreground">
                  {display.airline}
                </span>
                <span className="text-xs text-muted-foreground">
                  {flightNumber ? `· ${flightNumber}` : ""}
                  {aircraft ? ` · ${aircraft}` : ""}
                </span>
              </div>
            </div>

            {/* Visual Route Timeline */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 sm:gap-6">
              {/* Departure */}
              <div className="flex flex-col">
                <span className="font-variant-numeric text-2xl font-black tracking-tight text-foreground tabular-nums sm:text-3xl">
                  {display.departureAt}
                </span>
                <span className="mt-0.5 text-xs font-bold text-foreground sm:text-sm">
                  {journey.origin || display.origin}
                </span>
                <span className="text-[11px] text-muted-foreground sm:text-xs">
                  {resolveCity(journey.origin || display.origin)}
                </span>
              </div>

              {/* Connecting path */}
              <div className="flex flex-col items-center px-1 sm:px-4">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground tabular-nums">
                  <HugeiconsIcon icon={Clock01Icon} size={12} aria-hidden="true" />
                  <span>{journey.duration || display.duration}</span>
                </span>

                <div className="relative my-2 flex w-24 items-center sm:w-36 md:w-44">
                  <span className="size-2 rounded-full border-2 border-primary bg-background" />
                  <div className="relative h-[2px] flex-1 bg-border">
                    <div className="absolute inset-0 bg-primary/40" />
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card p-1 text-primary shadow-xs">
                    <HugeiconsIcon
                      icon={Airplane01Icon}
                      size={14}
                      className="rotate-90"
                      aria-hidden="true"
                    />
                  </div>
                  <span className="size-2 rounded-full bg-primary" />
                </div>

                <span className="text-[11px] font-medium text-muted-foreground">
                  {journey.stopsLabel || display.stopsLabel || "Direct"}
                </span>
              </div>

              {/* Arrival */}
              <div className="flex flex-col items-end text-right">
                <span className="font-variant-numeric text-2xl font-black tracking-tight text-foreground tabular-nums sm:text-3xl">
                  {display.arrivalAt}
                </span>
                <span className="mt-0.5 text-xs font-bold text-foreground sm:text-sm">
                  {journey.destination || display.destination}
                </span>
                <span className="text-[11px] text-muted-foreground sm:text-xs">
                  {resolveCity(journey.destination || display.destination)}
                </span>
              </div>
            </div>

            {/* Baggage & Cabin meta row */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/30 px-3.5 py-2.5 text-xs font-medium text-muted-foreground">
              <span className="font-semibold text-foreground">
                {display.cabin || "Economy"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Luggage01Icon} size={14} aria-hidden="true" />
                <span>{baggageText}</span>
              </span>
            </div>

            {/* Fare Rules Block */}
            <div className="border-t border-border pt-4">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Fare Rules
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
                {/* Cancellation policy */}
                <div className="flex flex-col gap-1 rounded-xl border border-border/80 bg-muted/20 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <HugeiconsIcon icon={Shield01Icon} size={14} aria-hidden="true" />
                    <span>Cancellation policy</span>
                  </div>
                  <span
                    className={`mt-1 text-xs font-bold ${
                      isRefundable
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {isRefundable ? "Refundable (fees apply)" : "Non-refundable"}
                  </span>
                </div>

                {/* Important airline advisory */}
                <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-muted/10 p-3 text-xs leading-relaxed text-muted-foreground">
                  <HugeiconsIcon
                    icon={InformationCircleIcon}
                    size={15}
                    className="mt-0.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div className="flex max-h-24 flex-col gap-1 overflow-y-auto pr-1 text-[11px]">
                    <p>
                      <strong>Travel Requirements:</strong> Ensure you have
                      fulfilled your visa requirements and valid travel
                      documents prior to departure. Passengers must hold a valid
                      passport with a minimum of 6 months validity from the date of
                      travel.
                    </p>
                    <p>
                      Tickets are subject to the carrier&apos;s conditions of
                      carriage and fare rules. Date changes may incur fare
                      differences and airline reissue penalties.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}
