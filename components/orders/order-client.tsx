"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  Clock01Icon,
  Message01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FlightVerifyClient } from "@/components/flights/flight-verify-client"
import {
  getPaymentOrder,
  isOrderPaid,
  isOrderPending,
  resolveOrderPaymentStatus,
  type PaymentOrder,
} from "@/lib/api/payments"
import { ApiError, getPaymentSafetyCopy } from "@/lib/api/client"
import { formatNaira } from "@/lib/format"
import { getSupportWhatsAppUrl } from "@/lib/content/company"
import { TrackLink } from "@/components/analytics/track-link"
import { cn } from "@/lib/utils"

type OrderState =
  | { kind: "loading" }
  | { kind: "ready"; order: PaymentOrder }
  | { kind: "failed"; message: string; forbidden: boolean }

function bookingTypeLabel(bookingType: string): string {
  switch (bookingType.trim().toLowerCase()) {
    case "hotel":
      return "Hotel booking"
    case "car":
      return "Car rental"
    case "visa":
      return "Visa consultation"
    case "flight":
      return "Flight booking"
    default:
      return "Booking"
  }
}

function OrderFallback() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16 sm:px-6">
      <Skeleton className="h-8 w-64 rounded-xl" />
      <Skeleton className="h-4 w-96 rounded-lg" />
      <Skeleton className="mt-4 h-64 w-full rounded-[2rem]" />
    </div>
  )
}

/**
 * Generic post-payment confirmation (guide §12 email links:
 * `/order?reference=&email=&token=`). Fetches the universal order once,
 * routes flight orders to the flight confirmation flow, and renders every
 * other booking type as a truthful generic receipt. Never assumes success
 * from the redirect alone.
 */
export function OrderClient() {
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference")?.trim() || null
  const token = searchParams.get("token")?.trim() || null
  const email = searchParams.get("email")?.trim() || null
  const [state, setState] = React.useState<OrderState>({ kind: "loading" })
  const [attempt, setAttempt] = React.useState(0)
  const ordersHref = React.useMemo(() => {
    const params = new URLSearchParams()
    if (email) params.set("email", email)
    if (token) params.set("token", token)
    const query = params.toString()
    return query ? `/orders?${query}` : "/orders"
  }, [email, token])

  React.useEffect(() => {
    if (!reference) return
    let cancelled = false
    ;(async () => {
      setState({ kind: "loading" })
      try {
        const order = await getPaymentOrder(
          reference,
          token ? { token } : undefined
        )
        if (!cancelled) setState({ kind: "ready", order })
      } catch (error) {
        if (cancelled) return
        const forbidden =
          error instanceof ApiError && error.code === "forbidden"
        setState({
          kind: "failed",
          message: forbidden
            ? "This confirmation link is invalid or has expired. Ask Alphaa to resend your receipt link."
            : error instanceof ApiError &&
                (error.code === "not-found" || error.code === "validation")
              ? "We could not find this order. Check the link in your confirmation email."
              : "We could not load this order yet. No booking was changed — try again in a moment.",
          forbidden,
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reference, token, attempt])

  if (!reference) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
        <div
          role="alert"
          className="flex flex-col gap-4 rounded-2xl border border-destructive/25 bg-card p-6 sm:p-8"
        >
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            We couldn&apos;t find your payment reference.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This confirmation link is missing its reference. Open the &quot;View
            This Order&quot; button in your confirmation email instead — it
            carries everything needed to verify your payment.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {getPaymentSafetyCopy()}
          </p>
        </div>
      </div>
    )
  }

  if (state.kind === "loading") return <OrderFallback />

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
              We couldn&apos;t load this order.
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
            {!state.forbidden ? (
              <Button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                variant="outline"
                className="w-full justify-center"
              >
                <span>Try again</span>
              </Button>
            ) : null}
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{
                    context: "an order confirmation link",
                    channel: "whatsapp",
                  }}
                  href={getSupportWhatsAppUrl(`order ${reference}`)}
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

  const { order } = state
  const bookingType = (order.booking_type ?? "").trim().toLowerCase()

  // Flight orders (and unflagged legacy orders) use the flight confirmation
  // flow, which reads the same reference + token from this URL.
  if (!bookingType || bookingType === "flight") {
    return <FlightVerifyClient />
  }

  const status = resolveOrderPaymentStatus(order)
  const paid = isOrderPaid(status)
  const pending = !paid && isOrderPending(status)
  const amount =
    order.amount !== undefined && order.amount !== null
      ? `${formatNaira(String(order.amount))} ${order.currency || "NGN"}`
      : null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-4 sm:py-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[10px] font-black tracking-wider uppercase sm:text-[11px]",
            paid
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              paid ? "bg-emerald-500" : "animate-pulse bg-amber-500"
            )}
          />
          {paid
            ? "PAYMENT VERIFIED"
            : pending
              ? "STILL PROCESSING"
              : "NOT COMPLETED"}
        </span>
        <h1 className="text-lg font-black tracking-tight text-secondary uppercase sm:text-2xl">
          {paid ? "Booking confirmed!" : "Checking your booking…"}
        </h1>
        <p className="max-w-sm px-2 text-xs leading-normal font-normal text-muted-foreground sm:max-w-md sm:text-sm">
          {order.description ||
            `Your ${bookingTypeLabel(bookingType).toLowerCase()} receipt is below.`}
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-bold text-muted-foreground">Type</span>
          <span className="font-bold text-foreground">
            {bookingTypeLabel(bookingType)}
          </span>
        </div>
        {amount ? (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-bold text-muted-foreground">
              {paid ? "Total paid" : "Amount"}
            </span>
            <span className="font-variant-numeric font-extrabold text-foreground tabular-nums">
              {amount}
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-bold text-muted-foreground">Reference</span>
          <span className="font-mono font-bold break-all text-foreground select-all">
            {order.reference}
          </span>
        </div>
        {pending ? (
          <p
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
          >
            <HugeiconsIcon
              icon={Clock01Icon}
              size={14}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>
              We checked with Paystack and this payment is not complete yet. It
              may still be processing — wait a moment and check again rather
              than paying a second time.
            </span>
          </p>
        ) : null}
        {!paid && !pending ? (
          <p
            role="alert"
            className="text-xs leading-relaxed text-muted-foreground"
          >
            This booking was not completed. {getPaymentSafetyCopy()}
          </p>
        ) : null}
      </div>

      <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-center print:hidden">
        {pending ? (
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => setAttempt((n) => n + 1)}
            className="w-full justify-center font-semibold sm:w-auto"
          >
            <span>Check payment again</span>
          </Button>
        ) : null}
        <Button
          render={
            <TrackLink
              event="support_click"
              eventProps={{
                context: `an order confirmation (${bookingType})`,
                channel: "whatsapp",
              }}
              href={getSupportWhatsAppUrl(`order ${order.reference}`)}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          variant={pending ? "ghost" : "outline"}
          size="lg"
          className="w-full justify-center font-semibold sm:w-auto"
        >
          <HugeiconsIcon icon={Message01Icon} size={18} aria-hidden="true" />
          <span>Contact support on WhatsApp</span>
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        <Link
          href={ordersHref}
          className="font-semibold underline-offset-4 hover:text-primary hover:underline"
        >
          View all my orders
        </Link>
      </p>
    </div>
  )
}
