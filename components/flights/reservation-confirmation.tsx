"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar01Icon,
  Copy01Icon,
  LockIcon,
  Mail01Icon,
  Message01Icon,
  PrinterIcon,
  Ticket02Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { Button, buttonVariants } from "@/components/ui/button"
import { TrackLink } from "@/components/analytics/track-link"
import {
  describeTicketingUrgency,
  formatTicketingDeadline,
  type FlightBooking,
} from "@/lib/api/flight-bookings"
import { ApiError } from "@/lib/api/client"
import { parseBookingForETicket } from "@/components/flights/flight-e-ticket"
import { formatNaira } from "@/lib/format"
import { cn } from "@/lib/utils"
import { getSupportWhatsAppUrl } from "@/lib/content/company"

export interface ReservationConfirmationProps {
  booking: FlightBooking
  /** Pay immediately anyway — completing ends on the same confirmation a direct payment produces. */
  onPayNow: () => void
  paying?: boolean
  payError?: string | null
}

/**
 * Customer copy for a failed pay-now-anyway attempt. A 403 means an invalid or
 * expired secure link — never the shared "please log in" message, which is
 * actively wrong for a Guest holding a valid Booking (ADR-0007).
 */
export function getReservedPayErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "forbidden") {
    return "This reservation link is no longer valid. Contact Alphaa and we will help you pay or send a fresh link."
  }
  return error instanceof ApiError && error.message
    ? error.message
    : "We could not open payment just now. No payment was taken."
}

/** Shared definition-list rows for held-booking facts. */
export function FactsList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="flex flex-col gap-2.5 rounded-xl bg-muted/30 p-4 text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5 last:border-b-0 last:pb-0"
        >
          <dt className="font-semibold text-muted-foreground">{label}</dt>
          <dd className="font-variant-numeric text-right font-bold break-all text-foreground tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The Reservation confirmation: what the Customer now holds. Renders from the
 * **Booking** — what is actually held — never from the checkout trip summary,
 * which shows what was searched. If the fare moved between search and
 * creation, showing the searched summary next to a held Booking would be a lie.
 */
export function ReservationConfirmation({
  booking,
  onPayNow,
  paying,
  payError,
}: ReservationConfirmationProps) {
  const ticket = React.useMemo(() => parseBookingForETicket(booking), [booking])
  const [copied, setCopied] = React.useState(false)
  const deadline = formatTicketingDeadline(booking.ticketing_deadline)
  const urgency = describeTicketingUrgency(booking.ticketing_deadline)
  const pnr = booking.pnr?.trim() || null

  const copyPnr = React.useCallback(async () => {
    if (!pnr) return
    try {
      await navigator.clipboard.writeText(pnr)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard may be unavailable — the PNR stays selectable by hand.
    }
  }, [pnr])

  const travellerCount =
    booking.num_adults + booking.num_children + booking.num_infants

  return (
    <section
      aria-label="Your reserved booking"
      className="flex flex-col gap-4 rounded-2xl border border-amber-500/30 bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-[10px] font-black tracking-wider text-amber-700 uppercase">
          <HugeiconsIcon icon={Ticket02Icon} size={12} aria-hidden="true" />
          Reserved — payment due
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Your seat is reserved
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your seat is held with the airline — it is not ticketed yet. Pay
          before the deadline below and the e-ticket follows automatically.
        </p>
      </div>

      {pnr ? (
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/30 p-4">
          <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Airline PNR — quote this to the airline
          </span>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-2xl font-black tracking-widest text-foreground select-all sm:text-3xl">
              {pnr}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyPnr}
              aria-label={copied ? "PNR copied" : "Copy PNR"}
              className="shrink-0"
            >
              <HugeiconsIcon
                icon={copied ? Tick01Icon : Copy01Icon}
                size={14}
                aria-hidden="true"
              />
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
          <span className="font-mono text-xs break-all text-muted-foreground">
            Booking reference: <span className="select-all">{booking.reference}</span>
          </span>
        </div>
      ) : (
        <p className="font-mono text-sm break-all text-muted-foreground">
          Booking reference: <span className="select-all">{booking.reference}</span>
        </p>
      )}

      {deadline ? (
        <p className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5 text-sm leading-relaxed text-foreground">
          <HugeiconsIcon
            icon={Calendar01Icon}
            size={16}
            className="mt-0.5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span>
            Pay by <strong className="font-bold">{deadline}</strong>
            {urgency ? ` — ${urgency}` : ""}. After that the airline releases
            your seat.
          </span>
        </p>
      ) : null}

      <p className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5 text-sm leading-relaxed text-foreground">
        <HugeiconsIcon
          icon={Mail01Icon}
          size={16}
          className="mt-0.5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span>
          A Pay Now link is on its way to your email. You can close this page
          and come back any time before the deadline.
        </span>
      </p>

      <FactsList
        rows={[
          ["Route", `${ticket.origin || "—"} → ${ticket.destination || "—"}`],
          ["Departure", ticket.departFormatted.full],
          [
            "Travellers",
            travellerCount > 0
              ? String(travellerCount)
              : String(ticket.travelersList.length || "—"),
          ],
          [
            "Amount due",
            `${formatNaira(String(booking.total_amount))} ${booking.currency || "NGN"}`,
          ],
        ]}
      />
      {ticket.legs.length > 1 ? (
        <div className="flex flex-col gap-1 rounded-xl bg-muted/30 p-4 pt-2 text-sm">
          <span className="font-semibold text-muted-foreground">
            Itinerary held
          </span>
          {ticket.legs.map((leg, idx) => (
            <span key={idx} className="text-xs font-semibold text-foreground">
              {leg.origin || "—"} → {leg.destination || "—"}
              {leg.flightNumber ? ` · ${leg.flightNumber}` : ""} ·{" "}
              {leg.stopsLabel}
            </span>
          ))}
        </div>
      ) : null}

      {payError ? (
        <p role="alert" className="text-sm leading-relaxed text-destructive">
          {payError}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          isLoading={!!paying}
          disabled={!!paying}
          onClick={onPayNow}
          className="w-full justify-center"
        >
          <HugeiconsIcon icon={LockIcon} size={16} aria-hidden="true" />
          <span>
            {paying ? "Opening secure payment…" : "Pay now anyway"}
          </span>
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="flex-1 justify-center"
          >
            <HugeiconsIcon icon={PrinterIcon} size={16} aria-hidden="true" />
            <span>Print / save</span>
          </Button>
          <TrackLink
            event="support_click"
            eventProps={{
              context: "a flight reservation confirmation",
              channel: "whatsapp",
            }}
            href={getSupportWhatsAppUrl(
              `flight reservation ${booking.reference}`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex-1 justify-center"
            )}
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </TrackLink>
        </div>
      </div>
    </section>
  )
}
