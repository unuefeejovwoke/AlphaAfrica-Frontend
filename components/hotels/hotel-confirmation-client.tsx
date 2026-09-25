"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  Clock01Icon,
  Message01Icon,
  PrinterIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { CardSkeleton } from "@/components/ui/skeleton"
import { TrackLink } from "@/components/analytics/track-link"
import { track } from "@/lib/analytics"
import {
  buildHotelConfirmationUrl,
  readHotelPaymentReference,
  resolveHotelVerificationState,
  verifyHotelBooking,
  type HotelBooking,
} from "@/lib/api/hotels"
import { getHumanErrorMessage, getPaymentSafetyCopy } from "@/lib/api/client"
import { formatNaira } from "@/lib/format"
import { getSupportWhatsAppUrl, getWhatsAppUrl } from "@/lib/content/company"

type ConfirmationState =
  | { kind: "verifying" }
  | { kind: "resolved"; booking: HotelBooking }
  | { kind: "failed"; message: string }

/**
 * Paystack return handler for Hotel Bookings (Phase 4, ticket 06).
 *
 * A return from payment proves nothing by itself: this client reads the
 * Payment Reference from the return URL, fetches the live verification
 * (never cached), and only a verified `confirmed` status renders the premium
 * confirmation. Pending keeps the guest checking rather than re-paying;
 * cancelled and failed keep the reference with payment-safety reassurance.
 * Guest Booking — verification needs only the reference.
 */
