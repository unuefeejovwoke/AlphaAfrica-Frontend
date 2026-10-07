"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  Calendar01Icon,
  Clock01Icon,
  LockIcon,
  Mail01Icon,
  Message01Icon,
  Ticket02Icon,
} from "@hugeicons/core-free-icons"
import { Button, ButtonLink, buttonVariants } from "@/components/ui/button"
import { CardSkeleton } from "@/components/ui/skeleton"
import { TrackLink } from "@/components/analytics/track-link"
import {
  payFlightBooking,
  formatTicketingDeadline,
  type FlightBooking,
  type FlightPayResult,
} from "@/lib/api/flight-bookings"
import { FactsList } from "@/components/flights/reservation-confirmation"
import { ApiError, getPaymentSafetyCopy } from "@/lib/api/client"
import { formatNaira } from "@/lib/format"
import { cn } from "@/lib/utils"
import { getSupportWhatsAppUrl } from "@/lib/content/company"

type PayPageState =
  /** Reading live state from the backend. Never renders anything conclusive. */
  | { kind: "loading" }
  /** Payable: the Customer sees what they are about to pay for. */
  | { kind: "payable"; result: Extract<FlightPayResult, { kind: "checkout" }> }
  /** Terminal: already paid. Rendered, never charged again. */
  | { kind: "already_paid"; message: string; booking: FlightBooking }
  /** The secure link is invalid or expired. Not a sign-in problem. */
  | { kind: "invalid_link" }
  /** Not payable, or the call failed. The backend's own reason is shown. */
  | { kind: "unavailable"; message: string; reference: string | null }

/**
 * Why 403 gets its own copy instead of the shared session message: the shared
 * mapper renders it as "This action needs a signed-in session. Please log in
 * and try again." That is actively wrong here. An expired reservation link
 * cannot be fixed by logging in, and sending a Guest holding a valid Booking to
 * a sign-in page is a dead end. The shared mapper is left alone because its
 * message is correct for genuinely authenticated actions (ADR-0007).
 */
const INVALID_LINK_MESSAGE =
  "This link may have expired, or it may already have been used. Your booking is safe — contact Alphaa and we will help you pay, or send you a fresh link."

/**
 * `/flights/pay?reference=…&email=…&token=…` — the destination of the "Pay Now
 * to Confirm" button in the reservation email (guide §9).
 *
 * This is the most money-anxious click in the product: the Customer has just
 * followed a link from an email and is about to hand over money. So it shows
 * what they are about to pay for and waits for an explicit action rather than
 * bouncing them straight to Paystack. No automatic redirect on load.
 *
 * Nothing conclusive renders on the server — the page is a static shell and all
 * state is read live on the client, because a token-bearing URL may be opened
 * on any device, long after the email was sent. It works for a Guest with no
 * account, on a phone, on a cold browser.
 */
