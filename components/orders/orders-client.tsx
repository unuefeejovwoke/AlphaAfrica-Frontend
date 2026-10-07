"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon, Message01Icon } from "@hugeicons/core-free-icons"
import { ButtonLink, Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  buildFlightPayUrl,
  formatTicketingDeadline,
  resolveFlightVerificationState,
} from "@/lib/api/flight-bookings"
import {
  getOrderHistory,
  isOrderPaid,
  resolveOrderPaymentStatus,
  type OrderHistoryItem,
} from "@/lib/api/payments"
import { ApiError, getPaymentSafetyCopy } from "@/lib/api/client"
import { formatNaira } from "@/lib/format"
import { getSupportWhatsAppUrl } from "@/lib/content/company"
import { TrackLink } from "@/components/analytics/track-link"
import { cn } from "@/lib/utils"

type OrdersState =
  | { kind: "loading" }
  | { kind: "ready"; orders: OrderHistoryItem[] }
  | { kind: "failed"; message: string; forbidden: boolean }

function orderTitle(item: OrderHistoryItem): string {
  if (item.title && item.title.trim()) return item.title.trim()
  const type = (item.booking_type ?? "").trim().toLowerCase()
  if (type) return `${type.charAt(0).toUpperCase() + type.slice(1)} booking`
  return "Booking"
}

/**
 * Whether a history item is a Reservation awaiting payment rather than a
 * payment still settling. A reserved flight reports a pending payment status,
 * so status alone cannot tell them apart: the reservation markers are an
 * explicit `reserved` status or a pay-by date on a pending flight. Anything
 * else pending keeps reading as still processing and is NOT relabelled.
 */
function reservationMarker(item: OrderHistoryItem): {
  reserved: boolean
  deadline: string | null
} {
  if ((item.booking_type ?? "").trim().toLowerCase() !== "flight") {
    return { reserved: false, deadline: null }
  }
  const status = (item.status ?? "").trim().toLowerCase()
  const paymentStatus = (item.payment_status ?? "").trim().toLowerCase()
  const extra = item as unknown as Record<string, unknown>
  const rawDeadline = extra["ticketing_deadline"]
  const deadline =
    typeof rawDeadline === "string" && rawDeadline.trim()
      ? rawDeadline.trim()
      : null
  if (resolveFlightVerificationState({ status }) === "reserved") {
    return { reserved: true, deadline }
  }
  if (
    deadline &&
    (status === "pending" || paymentStatus === "pending" || !paymentStatus)
  ) {
    return { reserved: true, deadline }
  }
  return { reserved: false, deadline: null }
}

function OrdersFallback() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16 sm:px-6">
      <Skeleton className="h-8 w-64 rounded-xl" />
      <Skeleton className="h-4 w-96 rounded-lg" />
      <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  )
}

/**
 * "View All My Orders" (guide §12 email links: `/orders?email=&token=`).
 * Guests authenticate with the email + secure token from their confirmation
 * email; logged-in users will use their session once accounts ship.
 */
