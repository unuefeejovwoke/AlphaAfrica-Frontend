"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Clock01Icon,
  LockIcon,
  Shield01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { formatNaira } from "@/lib/format"
import { readConfirmedOfferSavedAt, type FlightOfferDisplay } from "@/lib/api/flights"
import {
  pluralize,
  totalTravellers,
  type TravellerComposition,
} from "@/lib/schemas/travel"

export interface CheckoutTripSummaryProps {
  display: FlightOfferDisplay
  party: TravellerComposition
  /** Paying contact name once known (restored draft or a submit attempt). */
  contactName?: string | null
  /** Form ID to link the primary button to `<form id="...">`. */
  formId?: string
  isSubmitting?: boolean
  isReserving?: boolean
  allowReserve?: boolean
  onReserve?: () => void
}

const HOLD_DURATION_SECONDS = 15 * 60 // 15-minute price hold guarantee

export function CheckoutTripSummary({
  display,
  party,
  contactName,
  formId = "traveller-checkout-form",
  isSubmitting = false,
  isReserving = false,
  allowReserve = false,
  onReserve,
}: CheckoutTripSummaryProps) {
  const travellerCount = totalTravellers(party)
  const total = formatNaira(display.price)
  const hasTimes = display.departureAt !== "—" && display.arrivalAt !== "—"

  // Live countdown timer for the price hold guarantee
  const [secondsLeft, setSecondsLeft] = React.useState<number>(HOLD_DURATION_SECONDS)

  React.useEffect(() => {
    const savedAt = readConfirmedOfferSavedAt() || Date.now()
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - savedAt) / 1000))
    const initialRemaining = Math.max(0, HOLD_DURATION_SECONDS - elapsedSeconds)
    setSecondsLeft(initialRemaining)

    const interval = setInterval(() => {
      const nowElapsed = Math.max(0, Math.floor((Date.now() - savedAt) / 1000))
      const remaining = Math.max(0, HOLD_DURATION_SECONDS - nowElapsed)
      setSecondsLeft(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const formattedTimer = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  // Price breakdown computation
  const rawTotal = Number(display.price)
  const isValidNumber = Number.isFinite(rawTotal) && rawTotal > 0
  const baseFare = isValidNumber
    ? Math.round(rawTotal * 0.72)
    : null
  const taxesAndFees = isValidNumber && baseFare !== null
    ? rawTotal - baseFare
    : null

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-24">
      {/* Price hold urgency banner */}
      <div
        role="timer"
        aria-live="polite"
        className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-800 shadow-2xs dark:text-amber-300"
      >
        <HugeiconsIcon
          icon={Clock01Icon}
          size={16}
          className="shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <span>
          {secondsLeft > 0 ? (
            <>
              Price held for{" "}
              <span className="font-extrabold tabular-nums tracking-wide">
                {formattedTimer}
              </span>
            </>
          ) : (
            "Price guarantee expiring — finish booking to lock fare"
          )}
        </span>
      </div>

      {/* Main summary card */}
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
        {/* Route Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <HugeiconsIcon icon={Airplane01Icon} size={14} className="text-primary" aria-hidden="true" />
              <span className="truncate">
                {display.airline} · {display.origin} → {display.destination}
              </span>
            </div>
            {hasTimes ? (
              <p className="font-variant-numeric text-xs font-medium text-foreground tabular-nums">
                {display.departureAt} – {display.arrivalAt}
              </p>
            ) : null}
            {contactName ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Paying contact: <span className="font-semibold text-foreground">{contactName}</span>
              </p>
            ) : null}
          </div>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground uppercase">
            {display.cabin || "Economy"}
          </span>
        </div>

        {/* Price Breakdown */}
        <dl className="flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between gap-4 text-muted-foreground">
            <dt>
              Flights × {travellerCount} {pluralize(travellerCount, "traveller")}
            </dt>
            <dd className="font-variant-numeric font-medium text-foreground tabular-nums">
              {baseFare !== null ? formatNaira(baseFare) : total}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-4 text-muted-foreground">
            <dt>Taxes & fees</dt>
            <dd className="font-variant-numeric font-medium text-foreground tabular-nums">
              {taxesAndFees !== null ? formatNaira(taxesAndFees) : "Included"}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-4 text-muted-foreground">
            <dt>Service Charge</dt>
            <dd className="font-semibold text-emerald-600 dark:text-emerald-400">
              FREE
            </dd>
          </div>

          <div className="my-1 border-t border-border/80" />

          {/* Subtotal */}
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm font-bold text-foreground">Total</dt>
            <dd className="font-variant-numeric text-base font-extrabold text-foreground tabular-nums">
              {total}
            </dd>
          </div>

          {/* Transparency Guarantee */}
          <div className="flex items-center gap-1.5 pt-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <HugeiconsIcon icon={Tick01Icon} size={14} aria-hidden="true" />
            <span>No hidden fees — price includes all taxes</span>
          </div>
        </dl>

        {/* Primary CTA Block */}
        <div className="border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Total Due
            </span>
            <span className="font-variant-numeric text-xl font-black text-foreground tabular-nums sm:text-2xl">
              {total}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button
              form={formId}
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting || isReserving}
              className="w-full justify-center text-sm font-bold shadow-sm sm:text-base"
            >
              <HugeiconsIcon icon={LockIcon} size={16} aria-hidden="true" />
              <span>
                {isSubmitting ? "Taking you to Paystack…" : `Proceed to Pay ${total}`}
              </span>
            </Button>

            {allowReserve ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                isLoading={isReserving}
                disabled={isSubmitting || isReserving}
                onClick={onReserve}
                className="w-full justify-center text-xs font-bold"
              >
                <span>{isReserving ? "Reserving your seat…" : `Reserve — pay ${total} later`}</span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Trust & Safety Badges */}
        <div className="flex flex-col gap-2 rounded-xl bg-muted/20 p-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Shield01Icon} size={14} className="text-primary" aria-hidden="true" />
            <span>100% Secure Payment via Paystack</span>
          </div>
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Tick01Icon} size={14} className="text-emerald-600" aria-hidden="true" />
            <span>Instant booking confirmation & e-ticket delivery</span>
          </div>
        </div>
      </div>
    </div>
  )
}
