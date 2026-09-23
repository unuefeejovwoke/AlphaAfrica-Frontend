"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { TravellerDetailsForm } from "@/components/flights/traveller-details-form"
import { isDomesticSearch } from "@/lib/api/domestic"
import {
  getFlightSupportWhatsAppUrl,
  normalizeFlightOffer,
  readConfirmedOffer,
  saveTravellersDraft,
  type FlightTripContext,
} from "@/lib/api/flights"
import { track } from "@/lib/analytics"
import { TrackLink } from "@/components/analytics/track-link"
import type {
  BookingTravellersPayload,
  TravellerComposition,
} from "@/lib/schemas/travel"
import { pluralize } from "@/lib/schemas/travel"

/**
 * Checkout Step 1 — Traveller Details.
 * - Domestic vs international comes from the Confirmed Offer route (same
 *   both-Nigerian rule as search auto-routing); unknown defaults to
 *   international, the strict superset the backend always accepts.
 * - Valid submit persists a normalized draft to session for ticket 07
 *   (payment) and shows a saved state with support hatch — no payment UI
 *   is invented here.
 */
export function CheckoutTravellersClient({
  party,
}: {
  party: TravellerComposition
}) {
  // Expensive-enough initial detection runs once (vercel: rerender-lazy-state-init).
  const [initial] = React.useState(() => {
    try {
      const offer = readConfirmedOffer()
      if (!offer)
        return { isInternational: true, trip: {} satisfies FlightTripContext }
      const display = normalizeFlightOffer(offer, 0)
      return {
        isInternational: !isDomesticSearch(display.origin, display.destination),
        trip: {
          origin: display.origin,
          destination: display.destination,
          adults: party.adults,
          children: party.children,
          infants: party.infants,
        } satisfies FlightTripContext,
      }
    } catch {
      return { isInternational: true, trip: {} satisfies FlightTripContext }
    }
  })
  const [saved, setSaved] = React.useState<BookingTravellersPayload | null>(
    null
  )

  // Checkout started: fire once on traveller-form mount (ticket 10). Props are
  // coarse counts only — never passport, contact, or offer data.
  const checkoutStartedRef = React.useRef(false)
  React.useEffect(() => {
    if (checkoutStartedRef.current) return
    checkoutStartedRef.current = true
    track("flight_checkout_started", {
      travellers: String(party.adults + party.children + party.infants),
      is_international: initial.isInternational ? "true" : "false",
    })
  }, [party.adults, party.children, party.infants, initial.isInternational])

  const handleSubmit = React.useCallback(
    (payload: BookingTravellersPayload) => {
      saveTravellersDraft(payload)
      setSaved(payload)
    },
    []
  )

  if (saved) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={Tick01Icon} size={24} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-extrabold text-foreground">
          Traveller details saved
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {pluralize(saved.travellers.length, "traveller")} · Paying contact{" "}
          {saved.customer.name}. You will continue to secure payment with
          Paystack on the next step.
        </p>
        <div className="flex flex-col items-center gap-2 pt-1 sm:flex-row">
          <Button render={<Link href="/checkout/payment" />}>
            <span>Continue to payment</span>
          </Button>
          <Button render={<Link href="/flights" />} variant="outline">
            <span>Choose a different flight</span>
          </Button>
          <Button
            render={
              <TrackLink
                event="support_click"
                eventProps={{
                  context: "traveller details",
                  channel: "whatsapp",
                }}
                href={getFlightSupportWhatsAppUrl(
                  "traveller details I just saved",
                  initial.trip
                )}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <span>Talk to Alphaa</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <TravellerDetailsForm
        party={party}
        isInternational={initial.isInternational}
        onSubmit={handleSubmit}
        trip={initial.trip}
      />
    </div>
  )
}