export function OrdersClient() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")?.trim() || null
  const token = searchParams.get("token")?.trim() || null
  const [state, setState] = React.useState<OrdersState>({ kind: "loading" })
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    if (!email || !token) return
    let cancelled = false
    ;(async () => {
      setState({ kind: "loading" })
      try {
        const orders = await getOrderHistory({ email, token })
        if (!cancelled) setState({ kind: "ready", orders })
      } catch (error) {
        if (cancelled) return
        const forbidden =
          error instanceof ApiError && error.code === "forbidden"
        setState({
          kind: "failed",
          message: forbidden
            ? "This orders link is invalid or has expired. Open the “View All My Orders” button in your latest confirmation email."
            : "We could not load your orders yet. Nothing was changed — try again in a moment.",
          forbidden,
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [email, token, attempt])

  if (!email || !token) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
        <div
          role="alert"
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Open this page from your confirmation email.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your orders page needs the secure link from your booking
            confirmation email — it proves these orders are yours without an
            account. Open the &quot;View All My Orders&quot; button in any
            Alphaa receipt email.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {getPaymentSafetyCopy()}
          </p>
        </div>
      </div>
    )
  }

  if (state.kind === "loading") return <OrdersFallback />

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
              We couldn&apos;t load your orders.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {state.message}
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
            <TrackLink
              event="support_click"
              eventProps={{
                context: "an orders history link",
                channel: "whatsapp",
              }}
              href={getSupportWhatsAppUrl("my orders")}
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

  const { orders } = state

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-4 sm:py-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="text-lg font-black tracking-tight text-secondary uppercase sm:text-2xl">
          My orders
        </h1>
        <p className="max-w-sm px-2 text-xs leading-normal font-normal text-muted-foreground sm:max-w-md sm:text-sm">
          {orders.length === 0
            ? "No orders found for this email yet."
            : `${orders.length} ${orders.length === 1 ? "order" : "orders"} for ${email}.`}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-border/80 bg-card p-6 text-center shadow-xs">
          <p className="text-sm text-muted-foreground">
            Payments can take a minute to appear. If you just paid, wait a
            moment and refresh — and never pay twice for the same booking.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAttempt((n) => n + 1)}
          >
            <span>Refresh orders</span>
          </Button>
        </div>
      ) : (
        <ul className="flex w-full flex-col gap-3">
          {orders.map((item) => {
            const status = resolveOrderPaymentStatus(item)
            const paid = isOrderPaid(status)
            const href = `/order?reference=${encodeURIComponent(item.reference)}&email=${encodeURIComponent(email)}${token ? `&token=${encodeURIComponent(token)}` : ""}`
            const marker = reservationMarker(item)
            // A Reservation is shown with its pay-by date and a payment action
            // so it can be completed without hunting for the email — and never
            // as a "still processing" warning about a state the Customer
            // chose. The pay page itself handles an already-paid or
            // no-longer-payable Booking without error.
            if (marker.reserved && !paid) {
              const payHref =
                email && token
                  ? buildFlightPayUrl({
                      reference: item.reference,
                      email,
                      token,
                    })
                  : href
              const payBy = formatTicketingDeadline(marker.deadline)
              return (
                <li
                  key={item.reference}
                  className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-card p-4 shadow-xs"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-bold text-foreground">
                      {orderTitle(item)}
                    </span>
                    <span className="font-mono text-xs break-all text-muted-foreground">
                      {item.reference}
                    </span>
                    <span className="mt-1 w-fit rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black tracking-wider text-amber-700 uppercase">
                      Reserved — payment due
                    </span>
                    {payBy ? (
                      <span className="mt-1 text-xs font-semibold text-muted-foreground">
                        Pay by {payBy} to keep your seat
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center justify-between gap-3">
                    <span className="shrink-0 text-left">
                      {item.amount !== undefined && item.amount !== null ? (
                        <span className="font-variant-numeric block text-sm font-extrabold text-foreground tabular-nums">
                          {formatNaira(String(item.amount))}
                        </span>
                      ) : null}
                      <span className="block text-[11px] text-muted-foreground">
                        {item.currency || "NGN"}
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-2">
                      <ButtonLink href={payHref} size="sm">
                        <span>Pay now</span>
                      </ButtonLink>
                      <ButtonLink href={href} size="sm" variant="outline">
                        <span>View</span>
                      </ButtonLink>
                    </span>
                  </span>
                </li>
              )
            }
            return (
              <li key={item.reference}>
                <Link
                  href={href}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-bold text-foreground">
                      {orderTitle(item)}
                    </span>
                    <span className="font-mono text-xs break-all text-muted-foreground">
                      {item.reference}
                    </span>
                    <span
                      className={cn(
                        "mt-1 w-fit rounded-full px-2 py-0.5 text-[10px] font-black tracking-wider uppercase",
                        paid
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-700"
                      )}
                    >
                      {paid ? "Paid" : "Pending"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {item.amount !== undefined && item.amount !== null ? (
                      <span className="font-variant-numeric block text-sm font-extrabold text-foreground tabular-nums">
                        {formatNaira(String(item.amount))}
                      </span>
                    ) : null}
                    <span className="block text-[11px] text-muted-foreground">
                      {item.currency || "NGN"}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