export function FlightPayClient() {
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference")?.trim() || null
  const token = searchParams.get("token")?.trim() || null
  const [state, setState] = React.useState<PayPageState>({ kind: "loading" })
  const [leaving, setLeaving] = React.useState(false)

  React.useEffect(() => {
    if (!reference) return
    let cancelled = false
    ;(async () => {
      setState({ kind: "loading" })
      try {
        const result = await payFlightBooking({
          reference,
          ...(token ? { token } : {}),
        })
        if (cancelled) return
        // Opening the email link twice is harmless: the second visit resolves
        // to the terminal branch and renders the paid Booking instead.
        setState(
          result.kind === "checkout"
            ? { kind: "payable", result }
            : {
                kind: "already_paid",
                message: result.message,
                booking: result.booking,
              }
        )
      } catch (error) {
        if (cancelled) return
        if (error instanceof ApiError && error.code === "forbidden") {
          setState({ kind: "invalid_link" })
          return
        }
        setState({
          kind: "unavailable",
          message:
            error instanceof ApiError && error.message
              ? error.message
              : "We could not open payment for this reservation. No payment was taken.",
          reference,
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reference, token])

  if (!reference) {
    return (
      <Frame>
        <Notice
          tone="error"
          title="We couldn't find your reservation reference."
          body="This link is missing its booking reference, so there is nothing to pay yet. Open the button in your reservation email instead — it carries everything needed."
          foot={getPaymentSafetyCopy()}
        />
      </Frame>
    )
  }

  if (state.kind === "loading") {
    return (
      <Frame>
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-3 py-6 text-center"
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HugeiconsIcon
              icon={Clock01Icon}
              size={24}
              className="animate-pulse motion-reduce:animate-none"
              aria-hidden="true"
            />
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Checking your reservation…
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            This page will not take your money. We are confirming the Booking you
            are about to pay for before handing you to our payment provider.
          </p>
        </div>
        <CardSkeleton />
      </Frame>
    )
  }

  if (state.kind === "already_paid") {
    return (
      <Frame>
        <Notice
          tone="success"
          title="This booking is already paid."
          body={state.message}
          icon={Ticket02Icon}
          reference={state.booking.reference}
        >
          <BookingFacts booking={state.booking} />
        </Notice>
        <ButtonLink
          href={`/order?reference=${encodeURIComponent(state.booking.reference)}`}
          size="lg"
          className="w-full justify-center"
        >
          <span>View your ticket and confirmation</span>
        </ButtonLink>
      </Frame>
    )
  }

  if (state.kind === "invalid_link") {
    return (
      <Frame>
        <Notice
          tone="error"
          title="This reservation link is no longer valid."
          body={INVALID_LINK_MESSAGE}
          icon={AlertCircleIcon}
          foot={getPaymentSafetyCopy()}
        >
          <SupportHatch context="a reservation link that is no longer valid" />
        </Notice>
        <ButtonLink
          href="/flights"
          variant="outline"
          className="w-full justify-center"
        >
          <span>Search flights again</span>
        </ButtonLink>
      </Frame>
    )
  }

  if (state.kind === "unavailable") {
    return (
      <Frame>
        <Notice
          tone="error"
          title="This reservation can no longer be paid."
          body={state.message}
          icon={AlertCircleIcon}
          foot={getPaymentSafetyCopy()}
          reference={state.reference}
        >
          <SupportHatch context="a reservation that can no longer be paid" />
        </Notice>
        <ButtonLink href="/flights" className="w-full justify-center">
          <span>Search flights again</span>
        </ButtonLink>
      </Frame>
    )
  }

  const deadline = formatTicketingDeadline(state.result.ticketing_deadline)
  const booking = state.result.booking

  return (
    <Frame>
      <section
        aria-label="Confirm your payment"
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
      >
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-[10px] font-black tracking-wider text-amber-700 uppercase">
            <HugeiconsIcon icon={Clock01Icon} size={12} aria-hidden="true" />
            Reserved — payment due
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Confirm and pay for your flight
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your seat is held with the airline. Check what you are paying for
            before we hand you to our payment provider.
          </p>
        </div>

        {booking ? <BookingFacts booking={booking} /> : null}

        {deadline && !booking ? (
          <p className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5 text-sm leading-relaxed text-foreground">
            <HugeiconsIcon
              icon={Calendar01Icon}
              size={16}
              className="mt-0.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              Pay by <strong className="font-bold">{deadline}</strong> to keep
              this seat held with the airline.
            </span>
          </p>
        ) : null}

        {/* The only place money moves. replace(), not assign, so Back never
            returns to a payable checkout. */}
        <Button
          type="button"
          size="lg"
          isLoading={leaving}
          disabled={leaving}
          onClick={() => {
            setLeaving(true)
            window.location.replace(state.result.authorization_url)
          }}
          className="w-full justify-center"
        >
          <HugeiconsIcon icon={LockIcon} size={16} aria-hidden="true" />
          <span>
            {leaving
              ? "Taking you to secure payment…"
              : "Continue to secure payment"}
          </span>
        </Button>

        <p className="flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-muted-foreground">
          <HugeiconsIcon
            icon={Mail01Icon}
            size={14}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <span>
            You can close this page and pay later — a Pay Now link is already in
            your inbox
            {deadline ? `, and your seat is held until ${deadline}` : ""}.
          </span>
        </p>
      </section>
    </Frame>
  )
}

/**
 * Shared frame. The progress header lives in the page (as on /flights/verify) and
 * stays on Checkout: holding a Reservation is not confirmation (story 57).
 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pt-6 sm:pt-8">
      {children}
    </div>
  )
}

function Notice({
  tone,
  title,
  body,
  icon,
  foot,
  reference,
  children,
}: {
  tone: "error" | "success"
  title: string
  body: string
  icon?: typeof AlertCircleIcon
  foot?: React.ReactNode
  reference?: string | null
  children?: React.ReactNode
}) {
  const error = tone === "error"
  return (
    <div
      role={error ? "alert" : "status"}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:p-6",
        error ? "border-destructive/25" : "border-emerald-500/25"
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-2xl",
            error
              ? "bg-destructive/10 text-destructive"
              : "bg-emerald-500/10 text-emerald-600"
          )}
        >
          <HugeiconsIcon
            icon={icon ?? (error ? AlertCircleIcon : Ticket02Icon)}
            size={24}
            aria-hidden="true"
          />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          {foot ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {foot}
            </p>
          ) : null}
          {reference ? (
            <p className="font-variant-numeric text-xs break-all text-muted-foreground tabular-nums">
              Reference: {reference}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  )
}

/**
 * What the Customer actually holds, read from the Booking the backend returned.
 * Only the reference travels in the URL — no passport, date of birth, contact
 * detail, or payment data ever reaches the device here.
 */
function BookingFacts({ booking }: { booking: FlightBooking }) {
  const rows: Array<[string, string]> = []
  if (booking.origin && booking.destination) {
    rows.push(["Route", `${booking.origin} → ${booking.destination}`])
  }
  if (booking.departure_date) {
    rows.push([
      "Departure",
      formatTicketingDeadline(booking.departure_date) ?? booking.departure_date,
    ])
  }
  if (booking.pnr) rows.push(["Airline PNR", booking.pnr])
  rows.push(["Amount", formatNaira(String(booking.total_amount))])
  const deadline = formatTicketingDeadline(booking.ticketing_deadline)
  if (deadline) rows.push(["Pay by", deadline])

  return <FactsList rows={rows} />
}

function SupportHatch({ context }: { context: string }) {
  return (
    <TrackLink
      event="support_click"
      eventProps={{ context, channel: "whatsapp" }}
      href={getSupportWhatsAppUrl(context)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "outline" }),
        "w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
      )}
    >
      <HugeiconsIcon icon={Message01Icon} size={18} aria-hidden="true" />
      <span>Contact support on WhatsApp</span>
    </TrackLink>
  )
}