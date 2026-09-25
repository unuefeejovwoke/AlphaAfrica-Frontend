"use client"

import * as React from "react"
import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Calendar01Icon,
  Clock01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { formatNaira } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { FlightBooking } from "@/lib/api/flight-bookings"
import type { PaymentOrder } from "@/lib/api/payments"
import { AirlineLogo } from "@/components/flights/airline-logo"

export interface FlightETicketProps {
  booking: FlightBooking
  order?: PaymentOrder | null
  className?: string
}

const AIRLINE_NAMES: Record<string, string> = {
  ET: "Ethiopian Airlines",
  KQ: "Kenya Airways",
  WB: "RwandAir",
  AT: "Royal Air Maroc",
  MS: "EgyptAir",
  EK: "Emirates",
  QR: "Qatar Airways",
  WY: "Oman Air",
  TK: "Turkish Airlines",
  SV: "Saudia",
  BA: "British Airways",
  VS: "Virgin Atlantic",
  LH: "Lufthansa",
  AF: "Air France",
  KL: "KLM Royal Dutch Airlines",
  P4: "Air Peace",
  QI: "Ibom Air",
  Q9: "Green Africa Airways",
  U4: "United Nigeria Airlines",
  W3: "Arik Air",
  VM: "Max Air",
  OF: "Overland Airways",
  DL: "Delta Air Lines",
  UA: "United Airlines",
  AA: "American Airlines",
}

const AIRPORT_CITIES: Record<string, string> = {
  LOS: "Lagos",
  ABV: "Abuja",
  PHC: "Port Harcourt",
  KAN: "Kano",
  ENU: "Enugu",
  QUO: "Uyo",
  DXB: "Dubai",
  LHR: "London",
  LGW: "London",
  JFK: "New York",
  NBO: "Nairobi",
  ACC: "Accra",
  ADD: "Addis Ababa",
  DOH: "Doha",
  IST: "Istanbul",
  CDG: "Paris",
  FRA: "Frankfurt",
  AMS: "Amsterdam",
  JNB: "Johannesburg",
  CAI: "Cairo",
  KGL: "Kigali",
  CMN: "Casablanca",
}

/** Format ISO or date string to display format matching the official e-ticket: "Sep 27, 2026, 01:40 PM" */
function formatETicketDateTime(dateStr?: string | null): {
  date: string
  time: string
  full: string
} {
  if (!dateStr || dateStr === "—") {
    return { date: "Scheduled", time: "", full: "Scheduled" }
  }

  const isoMatch = dateStr.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/
  )
  if (isoMatch) {
    const [, year, month, day, hour, min] = isoMatch
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]
    const monthName = months[parseInt(month, 10) - 1] || month
    const formattedDate = `${monthName} ${parseInt(day, 10)}, ${year}`

    if (hour !== undefined && min !== undefined) {
      let h = parseInt(hour, 10)
      const m = min
      const ampm = h >= 12 ? "PM" : "AM"
      h = h % 12 || 12
      const formattedTime = `${String(h).padStart(2, "0")}:${m} ${ampm}`
      return {
        date: formattedDate,
        time: formattedTime,
        full: `${formattedDate}, ${formattedTime}`,
      }
    }
    return { date: formattedDate, time: "", full: formattedDate }
  }

  return { date: dateStr, time: "", full: dateStr }
}

