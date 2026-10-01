"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Message01Icon,
  Tick01Icon,
  AlertCircleIcon,
  Clock01Icon,
  PrinterIcon,
} from "@hugeicons/core-free-icons"
import { Button, ButtonLink, buttonVariants } from "@/components/ui/button"
import { CardSkeleton } from "@/components/ui/skeleton"
import { FlightETicket } from "@/components/flights/flight-e-ticket"
import {
  buildFlightVerifyUrl,
  clearBookingSession,
  flightBookingSchema,
  readPaymentReference,
  resolveFlightVerificationState,
  verifyFlightBooking,
  type FlightBooking,
} from "@/lib/api/flight-bookings"
import { clearFlightCheckoutSession } from "@/lib/api/flights"
import { clearSelectedDomesticCard } from "@/lib/api/domestic"
import {
  extractOrderDetails,
  type PaymentOrder,
} from "@/lib/api/payments"
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
 * movement and creates the PNR on the spot), then the flight verify call
 * for the full Booking shape. Guests are welcome — verification needs only
 * the reference, plus the email `token` when present.
 */
export function FlightVerifyClient() {
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference")?.trim() || null
  const guestToken = searchParams.get("token")?.trim() || null
  const [savedReference] = React.useState<string | null>(readPaymentReference)
  const [state, setState] = React.useState<VerifyState>({ kind: "verifying" })
  const [attempt, setAttempt] = React.useState(0)

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
  const bookingStatus = booking.status.trim().toLowerCase()
  const paid =
    resolveFlightVerificationState(booking) === "paid" ||
    isPaidOrder(order)

  if (paid) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 py-4 sm:gap-6 sm:py-8 print:max-w-2xl print:px-0 print:py-6">
        {/* Verification Status Header (matches official e-ticket layout) */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-[10px] font-black tracking-wider text-emerald-600 uppercase sm:text-[11px]">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
            PAYMENT VERIFIED
          </span>

          <h1 className="text-lg font-black tracking-tight text-secondary uppercase sm:text-2xl">
            BOOKING CONFIRMED!
          </h1>

          <p className="max-w-sm px-2 text-xs leading-normal font-normal text-muted-foreground sm:max-w-md sm:text-sm">
            Your transaction has been processed and your official travel
            document issued below.
          </p>
        </div>

        {/* The Official E-Ticket Card */}
        <FlightETicket booking={booking} order={order} />

        {/* Payment & Receipt Summary Strip */}
        <div className="flex w-full flex-col gap-2 rounded-xl border border-border/80 bg-card p-3 text-xs text-muted-foreground shadow-xs sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:p-4 print:hidden">
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
      </div>
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
