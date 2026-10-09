"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Message01Icon,
  AlertCircleIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { Button, ButtonLink, buttonVariants } from "@/components/ui/button"
import { CardSkeleton } from "@/components/ui/skeleton"
import { FlightReceiptView } from "@/components/flights/flight-receipt-view"
import {
  ReservationConfirmation,
  getReservedPayErrorMessage,
} from "@/components/flights/reservation-confirmation"
import {
  buildFlightVerifyUrl,
  clearBookingSession,
  fetchFlightTickets,
  flightBookingSchema,
  payFlightBooking,
  readPaymentReference,
  resolveFlightVerificationState,
  verifyFlightBooking,
  type FlightBooking,
} from "@/lib/api/flight-bookings"
import { clearFlightCheckoutSession } from "@/lib/api/flights"
import { clearSelectedDomesticCard } from "@/lib/api/domestic"
import { extractOrderDetails, type PaymentOrder } from "@/lib/api/payments"
import {
  emitVerificationEventOnce,
  fetchOrderWithSettleRetry,
  isPaidOrder,
} from "@/lib/api/verification"
import {
  ApiError,
  getHumanErrorMessage,
  getPaymentSafetyCopy,
} from "@/lib/api/client"
import { formatNaira } from "@/lib/format"
import { cn } from "@/lib/utils"
import { pluralize } from "@/lib/schemas/travel"
import { getSupportWhatsAppUrl } from "@/lib/content/company"
import { TrackLink } from "@/components/analytics/track-link"

type VerifyState =
  | { kind: "verifying" }
  | { kind: "resolved"; booking: FlightBooking; order: PaymentOrder | null }
  | { kind: "failed"; message: string }

function formatTravellerSummary(booking: FlightBooking): string | null {
  const parts: string[] = []
  if (booking.num_adults > 0) parts.push(pluralize(booking.num_adults, "adult"))
  if (booking.num_children > 0) {
    parts.push(
      booking.num_children === 1
        ? "1 child"
        : `${booking.num_children} children`
    )
  }
  if (booking.num_infants > 0)
    parts.push(pluralize(booking.num_infants, "infant"))
  return parts.length > 0 ? parts.join(" · ") : null
}

/**
 * Build a renderable Booking from the universal order's embedded details
 * when the module verify call fails (e.g. transient backend error after a
 * confirmed payment). Only the reference is guaranteed; everything else is
 * read defensively by renderers.
 */
function bookingFromOrder(
  reference: string,
  order: PaymentOrder
): FlightBooking | null {
  const details = extractOrderDetails(order)
  if (typeof details !== "object" || details === null) return null
  const parsed = flightBookingSchema.safeParse({
    ...(details as Record<string, unknown>),
    reference,
  })
  if (parsed.success) return parsed.data
  return flightBookingSchema.parse({ reference })
}

/**
 * Paystack return handler for flight Bookings. A return from payment proves
 * nothing by itself: this client reads the Payment Reference from the return
 * URL, fetches the universal order FIRST (guide §12 — it verifies money
 * movement and returns the Booking for any booking type), then the flight
 * verify call for the full Booking shape. Guests are welcome — verification
 * needs only the reference, plus the email `token` when present.
 *
 * For an international Flight Offer the PNR already existed before payment
 * (ADR-0007), so a PNR here proves the seat was held, never that money moved.
 */
