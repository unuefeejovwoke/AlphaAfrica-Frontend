"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  InformationCircleIcon,
  LockIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Button } from "@/components/ui/button"
import { formatNaira } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { FlightOfferDisplay } from "@/lib/api/flights"
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
  /** Live traveller-form validity — CTA stays disabled until true. */
  canSubmit?: boolean
  termsAccepted?: boolean
  onTermsChange?: (accepted: boolean) => void
}

export function CheckoutTripSummary({
  display,
  party,
  contactName,
  formId = "traveller-checkout-form",
  isSubmitting = false,
  isReserving = false,
  allowReserve = false,
  onReserve,
  canSubmit = false,
  termsAccepted = false,
  onTermsChange,
}: CheckoutTripSummaryProps) {
  const termsId = React.useId()
  const travellerCount = totalTravellers(party)
  const total = formatNaira(display.price)
  const hasTimes = display.departureAt !== "—" && display.arrivalAt !== "—"

  const gated = !canSubmit || !termsAccepted
  const busy = isSubmitting || isReserving
  const payDisabled = busy || gated
  const gateReason = !canSubmit
    ? "Complete all required traveller fields to unlock payment."
    : "Accept the Terms & Conditions to unlock payment."

  // Only render what the airline actually sent — never invent a split.
  const breakdown = display.priceBreakdown ?? null
  const baseFare =
    breakdown?.baseFare && breakdown.baseFare.trim() !== ""
      ? formatNaira(breakdown.baseFare)
      : null
  const markup =
    breakdown?.markup && breakdown.markup.trim() !== ""
      ? formatNaira(breakdown.markup)
      : null
  const hasBreakdown = baseFare !== null || markup !== null

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-12">
      {/* Live-fare notice — no hold is created until pay/reserve succeeds. */}
      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground shadow-2xs">
        <HugeiconsIcon
          icon={InformationCircleIcon}
          size={16}
          className="mt-0.5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span>
          Live airline fare — re-confirmed with the airline before payment.
          Fares can change until your booking is created.
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

        {/* Price Breakdown — backend values only */}
        <dl className="flex flex-col gap-2.5 text-xs">
          {hasBreakdown ? (
            <>
              {baseFare !== null ? (
                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                  <dt>Base fare</dt>
                  <dd className="font-variant-numeric font-medium text-foreground tabular-nums">
                    {baseFare}
                  </dd>
                </div>
              ) : null}

              {markup !== null ? (
                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                  <dt>Taxes, fees &amp; charges</dt>
                  <dd className="font-variant-numeric font-medium text-foreground tabular-nums">
                    {markup}
                  </dd>
                </div>
              ) : null}

              <div className="my-1 border-t border-border/80" />
            </>
          ) : (
            <div className="flex items-center justify-between gap-4 text-muted-foreground">
              <dt>
                Flights × {travellerCount} {pluralize(travellerCount, "traveller")}
              </dt>
              <dd className="font-variant-numeric font-medium text-foreground tabular-nums">
                {total}
              </dd>
            </div>
          )}

          {/* Subtotal */}
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm font-bold text-foreground">Total</dt>
            <dd className="font-variant-numeric text-base font-extrabold text-foreground tabular-nums">
              {total}
            </dd>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Final amount charged in NGN via Paystack.
            {hasBreakdown
              ? " Breakdown as provided by the airline."
              : " Itemised breakdown available from the airline at ticketing."}
          </p>
        </dl>

        {/* Primary CTA Block — the only Proceed / Reserve actions */}
        <div id="checkout-payment" className="scroll-mt-24 border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Total Due
            </span>
            <span className="font-variant-numeric text-xl font-black text-foreground tabular-nums sm:text-2xl">
              {total}
            </span>
          </div>

          {/* Terms consent directly before the payment action */}
          <div className="mb-3 rounded-xl border border-border/80 bg-muted/20 p-3">
            <label
              htmlFor={termsId}
              className="flex cursor-pointer touch-manipulation items-start gap-2.5 rounded-lg px-1 py-1 focus-within:ring-2 focus-within:ring-ring/30"
            >
              <CheckboxPrimitive.Root
                id={termsId}
                checked={termsAccepted}
                onCheckedChange={(next) => onTermsChange?.(next === true)}
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-input bg-card text-primary-foreground shadow-xs transition-colors",
                  "data-checked:border-primary data-checked:bg-primary",
                  "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                )}
              >
                <CheckboxPrimitive.Indicator className="flex items-center justify-center data-unchecked:hidden">
                  <HugeiconsIcon icon={Tick01Icon} size={14} aria-hidden="true" />
                </CheckboxPrimitive.Indicator>
              </CheckboxPrimitive.Root>
              <span className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-medium text-foreground underline underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                >
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-foreground underline underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          </div>

          {payDisabled && !busy ? (
            <p
              role="status"
              aria-live="polite"
              className="mb-2.5 text-center text-[11px] font-medium leading-relaxed text-muted-foreground"
            >
              {gateReason}
            </p>
          ) : null}

          <div className="flex flex-col gap-2.5">
            <Button
              form={formId}
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              disabled={payDisabled}
              title={payDisabled && !busy ? gateReason : undefined}
              aria-describedby={payDisabled && !busy ? `${termsId}-gate` : undefined}
              className="min-h-11 w-full justify-center text-sm font-bold shadow-sm sm:text-base"
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
                disabled={payDisabled}
                onClick={onReserve}
                title={payDisabled && !busy ? gateReason : undefined}
                aria-label={`Reserve — pay ${total} later. ${payDisabled && !busy ? gateReason : "Hold your seat now, pay before the ticketing deadline."}`}
                className="min-h-11 w-full justify-center text-xs font-bold"
              >
                <span>{isReserving ? "Reserving your seat…" : `Reserve — pay ${total} later`}</span>
              </Button>
            ) : null}
            <span id={`${termsId}-gate`} className="sr-only">
              {gateReason}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