export function parseBookingForETicket(booking: FlightBooking) {
  // 1. Travelers extraction
  let rawTravelers: Array<Record<string, unknown>> = []
  if (Array.isArray(booking.travelers)) {
    rawTravelers = booking.travelers as Array<Record<string, unknown>>
  } else if (
    typeof booking.travelers === "string" &&
    booking.travelers.trim()
  ) {
    try {
      const parsed = JSON.parse(booking.travelers)
      if (Array.isArray(parsed)) rawTravelers = parsed
    } catch {
      // ignore
    }
  }

  const travelersList = rawTravelers.map((t, idx) => {
    const first = typeof t.first_name === "string" ? t.first_name.trim() : ""
    const last = typeof t.last_name === "string" ? t.last_name.trim() : ""
    const fullName =
      `${first} ${last}`.trim().toUpperCase() || `PASSENGER ${idx + 1}`
    const rawType =
      typeof t.type === "string"
        ? t.type
        : typeof t.traveler_type === "string"
          ? t.traveler_type
          : "ADULT"
    const typeLabel =
      rawType === "CHILD"
        ? "Child"
        : rawType === "HELD_INFANT"
          ? "Infant"
          : "Adult"
    return { name: fullName, type: typeLabel }
  })

  const primaryPassenger =
    travelersList[0]?.name ||
    booking.contact_name.trim().toUpperCase() ||
    "PRIMARY PASSENGER"

  // 2. Flight Details extraction
  let rawDetails: Record<string, unknown> = {}
  if (
    typeof booking.flight_details === "object" &&
    booking.flight_details !== null
  ) {
    rawDetails = booking.flight_details as Record<string, unknown>
  } else if (
    typeof booking.flight_details === "string" &&
    booking.flight_details.trim()
  ) {
    try {
      const parsed = JSON.parse(booking.flight_details)
      if (typeof parsed === "object" && parsed !== null) rawDetails = parsed
    } catch {
      // ignore
    }
  }

  const airlineCode =
    (typeof rawDetails.airline_code === "string" &&
      rawDetails.airline_code.trim()) ||
    (typeof rawDetails.airline === "string" && rawDetails.airline.trim()) ||
    ""

  const cabin =
    (typeof rawDetails.cabin === "string" &&
      rawDetails.cabin.trim().toUpperCase()) ||
    "ECONOMY"

  let duration = ""
  let stops = 0
  let flightNumber = ""
  let departAtIso = booking.departure_date
  let arriveAtIso = booking.return_date || booking.departure_date

  const itineraries = Array.isArray(rawDetails.itineraries)
    ? (rawDetails.itineraries as Array<Record<string, unknown>>)
    : []

  if (itineraries.length > 0) {
    const firstItin = itineraries[0]
    if (typeof firstItin.duration === "string") duration = firstItin.duration
    if (typeof firstItin.stops === "number") stops = firstItin.stops

    const segments = Array.isArray(firstItin.segments)
      ? (firstItin.segments as Array<Record<string, unknown>>)
      : []

    if (segments.length > 0) {
      const firstSeg = segments[0]
      const lastSeg = segments[segments.length - 1]

      if (typeof firstSeg.flight_number === "string") {
        flightNumber = firstSeg.flight_number
      }
      if (typeof firstSeg.depart_at === "string") {
        departAtIso = firstSeg.depart_at
      }
      if (typeof lastSeg.arrive_at === "string") {
        arriveAtIso = lastSeg.arrive_at
      }
      if (!stops && segments.length > 1) {
        stops = segments.length - 1
      }
    }
  }

  const effectiveAirlineCode = (airlineCode || "FLIGHT").toUpperCase()
  const effectiveFlightNumber = flightNumber
    ? flightNumber.startsWith(effectiveAirlineCode)
      ? flightNumber
      : `${effectiveAirlineCode}${flightNumber}`
    : booking.reference.slice(-4) || "900"

  const airlineName =
    AIRLINE_NAMES[effectiveAirlineCode] ||
    (typeof rawDetails.airline_name === "string" && rawDetails.airline_name) ||
    effectiveAirlineCode

  const stopsLabel =
    stops === 0 ? "Non-stop" : stops === 1 ? "1 Stop" : `${stops} Stops`

  const departFormatted = formatETicketDateTime(departAtIso)
  const arriveFormatted = formatETicketDateTime(arriveAtIso)

  const pnr = booking.pnr?.trim() || null
  const reference = booking.reference.trim()
  const securityReference =
    reference.replace(/^[A-Z]+-?/, "").slice(0, 10) || reference.slice(-8)

  return {
    primaryPassenger,
    travelersList,
    carrierCode: effectiveAirlineCode,
    flightNumber: effectiveFlightNumber,
    airlineName,
    cabin,
    duration: duration || "Scheduled",
    stops,
    stopsLabel,
    origin: booking.origin || "LOS",
    originCity: AIRPORT_CITIES[booking.origin] || "",
    destination: booking.destination || "DXB",
    destinationCity: AIRPORT_CITIES[booking.destination] || "",
    departFormatted,
    arriveFormatted,
    pnr,
    reference,
    securityReference,
    amountFormatted: formatNaira(String(booking.total_amount)),
    currency: booking.currency || "NGN",
  }
}

/**
 * Official E-Ticket & Boarding Pass Document.
 * Designed to feel like a high-end luxury physical ticket with brand identity:
 * - Brand plum (`#571563`) and brand orange (`#FF6738`) accents
 * - Iconic perforation cutouts and dashed separator
 * - Complete flight and traveler metadata
 * - High-fidelity print styles (@media print) for pixel-perfect PDF export
 */