export function FlightVerifyClient() {
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference")?.trim() || null
  const guestToken = searchParams.get("token")?.trim() || null
  const [savedReference] = React.useState<string | null>(readPaymentReference)
  const [state, setState] = React.useState<VerifyState>({ kind: "verifying" })
  const [attempt, setAttempt] = React.useState(0)
  // E-ticket numbers: fetched ONCE when a Booking is confirmed, never polled.
  // The backend emails the Customer the moment numbers appear, so a poll would
  // burn requests to learn nothing. A failed fetch is a note, not an error —
  // a merely-not-yet-issued ticket must never read as a failure.
  const [tickets, setTickets] = React.useState<{
    ticketed: boolean
    numbers: string[]
  } | null>(null)
  const [ticketsFailed, setTicketsFailed] = React.useState(false)
  const [ticketsAttempt, setTicketsAttempt] = React.useState(0)
  const [payingReserved, setPayingReserved] = React.useState(false)
  const [reservedPayError, setReservedPayError] = React.useState<string | null>(
    null
  )

  const resolvedBooking = state.kind === "resolved" ? state.booking : null
  const resolvedOrder: PaymentOrder | null =
    state.kind === "resolved" ? state.order : null
  const paid =
    resolvedBooking !== null &&
    (resolveFlightVerificationState(resolvedBooking) === "paid" ||
      isPaidOrder(resolvedOrder))

  // Ticket numbers resolve once a paid Booking exists — one read, on demand.
  React.useEffect(() => {
    if (
      state.kind !== "resolved" ||
      !paid ||
      tickets !== null ||
      ticketsFailed
    )
      return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetchFlightTickets({
          reference: state.booking.reference,
          ...(guestToken ? { token: guestToken } : {}),
        })
        if (!cancelled)
          setTickets({ ticketed: res.ticketed, numbers: res.ticket_numbers })
      } catch {
        if (!cancelled) setTicketsFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [state, paid, tickets, ticketsFailed, ticketsAttempt, guestToken])

  const handlePayReserved = React.useCallback(async () => {
    if (state.kind !== "resolved" || payingReserved) return
    setPayingReserved(true)
    setReservedPayError(null)
    try {
      const result = await payFlightBooking({
        reference: state.booking.reference,
        ...(guestToken ? { token: guestToken } : {}),
      })
      if (result.kind === "checkout") {
        window.location.replace(result.authorization_url)
        return
      }
      window.location.reload()
    } catch (error) {
      // 403 is an invalid/expired link, never a missing session — the shared
      // "please log in" mapper must not speak here (ADR-0007).
      setReservedPayError(getReservedPayErrorMessage(error))
      setPayingReserved(false)
    }
  }, [state, payingReserved, guestToken])

  React.useEffect(() => {
    if (!reference) return
    let cancelled = false
    ;(async () => {
      setState({ kind: "verifying" })
      try {
        // Primary: the universal order is the final word on money movement,
        // fetched through the shared seam (authoritative `payment_status`
        // read plus one settle retry while the webhook lands).
        let order: PaymentOrder | null = null
        let orderForbidden = false
        try {
          order = await fetchOrderWithSettleRetry(
            reference,
            guestToken ? { token: guestToken } : undefined
          )
        } catch (error) {
          if (error instanceof ApiError && error.code === "forbidden") {
            orderForbidden = true
          }
          order = null
        }
        if (cancelled) return
        if (orderForbidden) {
          throw new ApiError(
            "This confirmation link is invalid or has expired. Ask Alphaa to resend your receipt link.",
            { status: 403, code: "forbidden" }
          )
        }
        // Fallback/detail: the flight verify call carries the full Booking.
        let booking: FlightBooking | null = null
        try {
          booking = await verifyFlightBooking(reference)
        } catch {
          booking = null
        }
        if (cancelled) return
        if (!booking && order) {
          booking = bookingFromOrder(reference, order)
        }
        if (!booking) {
          throw new ApiError(
            "We could not confirm this payment yet. It may still be processing.",
            { status: null, code: "server" }
          )
        }
        setState({ kind: "resolved", booking, order })
        const paid =
          resolveFlightVerificationState(booking) === "paid" ||
          isPaidOrder(order)
        if (paid) {
          // Confirmation analytics fire exactly once per verified booking —
          // the reference stays out of analytics, coarse type only, and
          // retries or back navigation never double-fire.
          emitVerificationEventOnce(
            `${booking.reference}::flight_payment_completed`,
            "flight_payment_completed",
            { type: "flight" }
          )
          emitVerificationEventOnce(
            `${booking.reference}::flight_confirmation_viewed`,
            "flight_confirmation_viewed",
            { type: "flight" }
          )
          // Payment is final: drop every session-backed checkout input so
          // back/forward can never re-enter checkout with a completed trip.
          // The verify page keeps rendering from its fetched booking, and the
          // reference stays in the URL for refreshes.
          clearFlightCheckoutSession()
          clearSelectedDomesticCard()
          clearBookingSession()
        }
      } catch (error) {
        if (cancelled) return
        setState({ kind: "failed", message: getHumanErrorMessage(error) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reference, guestToken, attempt])

  if (!reference) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
        <div
          role="alert"
          className="flex flex-col gap-4 rounded-2xl border border-destructive/25 bg-card p-6 sm:p-8"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              size={22}
              aria-hidden="true"
            />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              We couldn&apos;t find your payment reference.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This confirmation link is missing its reference, so there is
              nothing to verify yet. Your money is safe — no booking was created
              from this page.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {getPaymentSafetyCopy()}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {savedReference ? (
              <ButtonLink
                href={buildFlightVerifyUrl(savedReference)}
                className="w-full justify-center"
              >
                <span>Resume with your saved reference</span>
              </ButtonLink>
            ) : null}
            <TrackLink
              event="support_click"
              eventProps={{
                context: "flight verify missing reference",
                channel: "whatsapp",
              }}
              href={getSupportWhatsAppUrl("flight booking payment")}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants(),
                "w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={18}
                aria-hidden="true"
              />
              <span>Contact support on WhatsApp</span>
            </TrackLink>
            <ButtonLink
              href="/flights"
              variant="ghost"
              className="w-full justify-center"
            >
              <span>Back to flight search</span>
            </ButtonLink>
          </div>
        </div>
      </div>
    )
  }

  if (state.kind === "verifying") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HugeiconsIcon
              icon={Clock01Icon}
              size={24}
              className="animate-pulse motion-reduce:animate-none"
              aria-hidden="true"
            />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Confirming your payment…
          </h1>
          <p
            className="max-w-md text-sm leading-relaxed text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Checking reference{" "}
            <span className="font-variant-numeric font-semibold break-all tabular-nums">
              {reference}
            </span>{" "}
            with Paystack. Do not close this page yet — returning here does not
            mean the payment succeeded.
          </p>
        </div>
        <CardSkeleton />
      </div>
    )
  }

  if (state.kind === "failed") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
        <div
          role="alert"
          className="flex flex-col gap-4 rounded-2xl border border-destructive/25 bg-card p-6 sm:p-8"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              size={22}
              aria-hidden="true"
            />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              We couldn&apos;t confirm your payment yet.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {state.message}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {getPaymentSafetyCopy()}
            </p>
            <p className="font-variant-numeric mt-1 text-xs break-all text-muted-foreground tabular-nums">
              Reference: {reference}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              variant="outline"
              className="w-full justify-center"
            >
              <span>Check payment again</span>
            </Button>
            <TrackLink
              event="support_click"
              eventProps={{
                context: "unresolved flight payment",
                channel: "whatsapp",
              }}
              href={getSupportWhatsAppUrl(`flight booking ${reference}`)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants(),
                "w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={18}
                aria-hidden="true"
              />
              <span>Contact support on WhatsApp</span>
            </TrackLink>
          </div>
        </div>
      </div>
    )
  }

  const { booking, order } = state

  // A Reservation reads as reserved — seat held, pay-by date, payment action —
  // never as a payment still settling. The shared ReservationConfirmation keeps
  // this identical to the checkout confirmation.
  if (!paid && resolveFlightVerificationState(booking) === "reserved") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 py-4 sm:gap-6 sm:py-8">
        <ReservationConfirmation
          booking={booking}
          onPayNow={handlePayReserved}
          paying={payingReserved}
          payError={reservedPayError}
        />
      </div>
    )
  }

  if (paid) {
    return (
      <FlightReceiptView
        booking={booking}
        order={order}
        tickets={tickets}
        ticketsFailed={ticketsFailed}
        onCheckTickets={() => {
          setTickets(null)
          setTicketsFailed(false)
          setTicketsAttempt((n) => n + 1)
        }}
      />
    )
  }

  const outcome = resolveFlightVerificationState(booking)
  const stillProcessing = outcome === "pending"
  const bookingContext = `${booking.origin} → ${booking.destination}, ${formatNaira(String(booking.total_amount))}`
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
      <div
        role={stillProcessing ? "status" : "alert"}
        aria-live={stillProcessing ? "polite" : "assertive"}
        className="flex flex-col gap-4 rounded-2xl border border-destructive/25 bg-card p-6 sm:p-8"
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <HugeiconsIcon
            icon={stillProcessing ? Clock01Icon : AlertCircleIcon}
            size={22}
            aria-hidden="true"
          />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {stillProcessing
              ? "Still processing — check again in a moment."
              : "Your booking was not completed."}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {stillProcessing
              ? "We checked with Paystack and this payment is not complete yet. It may still be processing — wait a moment and check again rather than paying a second time."
              : "Your booking was not completed. If payment was deducted, our team can locate and reconcile it. Keep your reference and contact Alphaa."}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {getPaymentSafetyCopy()}
          </p>
          <p className="font-variant-numeric mt-1 text-xs break-all text-muted-foreground tabular-nums">
            Reference: {booking.reference}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            variant="outline"
            className="w-full justify-center"
          >
            <span>Check payment again</span>
          </Button>
          <TrackLink
            event="support_click"
            eventProps={{
              context: "unresolved flight payment",
              channel: "whatsapp",
            }}
            href={getSupportWhatsAppUrl(
              `flight booking ${booking.reference} (${bookingContext})`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants(),
              "w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            <HugeiconsIcon icon={Message01Icon} size={18} aria-hidden="true" />
            <span>Contact support on WhatsApp</span>
          </TrackLink>
        </div>
      </div>
    </div>
  )
}
