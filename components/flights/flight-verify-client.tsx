"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Message01Icon,
  Tick01Icon,
  AlertCircleIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { CardSkeleton } from "@/components/ui/skeleton"
import { ViewTracker } from "@/components/analytics/view-tracker"
import {
  buildFlightVerifyUrl,
  readPaymentReference,
  resolveFlightVerificationState,
  verifyFlightBooking,
  type FlightBooking,
} from "@/lib/api/flight-bookings"
import {
  getPaymentOrder,
  isOrderPaid,
  type PaymentOrder,
} from "@/lib/api/payments"
import { getHumanErrorMessage, getPaymentSafetyCopy } from "@/lib/api/client"
import { track } from "@/lib/analytics"
import { formatNaira } from "@/lib/format"
import { pluralize } from "@/lib/schemas/travel"
import { getSupportWhatsAppUrl, getWhatsAppUrl } from "@/lib/content/company"
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
 * Paystack return handler for flight Bookings. A return from payment proves
 * nothing by itself: this client reads the Payment Reference from the return
 * URL, fetches the live verification (never cached) and then the universal
 * order before rendering any outcome (spec stories 24–27). Guests are
 * welcome — verification needs only the reference.
 */
export function FlightVerifyClient() {
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference")?.trim() || null
  const [savedReference] = React.useState<string | null>(readPaymentReference)
  const [state, setState] = React.useState<VerifyState>({ kind: "verifying" })
  const [attempt, setAttempt] = React.useState(0)
  // Payment-completed fires once per verified booking (ticket 10). The
  // reference/amount stay out of analytics — coarse type only.
  const paymentCompletedRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!reference) return
    let cancelled = false
    ;(async () => {
      setState({ kind: "verifying" })
      try {
        const booking = await verifyFlightBooking(reference)
        // Verification is authoritative for the Booking, but the universal
        // order is the final word on money movement — fetch it too,
        // tolerating its absence.
        let order: PaymentOrder | null = null
        try {
          order = await getPaymentOrder(reference)
        } catch {
          order = null
        }
        if (cancelled) return
        setState({ kind: "resolved", booking, order })
        const paid =
          resolveFlightVerificationState(booking) === "paid" ||
          isOrderPaid(order?.status)
        if (paid && paymentCompletedRef.current !== booking.reference) {
          paymentCompletedRef.current = booking.reference
          track("flight_payment_completed", { type: "flight" })
        }
      } catch (error) {
        if (cancelled) return
        setState({ kind: "failed", message: getHumanErrorMessage(error) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reference, attempt])

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
              <Button
                render={<Link href={buildFlightVerifyUrl(savedReference)} />}
                className="w-full justify-center"
              >
                <span>Resume with your saved reference</span>
              </Button>
            ) : null}
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{
                    context: "flight verify missing reference",
                    channel: "whatsapp",
                  }}
                  href={getSupportWhatsAppUrl("flight booking payment")}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              className="w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={18}
                aria-hidden="true"
              />
              <span>Contact support on WhatsApp</span>
            </Button>
            <Button
              render={<Link href="/flights" />}
              variant="ghost"
              className="w-full justify-center"
            >
              <span>Back to flight search</span>
            </Button>
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
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{
                    context: "unresolved flight payment",
                    channel: "whatsapp",
                  }}
                  href={getSupportWhatsAppUrl(`flight booking ${reference}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              className="w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={18}
                aria-hidden="true"
              />
              <span>Contact support on WhatsApp</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { booking, order } = state
  const bookingStatus = booking.status.trim().toLowerCase()
  const paid =
    resolveFlightVerificationState(booking) === "paid" ||
    isOrderPaid(order?.status)

  if (paid) {
    const pnr = booking.pnr?.trim() || null
    const travellerSummary = formatTravellerSummary(booking)
    const paymentState =
      bookingStatus === "confirmed"
        ? "Confirmed · PNR issued"
        : "Paid · finalizing your booking"
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
        <ViewTracker
          event="booking_confirmation_viewed"
          props={{ type: "flight" }}
        />
        <ViewTracker
          event="flight_confirmation_viewed"
          props={{ type: "flight" }}
        />
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <HugeiconsIcon icon={Tick01Icon} size={22} aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Payment verified — you&apos;re flying.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {booking.origin} to {booking.destination}, confirmed. Keep your
              Booking reference{pnr ? " and PNR" : ""} safe — you&apos;ll need
              {pnr ? " them" : " it"} at check-in.
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200/70 bg-white/70 p-4 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Booking reference
              </dt>
              <dd className="font-variant-numeric font-bold break-all text-foreground tabular-nums">
                {booking.reference}
              </dd>
            </div>
            {pnr ? (
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  PNR
                </dt>
                <dd className="font-variant-numeric font-bold break-all text-foreground tabular-nums">
                  {pnr}
                </dd>
              </div>
            ) : null}
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Route
              </dt>
              <dd className="font-semibold text-foreground">
                {booking.origin} → {booking.destination}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Dates
              </dt>
              <dd className="font-semibold text-foreground">
                <time dateTime={booking.departure_date}>
                  {booking.departure_date}
                </time>
                {booking.return_date ? (
                  <>
                    {" → "}
                    <time dateTime={booking.return_date}>
                      {booking.return_date}
                    </time>
                  </>
                ) : null}
              </dd>
            </div>
            {travellerSummary ? (
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Travellers
                </dt>
                <dd className="font-semibold text-foreground">
                  {travellerSummary}
                </dd>
              </div>
            ) : null}
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Amount paid
              </dt>
              <dd className="font-semibold text-foreground">
                {formatNaira(String(booking.total_amount))} ·{" "}
                {booking.currency || "NGN"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:col-span-2">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Payment state
              </dt>
              <dd className="font-semibold text-foreground">{paymentState}</dd>
            </div>
          </dl>
          <div className="flex flex-col gap-1.5 rounded-xl border border-emerald-200/70 bg-white/70 p-4 text-sm">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              What happens next
            </p>
            <ol className="flex list-decimal flex-col gap-1 pl-5 leading-relaxed text-muted-foreground">
              <li>
                Keep your Booking reference{pnr ? " and PNR" : ""} safe for
                check-in.
              </li>
              <li>Travel with the documents you entered for each traveller.</li>
              <li>
                If anything changes, message us on WhatsApp with your reference.
              </li>
            </ol>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => window.print()}
              variant="outline"
              className="w-full justify-center"
            >
              <span>Print / save confirmation</span>
            </Button>{" "}
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{
                    context: "verified flight booking",
                    channel: "whatsapp",
                  }}
                  href={getWhatsAppUrl(
                    `Hello Alphaa Africa! My flight booking ${booking.reference} (${booking.origin} → ${booking.destination}) is verified. Please guide me on next steps.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              className="w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={18}
                aria-hidden="true"
              />
              <span>Share on WhatsApp with this reference</span>
            </Button>
            <Button
              render={<Link href="/flights" />}
              variant="ghost"
              className="w-full justify-center"
            >
              <span>Search more flights</span>
            </Button>
          </div>
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
          <Button
            render={
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
              />
            }
            className="w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <HugeiconsIcon icon={Message01Icon} size={18} aria-hidden="true" />
            <span>Contact support on WhatsApp</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
