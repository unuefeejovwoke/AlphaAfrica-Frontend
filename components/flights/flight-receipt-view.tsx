"use client"

import * as React from "react"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PrinterIcon } from "@hugeicons/core-free-icons"
import { Button, ButtonLink } from "@/components/ui/button"
import { FlightETicket } from "@/components/flights/flight-e-ticket"
import type { FlightBooking } from "@/lib/api/flight-bookings"
import type { PaymentOrder } from "@/lib/api/payments"
import { formatNaira } from "@/lib/format"
import { backdropFadeVariants, fadeInRiseVariants } from "@/lib/motion/variants"

export interface FlightReceiptViewProps {
  booking: FlightBooking
  order: PaymentOrder | null
  tickets: { ticketed: boolean; numbers: string[] } | null
  ticketsFailed: boolean
  onCheckTickets: () => void
}

/**
 * The paid Booking receipt a Paystack return lands on: confirmation header,
 * the official e-ticket document, and the actions around it.
 *
 * It renders purely from its props — no fetching, no session reads — so the
 * same view can be previewed with a fixture booking.
 */
export function FlightReceiptView({
  booking,
  order,
  tickets,
  ticketsFailed,
  onCheckTickets,
}: FlightReceiptViewProps) {
  // Prefer the freshest ticket numbers: the tickets endpoint when it
  // answered, else whatever the Booking itself carries.
  const ticketBooking: FlightBooking =
    tickets && tickets.numbers.length > 0
      ? { ...booking, ticket_numbers: tickets.numbers }
      : booking
  const issuing =
    tickets !== null &&
    !tickets.ticketed &&
    (ticketBooking.ticket_numbers ?? []).length === 0

  // Arrival is opacity-only on the wrapper so the e-ticket document —
  // PNR, references, ticket numbers — never shifts or scales. The
  // confident rise is scoped to the status header above the document.
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={backdropFadeVariants}
      className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 py-4 sm:gap-6 sm:py-8 print:max-w-2xl print:px-0 print:py-6"
    >
      {/* Verification Status Header (matches official e-ticket layout) */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInRiseVariants}
        className="flex flex-col items-center gap-2 text-center"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black tracking-wider text-emerald-600 uppercase sm:text-[11px]">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
          PAYMENT VERIFIED
        </span>

        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Booking confirmed
        </h1>

        <p className="max-w-sm px-2 text-sm leading-relaxed text-muted-foreground sm:max-w-md">
          Your payment is confirmed. Your official travel document is below —
          keep it for airport check-in.
        </p>
      </motion.div>

      {/* The Official E-Ticket Card */}
      <FlightETicket booking={ticketBooking} order={order} />

      {ticketsFailed ? (
        <p
          role="status"
          className="w-full rounded-xl bg-muted/40 p-3 text-center text-xs leading-relaxed text-muted-foreground print:hidden"
        >
          We couldn&apos;t check your e-ticket numbers just now — they will
          still arrive by email once issued.
        </p>
      ) : null}

      {/* Payment & Receipt Summary Strip */}
      <div className="flex w-full flex-col gap-2 rounded-xl border border-border/80 bg-card p-3 text-xs text-muted-foreground shadow-xs sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:p-4 print:shadow-none">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">Total Paid:</span>
          <span className="font-variant-numeric text-sm font-extrabold text-foreground tabular-nums">
            {formatNaira(String(booking.total_amount))}{" "}
            {booking.currency || "NGN"}
          </span>
          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
            Verified
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Reference:</span>
          <span className="font-mono font-bold break-all text-foreground select-all">
            {booking.reference}
          </span>
        </div>
      </div>

      {/* Action Controls (Print, Book Another) */}
      <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-center print:hidden">
        <Button
          type="button"
          size="lg"
          onClick={() => window.print()}
          className="w-full justify-center gap-2 font-bold shadow-sm transition-all hover:shadow-md sm:flex-1"
        >
          <HugeiconsIcon icon={PrinterIcon} size={18} aria-hidden="true" />
          <span>Print / Save E-Ticket (PDF)</span>
        </Button>

        <ButtonLink
          href="/flights"
          variant="outline"
          size="lg"
          className="w-full justify-center px-6 font-semibold sm:w-auto"
        >
          <span>Book another flight</span>
        </ButtonLink>
      </div>

      {/* A confirmed Booking whose e-ticket is not yet issued reads as being
          issued — with a way to check back — rather than as an incomplete
          document or an error. */}
      {issuing ? (
        <div
          role="status"
          aria-live="polite"
          className="flex w-full flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed sm:p-5 print:hidden"
        >
          <p className="font-bold text-foreground">
            Your ticket is being issued
          </p>
          <p className="text-muted-foreground">
            Payment is confirmed and the airline has your booking. E-ticket
            numbers are issued separately and will arrive by email — check back
            here any time to collect them.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onCheckTickets}
            className="w-full justify-center sm:w-auto"
          >
            <span>Check for my ticket numbers</span>
          </Button>
        </div>
      ) : null}

      {/* Travel Advisory & Next Steps */}
      <div className="w-full rounded-xl border border-border/80 bg-muted/20 p-4 text-left text-xs sm:rounded-2xl sm:p-5 sm:text-sm print:hidden">
        <p className="mb-2 text-[10px] font-black tracking-wider text-muted-foreground uppercase">
          WHAT HAPPENS NEXT
        </p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-xs leading-relaxed text-muted-foreground sm:pl-5">
          <li>
            Save or print this electronic ticket document. Keep your Booking
            Reference{" "}
            <span className="font-mono font-bold text-foreground">
              {booking.reference}
            </span>
            {booking.pnr ? (
              <>
                {" "}
                and PNR{" "}
                <span className="font-mono font-bold text-foreground">
                  {booking.pnr}
                </span>
              </>
            ) : (
              ""
            )}{" "}
            safe for airport check-in.
          </li>
          <li>
            Arrive at the airport terminal at least 2 to 3 hours prior to
            departure for international routes (1 hour for domestic flights).
          </li>
          <li>
            Present your original valid passport / national ID at the airline
            desk to collect your physical boarding passes and baggage tags.
          </li>
          <li>
            If you require flight changes, additional baggage, or special
            assistance, message our 24/7 concierge desk on WhatsApp anytime.
          </li>
        </ol>
      </div>
    </motion.div>
  )
}
