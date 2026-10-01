"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  Message01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { Button, ButtonLink } from "@/components/ui/button"
import { getHumanErrorMessage, getPaymentSafetyCopy } from "@/lib/api/client"
import type { PaymentOrder } from "@/lib/api/payments"
import {
  emitVerificationEventOnce,
  fetchOrderWithSettleRetry,
  isPaidOrder,
} from "@/lib/api/verification"
import {
  clearCarBookingSession,
  CAR_PAYMENT_REFERENCE_SESSION_KEY,
  getCarSupportWhatsAppUrl,
  resolveCarVerificationState,
  verifyCarBooking,
} from "@/lib/api/cars"
import { readSessionString } from "@/lib/api/shared"
import { formatNaira } from "@/lib/format"

type Outcome = "loading" | "confirmed" | "pending" | "failed" | "error"

/**
 * `/cars/confirmation?reference=…` client.
 * Primary: universal order lookup. Fallback: module verify.
 * Never assumes success from the Paystack return itself.
 */
export function CarConfirmationClient() {
  const searchParams = useSearchParams()
  const reference =
    searchParams.get("reference") ??
    readSessionString(CAR_PAYMENT_REFERENCE_SESSION_KEY) ??
    ""

  const [outcome, setOutcome] = React.useState<Outcome>("loading")
  const [attempt, setAttempt] = React.useState(0)
  const [detail, setDetail] = React.useState<{
    vehicle?: string
    pickup?: string
    dropoff?: string
    hours?: number
    total?: string
  } | null>(null)
  const [error, setError] = React.useState<unknown | null>(null)

  React.useEffect(() => {
    if (!reference) {
      setOutcome("error")
      return
    }
    let cancelled = false
    setOutcome("loading")
    setError(null)
    void (async () => {
      try {
        // Primary: the universal order is the final word on money movement,
        // fetched through the shared seam (authoritative `payment_status`
        // read plus one settle retry while the webhook lands).
        let order: PaymentOrder | null = null
        try {
          order = await fetchOrderWithSettleRetry(reference)
        } catch {
          order = null
        }
        if (cancelled) return
        if (order && isPaidOrder(order)) {
          setOutcome("confirmed")
          emitVerificationEventOnce(
            `${reference}::car_payment_completed`,
            "car_payment_completed",
            { type: "order" }
          )
          emitVerificationEventOnce(
            `${reference}::car_confirmation_viewed:confirmed`,
            "car_confirmation_viewed",
            { type: "confirmed" }
          )
          clearCarBookingSession()
          return
        }
        const booking = await verifyCarBooking(reference)
        if (cancelled) return
        const state = resolveCarVerificationState(booking)
        setDetail({
          vehicle: booking.vehicle_name || undefined,
          pickup: booking.pickup_location || undefined,
          dropoff: booking.dropoff_location || undefined,
          hours: booking.num_hours || undefined,
          total: String(booking.total_amount || ""),
        })
        if (state === "confirmed") {
          setOutcome("confirmed")
          emitVerificationEventOnce(
            `${reference}::car_payment_completed`,
            "car_payment_completed",
            { type: "verify" }
          )
          emitVerificationEventOnce(
            `${reference}::car_confirmation_viewed:confirmed`,
            "car_confirmation_viewed",
            { type: "confirmed" }
          )
          clearCarBookingSession()
        } else if (state === "pending") {
          setOutcome("pending")
          emitVerificationEventOnce(
            `${reference}::car_confirmation_viewed:pending`,
            "car_confirmation_viewed",
            { type: "pending" }
          )
        } else {
          setOutcome("failed")
          emitVerificationEventOnce(
            `${reference}::car_confirmation_viewed:${state}`,
            "car_confirmation_viewed",
            { type: state }
          )
        }
      } catch (caught) {
        if (cancelled) return
        setError(caught)
        setOutcome("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reference, attempt])

  const supportHref = getCarSupportWhatsAppUrl("confirming a car hire")

  if (!reference) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight">
          No payment reference found
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Open this page from your Paystack return link, or check your email for
          the reference. No booking was confirmed here.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/cars">
            <span>Browse vehicles</span>
          </ButtonLink>
          <ButtonLink
            href={supportHref}
            variant="outline"
            target="_blank"
            rel="noopener noreferrer"
          >
            <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </ButtonLink>
        </div>
      </div>
    )
  }

  if (outcome === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p
          role="status"
          aria-live="polite"
          className="text-2xl font-extrabold tracking-tight"
        >
          Confirming your payment…
        </p>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Reference <span className="font-mono font-semibold">{reference}</span>
          . Do not close this page yet — returning here does not mean payment
          succeeded.
        </p>
      </div>
    )
  }

  if (outcome === "confirmed") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <HugeiconsIcon icon={Tick01Icon} size={28} aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Your car is booked
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Payment confirmed for reference{" "}
          <span className="font-mono font-semibold text-foreground">
            {reference}
          </span>
          .{detail?.vehicle ? ` ${detail.vehicle}` : " Your driver"}{" "}
          {detail?.pickup
            ? `will meet you at ${detail.pickup}`
            : "details are in your email"}
          {detail?.hours
            ? ` for ${detail.hours} ${detail.hours === 1 ? "hour" : "hours"}`
            : ""}
          .{detail?.total ? ` Total ${formatNaira(detail.total)}.` : ""}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink
            href={`/order?reference=${encodeURIComponent(reference)}`}
          >
            <span>View booking</span>
          </ButtonLink>
          <ButtonLink href="/cars" variant="outline">
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              size={14}
              aria-hidden="true"
            />
            <span>Book another car</span>
          </ButtonLink>
          <ButtonLink
            href={supportHref}
            variant="ghost"
            target="_blank"
            rel="noopener noreferrer"
          >
            <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
            <span>Contact Alphaa</span>
          </ButtonLink>
        </div>
      </div>
    )
  }

  if (outcome === "pending") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Payment is still settling
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Reference <span className="font-mono font-semibold">{reference}</span>{" "}
          is pending — the webhook may still be processing. Wait a minute, then
          retry. {getPaymentSafetyCopy()}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => setAttempt((n) => n + 1)}>
            <span>Retry confirmation</span>
          </Button>
          <ButtonLink
            href={supportHref}
            variant="outline"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Talk to Alphaa</span>
          </ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-extrabold tracking-tight">
        {outcome === "error"
          ? "We could not confirm that payment"
          : "Your booking was not completed"}
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        {outcome === "error" && error
          ? getHumanErrorMessage(error)
          : "The hire was not confirmed and you can try again."}{" "}
        {getPaymentSafetyCopy()} Keep reference{" "}
        <span className="font-mono font-semibold">{reference}</span>.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/cars">
          <span>Try another vehicle</span>
        </ButtonLink>
        <ButtonLink
          href={supportHref}
          variant="outline"
          target="_blank"
          rel="noopener noreferrer"
        >
          <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
          <span>Talk to Alphaa</span>
        </ButtonLink>
        <Link
          href={`/order?reference=${encodeURIComponent(reference)}`}
          className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          Check order status
        </Link>
      </div>
    </div>
  )
}
