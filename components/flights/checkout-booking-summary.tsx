"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Edit02Icon,
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

/** ISO date (YYYY-MM-DD) from a segment timestamp, or null when absent. */
function segmentDatePart(raw?: string | null): string | null {
  if (!raw) return null
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null
}

function formatDateLabel(dateStr?: string | null): string | null {
  if (!dateStr || dateStr === "—") return null
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
    return null
  } catch {
    return null
  }
}

function legLabel(index: number, total: number): string {
  if (total === 1) return "DEPART"
  if (total === 2) return index === 0 ? "DEPART" : "RETURN"
  return `LEG ${index + 1}`
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
  const refundable = display.fareRules?.refundable ?? null

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
            className="size-8 p-0 text-muted-foreground hover:text-foreground"
            title="Change flight"
            aria-label="Change flight"
          >
            <HugeiconsIcon icon={Edit02Icon} size={16} aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>

      {/* Flight Detail Cards for each Journey */}
      {journeys.map((journey, jIdx) => {
        const segments = journey.segments ?? []
        const firstSeg = segments[0]
        const lastSeg = segments.length > 0 ? segments[segments.length - 1] : undefined

        // Per-leg times from that leg's own segments — never the outbound
        // times repeated onto the return leg.
        const departTime =
          firstSeg?.departureAt ?? (jIdx === 0 ? display.departureAt : "—")
        const arriveTime =
          lastSeg?.arrivalAt ?? (jIdx === 0 ? display.arrivalAt : "—")

        const journeyDateRaw =
          segmentDatePart(firstSeg?.departureAtRaw) ??
          (jIdx === 0 ? (display.departureDate ?? null) : null)
        const journeyDate = formatDateLabel(journeyDateRaw)

        const flightNumbers = segments
          .map((s) =>
            s.flightNumber
              ? `${s.carrierCode || display.airlineCode || ""}${s.flightNumber}`.trim()
              : ""
          )
          .filter(Boolean)
        const flightLine = flightNumbers.length > 0 ? flightNumbers.join(" · ") : null
        const aircraft = firstSeg?.aircraft ?? null

        return (
          <div
            key={journey.index ?? jIdx}
            className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
          >
            {/* Depart pill & Date */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-bold tracking-wider text-foreground uppercase">
                  {legLabel(jIdx, journeys.length)}
                </span>
                {journeyDate ? (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {journeyDate}
                  </span>
                ) : null}
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
                {flightLine || aircraft ? (
                  <span className="text-xs text-muted-foreground">
                    {flightLine ? `· ${flightLine}` : ""}
                    {aircraft ? ` · ${aircraft}` : ""}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Visual Route Timeline */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 sm:gap-6">
              {/* Departure */}
              <div className="flex flex-col">
                <span className="font-variant-numeric text-2xl font-black tracking-tight text-foreground tabular-nums sm:text-3xl">
                  {departTime}
                </span>
                <span className="mt-0.5 text-xs font-bold text-foreground sm:text-sm">
                  {journey.origin || display.origin}
                </span>
                <span className="text-[11px] text-muted-foreground sm:text-xs">
                  {resolveCity(journey.origin || display.origin)}
                </span>
              </div>

              {/* Connecting path — duration above, stops below, no icon */}
              <div className="flex flex-col items-center px-1 sm:px-4">
                <span className="text-[11px] font-bold text-foreground tabular-nums sm:text-xs">
                  {journey.duration || display.duration}
                </span>

                <div
                  aria-hidden="true"
                  className="my-2 flex w-24 items-center sm:w-36 md:w-44"
                >
                  <span className="size-2 rounded-full border-2 border-primary bg-background" />
                  <div className="h-[2px] flex-1 bg-border" />
                  <span className="size-2 rounded-full bg-primary" />
                </div>

                <span className="text-[11px] font-medium text-muted-foreground">
                  {journey.stopsLabel || display.stopsLabel || "Direct"}
                </span>
              </div>

              {/* Arrival */}
              <div className="flex flex-col items-end text-right">
                <span className="font-variant-numeric text-2xl font-black tracking-tight text-foreground tabular-nums sm:text-3xl">
                  {arriveTime}
                </span>
                <span className="mt-0.5 text-xs font-bold text-foreground sm:text-sm">
                  {journey.destination || display.destination}
                </span>
                <span className="text-[11px] text-muted-foreground sm:text-xs">
                  {resolveCity(journey.destination || display.destination)}
                </span>
              </div>
            </div>

            {/* Baggage & Cabin meta row — airline data only */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/30 px-3.5 py-2.5 text-xs font-medium text-muted-foreground">
              <span className="font-semibold text-foreground">
                {display.cabin || "Economy"}
              </span>
              {display.baggage ? (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <HugeiconsIcon icon={Luggage01Icon} size={14} aria-hidden="true" />
                    <span>{display.baggage}</span>
                  </span>
                </>
              ) : (
                <>
                  <span>•</span>
                  <span>Baggage allowance confirmed by the airline at booking</span>
                </>
              )}
            </div>

            {/* Fare & travel notes — explicit states only */}
            <div className="border-t border-border pt-4">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Fare notes
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
                {/* Cancellation policy */}
                <div className="flex flex-col gap-1 rounded-xl border border-border/80 bg-muted/20 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <HugeiconsIcon icon={Shield01Icon} size={14} aria-hidden="true" />
                    <span>Cancellation policy</span>
                  </div>
                  {refundable === true ? (
                    <span className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Refundable (fees may apply)
                    </span>
                  ) : refundable === false ? (
                    <span className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                      Non-refundable
                    </span>
                  ) : (
                    <span className="mt-1 text-xs font-bold text-muted-foreground">
                      Check fare rules at ticketing
                    </span>
                  )}
                </div>

                {/* General travel guidance — not presented as airline fare text */}
                <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-muted/10 p-3 text-xs leading-relaxed text-muted-foreground">
                  <HugeiconsIcon
                    icon={InformationCircleIcon}
                    size={15}
                    className="mt-0.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-1 text-[11px]">
                    <p>
                      General guidance — the airline&apos;s fare conditions
                      apply at ticketing. Date changes may incur fare
                      differences and reissue fees.
                    </p>
                    <p>
                      Check your visa and travel documents before departure.
                      Passports are commonly required to be valid for 6+ months
                      beyond travel — confirm against your destination&apos;s
                      current entry rules.
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