export function HotelConfirmationClient() {
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference")?.trim() || null
  const [savedReference] = React.useState<string | null>(
    readHotelPaymentReference
  )
  const [state, setState] = React.useState<ConfirmationState>({
    kind: "verifying",
  })
  const [attempt, setAttempt] = React.useState(0)
  // Funnel events fire once per verified Hotel Booking (ticket 07). The
  // reference and amounts stay out of analytics — coarse type only.
  const confirmedRef = React.useRef<string | null>(null)
  const viewedRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!reference) return
    let cancelled = false
    ;(async () => {
      setState({ kind: "verifying" })
      try {
        const booking = await verifyHotelBooking(reference)
        if (cancelled) return
        setState({ kind: "resolved", booking })
        const outcome = resolveHotelVerificationState(booking)
        if (viewedRef.current !== booking.reference) {
          viewedRef.current = booking.reference
          track("hotel_confirmation_viewed", { type: "hotel", outcome })
        }
        if (
          outcome === "confirmed" &&
          confirmedRef.current !== booking.reference
        ) {
          confirmedRef.current = booking.reference
          track("hotel_payment_completed", { type: "hotel" })
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
              nothing to verify yet. Your money is safe — no Hotel Booking was
              created from this page.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {getPaymentSafetyCopy()}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {savedReference ? (
              <Button
                render={
                  <Link href={buildHotelConfirmationUrl(savedReference)} />
                }
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
                    context: "hotel confirmation missing reference",
                    channel: "whatsapp",
                  }}
                  href={getSupportWhatsAppUrl("hotel stay booking payment")}
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
              render={<Link href="/hotels" />}
              variant="ghost"
              className="w-full justify-center"
            >
              <span>Back to Hotel search</span>
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
                    context: "unresolved hotel payment",
                    channel: "whatsapp",
                  }}
                  href={getSupportWhatsAppUrl(
                    `hotel stay booking ${reference}`
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
              <span>Contact support on WhatsApp</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { booking } = state
  const outcome = resolveHotelVerificationState(booking)

  if (outcome === "confirmed") {
    const nightWord = booking.nights === 1 ? "night" : "nights"
    const roomWord = booking.num_rooms === 1 ? "room" : "rooms"
    const guestWord = booking.num_guests === 1 ? "guest" : "guests"
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8 dark:border-emerald-900 dark:bg-emerald-950/30"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <HugeiconsIcon icon={Tick01Icon} size={22} aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Payment verified — your stay is booked.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {booking.hotel_name} is expecting you. Keep your Hotel Booking
              reference safe — you&apos;ll need it at check-in.
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200/70 bg-white/70 p-4 text-sm sm:grid-cols-2 dark:border-emerald-900 dark:bg-zinc-950/60">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Hotel Booking reference
              </dt>
              <dd className="font-variant-numeric font-bold break-all text-foreground tabular-nums">
                {booking.reference}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Payment state
              </dt>
              <dd className="font-semibold text-foreground">Confirmed</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Hotel
              </dt>
              <dd className="font-semibold text-foreground">
                {booking.hotel_name || "Your Hotel"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Room Type
              </dt>
              <dd className="font-semibold text-foreground">
                {booking.room_type_name || "Your Room Type"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Check-in
              </dt>
              <dd className="font-semibold text-foreground tabular-nums">
                {booking.check_in ? (
                  <time dateTime={booking.check_in}>{booking.check_in}</time>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Check-out
              </dt>
              <dd className="font-semibold text-foreground tabular-nums">
                {booking.check_out ? (
                  <time dateTime={booking.check_out}>{booking.check_out}</time>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Stay
              </dt>
              <dd className="font-semibold text-foreground tabular-nums">
                {booking.nights} {nightWord} · {booking.num_rooms} {roomWord} ·{" "}
                {booking.num_guests} {guestWord}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Per night
              </dt>
              <dd className="font-semibold text-foreground tabular-nums">
                {formatNaira(String(booking.price_per_night))}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:col-span-2">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Total amount
              </dt>
              <dd className="text-lg font-extrabold tracking-tight text-foreground tabular-nums">
                {formatNaira(String(booking.total_amount))} · NGN
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-1.5 rounded-xl border border-emerald-200/70 bg-white/70 p-4 text-sm dark:border-emerald-900 dark:bg-zinc-950/60">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              What happens next
            </p>
            <ol className="flex list-decimal flex-col gap-1 pl-5 leading-relaxed text-muted-foreground">
              <li>Keep your Hotel Booking reference safe for check-in.</li>
              <li>
                Arrive with the contact details you entered as Hotel Guest.
              </li>
              <li>
                If anything changes, message us on WhatsApp with your reference.
              </li>
            </ol>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              render={
                <Link
                  href={buildHotelConfirmationUrl(booking.reference)}
                  aria-label="View this Hotel Booking confirmation"
                />
              }
              variant="outline"
              className="w-full justify-center"
            >
              <span>View booking</span>
            </Button>
            <Button
              type="button"
              onClick={() => window.print()}
              variant="outline"
              className="w-full justify-center"
            >
              <HugeiconsIcon icon={PrinterIcon} size={16} aria-hidden="true" />
              <span>Download / print confirmation</span>
            </Button>
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{
                    context: "verified hotel booking",
                    channel: "whatsapp",
                  }}
                  href={getWhatsAppUrl(
                    `Hello Alphaa Africa! My hotel stay booking ${booking.reference} at ${booking.hotel_name} is verified. Please guide me on next steps.`
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
              render={<Link href="/hotels" />}
              variant="ghost"
              className="w-full justify-center"
            >
              <span>Search more Hotels</span>
            </Button>
          </div>
          <p className="border-t border-emerald-200/70 pt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
            Booked as a Guest Booking — no account needed. Stay often? Talk to
            Alphaa about keeping your details on file for faster checkout.
          </p>
        </div>
      </div>
    )
  }

  const stillProcessing = outcome === "pending"
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
              : "Your Hotel Booking was not completed."}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {stillProcessing
              ? "We checked with Paystack and this payment is not complete yet. It may still be processing — wait a moment and check again rather than paying a second time."
              : "Your Hotel Booking was not completed. If payment was deducted, our team can locate and reconcile it. Keep your reference and contact Alphaa."}
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
                  context: "unresolved hotel payment",
                  channel: "whatsapp",
                }}
                href={getSupportWhatsAppUrl(
                  `hotel stay booking ${booking.reference}`
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
