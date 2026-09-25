import * as React from "react"
import type { FlightOfferDisplay } from "@/lib/api/flights"
import { formatNaira } from "@/lib/format"
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
}

/**
 * Persistent Trip and price summary beside the checkout form (PRD §8.3).
 * Presentational only — the Confirmed Offer display and party are already
 * resolved by the checkout client; no session reads happen here.
 */
export function CheckoutTripSummary({
  display,
  party,
  contactName,
}: CheckoutTripSummaryProps) {
  const travellerCount = totalTravellers(party)
  const total = formatNaira(display.price)
  const hasDates = display.departureAt !== "—" && display.arrivalAt !== "—"

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6 lg:sticky lg:top-24">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-foreground">Your trip</h2>
        <p className="text-sm leading-relaxed font-semibold text-foreground">
          {display.airportsLabel}
        </p>
        <p className="text-sm text-muted-foreground">
          {display.airline} · {display.cabin} ·{" "}
          {pluralize(travellerCount, "traveller")}
          {contactName ? <> · Paying contact {contactName}</> : null}
        </p>
      </div>

      {hasDates ? (
        <p className="text-sm text-muted-foreground">
          Departs {display.departureAt} · Arrives {display.arrivalAt}
        </p>
      ) : null}

      <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Fare</dt>
          <dd className="font-variant-numeric font-semibold text-foreground tabular-nums">
            {total}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-base font-bold text-foreground">
            Total due today
          </dt>
          <dd className="font-variant-numeric text-base font-extrabold text-foreground tabular-nums">
            {total}{" "}
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              {display.currency}
            </span>
          </dd>
        </div>
      </dl>

      <p className="border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Guest Booking — no account needed. You pay securely on Paystack, and the
        final amount is confirmed there before any charge.
      </p>
    </div>
  )
}