export function FlightETicket({
  booking,
  order,
  className,
}: FlightETicketProps) {
  const data = React.useMemo(() => parseBookingForETicket(booking), [booking])

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-2xl rounded-2xl border border-border/80 bg-card p-4 text-card-foreground shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] sm:rounded-[2rem] sm:p-6 md:p-8 dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]",
        "print:max-w-2xl print:shadow-none",
        className
      )}
    >
      {/* Top Header of Ticket */}
      <div className="flex items-start justify-between gap-2.5 sm:gap-4">
        {/* Left: Brand Monogram + Tagline */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted/30 p-1 sm:size-10">
            <Image
              src="/android-chrome-192x192.png"
              alt="Alphaa Africa"
              width={32}
              height={32}
              className="size-7 object-contain sm:size-8"
              priority
            />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-black tracking-tight text-foreground uppercase sm:text-sm md:text-base">
              ALPHAA<span className="font-medium text-primary">.AFRICA</span>
            </span>
            <span className="truncate text-[8.5px] font-extrabold tracking-[0.14em] text-primary uppercase sm:text-[10px] sm:tracking-[0.18em]">
              TRAVELS OFFICIAL E-TICKET
            </span>
          </div>
        </div>

        {/* Right: PNR / Booking Reference Box */}
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase sm:text-[10px]">
            PNR REFERENCE CODE
          </span>
          <div className="mt-1 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 font-mono text-xs font-black tracking-wider text-foreground select-all sm:rounded-xl sm:px-3.5 sm:py-1.5 sm:text-sm md:text-base">
            {data.pnr || data.reference}
          </div>
        </div>
      </div>

      {/* Ticket Perforated Divider with Iconic Side Cutouts */}
      <div className="relative -mx-4 my-5 flex items-center sm:-mx-6 sm:my-6 md:-mx-8">
        {/* Left Cutout Notch (bites into the card from the page background) */}
        <div
          aria-hidden="true"
          className="-ml-3 size-6 rounded-full border-y border-r border-border/80 bg-[#FAF9F7] shadow-[inset_-2px_0_3px_rgba(0,0,0,0.04)] sm:-ml-3.5 sm:size-7 md:-ml-4 md:size-8 dark:bg-background"
        />

        {/* Dashed Line */}
        <div className="mx-1.5 flex-1 border-t-2 border-dashed border-border/80 sm:mx-2" />

        {/* Right Cutout Notch */}
        <div
          aria-hidden="true"
          className="-mr-3 size-6 rounded-full border-y border-l border-border/80 bg-[#FAF9F7] shadow-[inset_2px_0_3px_rgba(0,0,0,0.04)] sm:-mr-3.5 sm:size-7 md:-mr-4 md:size-8 dark:bg-background"
        />
      </div>

      {/* Carrier & Flight Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase sm:text-[10px]">
            CARRIER &amp; FLIGHT
          </span>
          <div className="mt-0.5 flex items-center gap-1.5 sm:gap-2">
            <AirlineLogo
              airline={data.airlineName}
              carrierCode={data.carrierCode}
              size="sm"
            />
            <span className="text-base font-black tracking-tight text-primary sm:text-lg md:text-xl">
              {data.carrierCode} · {data.flightNumber}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end text-right">
          <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase sm:text-[10px]">
            CABIN / CLASS
          </span>
          <span className="mt-0.5 text-xs font-extrabold tracking-wide text-foreground uppercase sm:text-sm md:text-base">
            {data.cabin}
          </span>
        </div>
      </div>

      {/* Brand Accent Hairline */}
      <div className="my-3.5 h-[2px] w-full bg-gradient-to-r from-secondary/40 via-primary/30 to-transparent sm:my-4" />

      {/* Flight Route Visual Section */}
      <div className="my-4 rounded-xl border border-border/70 bg-muted/30 p-3.5 sm:my-5 sm:rounded-2xl sm:p-5 md:p-6 dark:bg-muted/15">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 md:gap-6">
          {/* Origin */}
          <div className="flex min-w-0 flex-col items-start">
            <span className="font-sans text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl">
              {data.origin}
            </span>
            {data.originCity ? (
              <span className="max-w-full truncate text-[10px] font-semibold text-muted-foreground uppercase sm:text-[11px]">
                {data.originCity}
              </span>
            ) : null}
            <div className="mt-1 flex flex-col text-[11px] font-semibold text-muted-foreground sm:text-xs">
              <div className="flex items-center gap-1">
                <HugeiconsIcon
                  icon={Calendar01Icon}
                  size={13}
                  className="shrink-0 text-primary"
                />
                <span className="max-w-full truncate">
                  {data.departFormatted.date}
                </span>
              </div>
              {data.departFormatted.time ? (
                <span className="pl-4 text-[10px] font-medium text-foreground/80 sm:text-[11px]">
                  {data.departFormatted.time}
                </span>
              ) : null}
            </div>
          </div>

          {/* Center Flight Path */}
          <div className="flex flex-col items-center justify-center px-1">
            <span className="mb-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-extrabold tracking-wider whitespace-nowrap text-amber-700 uppercase sm:mb-2 sm:px-2.5 sm:py-1 sm:text-[10px] md:text-[11px] dark:text-amber-400">
              {data.duration} · {data.stopsLabel}
            </span>
            <div className="relative flex w-12 items-center justify-center sm:w-20 md:w-32">
              <div className="w-full border-t border-dashed border-border/80" />
              <span className="absolute flex size-6 items-center justify-center rounded-full border border-border/80 bg-card shadow-xs sm:size-7">
                <HugeiconsIcon
                  icon={Airplane01Icon}
                  size={13}
                  className="rotate-90 text-primary sm:size-3.5"
                />
              </span>
            </div>
          </div>

          {/* Destination */}
          <div className="flex min-w-0 flex-col items-end text-right">
            <span className="font-sans text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl">
              {data.destination}
            </span>
            {data.destinationCity ? (
              <span className="max-w-full truncate text-[10px] font-semibold text-muted-foreground uppercase sm:text-[11px]">
                {data.destinationCity}
              </span>
            ) : null}
            <div className="mt-1 flex flex-col items-end text-[11px] font-semibold text-muted-foreground sm:text-xs">
              <div className="flex items-center justify-end gap-1">
                <HugeiconsIcon
                  icon={Calendar01Icon}
                  size={13}
                  className="shrink-0 text-primary"
                />
                <span className="max-w-full truncate">
                  {data.arriveFormatted.date}
                </span>
              </div>
              {data.arriveFormatted.time ? (
                <span className="pr-4 text-[10px] font-medium text-foreground/80 sm:text-[11px]">
                  {data.arriveFormatted.time}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Passenger & Ticket Metadata (4-column grid) */}
      <div className="my-3 grid grid-cols-2 gap-3 border-t border-b border-border/70 py-3.5 text-left sm:my-4 sm:grid-cols-4 sm:gap-4 sm:py-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase sm:text-[10px]">
            PRIMARY PASSENGER
          </span>
          <span className="truncate text-xs font-black text-foreground uppercase sm:text-sm">
            {data.primaryPassenger}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase sm:text-[10px]">
            TRAVEL CLASS
          </span>
          <span className="text-xs font-extrabold text-foreground uppercase sm:text-sm">
            {data.cabin}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase sm:text-[10px]">
            SEAT STATUS
          </span>
          <span className="text-xs font-extrabold text-foreground sm:text-sm">
            Standard Assigned
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase sm:text-[10px]">
            SECURITY REFERENCE
          </span>
          <span className="truncate font-mono text-xs font-bold text-secondary sm:text-sm dark:text-primary">
            #{data.securityReference}
          </span>
        </div>
      </div>

      {/* Multi-Passenger Roster if booking contains more than 1 traveler */}
      {data.travelersList.length > 1 ? (
        <div className="my-3 flex flex-col gap-2 rounded-xl bg-muted/20 p-3 text-xs">
          <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase sm:text-[10px]">
            ALL TICKETED PASSENGERS ({data.travelersList.length})
          </span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {data.travelersList.map((t, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground sm:text-xs"
              >
                <span className="size-1.5 rounded-full bg-primary" />
                <span>{t.name}</span>
                <span className="text-[9px] font-normal text-muted-foreground sm:text-[10px]">
                  ({t.type})
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Itinerary Assignment Details Callout Box */}
      <div className="my-4 rounded-xl border border-secondary/20 bg-secondary/5 p-3.5 text-left sm:my-5 sm:rounded-2xl sm:p-5 dark:border-secondary/30 dark:bg-secondary/15">
        <span className="mb-1 block text-[9px] font-black tracking-[0.18em] text-secondary uppercase sm:text-[10px] dark:text-primary">
          ITINERARY ASSIGNMENT DETAILS
        </span>
        <p className="mb-1 text-xs font-black text-foreground sm:text-sm">
          {data.carrierCode} · {data.airlineName}
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          Standard scheduled flight service reference {data.flightNumber} from{" "}
          {data.origin} to {data.destination}. Please complete airline airport
          check-in at least 45 minutes prior to departure (2 to 3 hours
          recommended for international routes). Valid passport, entry visas,
          and boarding pass are required at security and gate clearance.
        </p>
      </div>

      {/* Card Status Footer */}
      <div className="mt-4 flex flex-col items-start justify-between gap-2.5 border-t border-border/80 pt-4 text-xs font-bold sm:mt-5 sm:flex-row sm:items-center sm:pt-5">
        <div className="flex items-center gap-1.5 text-[10px] tracking-wide sm:gap-2 sm:text-[11px]">
          <span className="text-muted-foreground uppercase">STATUS:</span>
          <span className="font-black text-emerald-600 uppercase dark:text-emerald-400">
            CONFIRMED &amp; ISSUED
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase sm:text-[11px] dark:text-emerald-400">
          <HugeiconsIcon icon={Tick01Icon} size={15} />
          <span>VERIFIED TICKET &amp; PNR ISSUED</span>
        </div>
      </div>
    </div>
  )
}
