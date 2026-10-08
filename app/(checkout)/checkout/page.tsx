import * as React from "react"
import {
  CheckoutClient,
  CheckoutSkeleton,
} from "@/components/flights/checkout-client"
import { FlightJourneyHeader } from "@/components/flights/flight-journey-header"
import {
  travellerCompositionSchema,
  type TravellerComposition,
} from "@/lib/schemas/travel"

function readCount(value: string | string[] | undefined): number | null {
  const first = Array.isArray(value) ? value[0] : value
  if (first === undefined || first.trim() === "") return null
  const parsed = Number(first)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

/**
 * Party from the search-step URL, or null when it is absent/invalid so the
 * client falls back to the session party (retired /checkout/payment redirects
 * and direct visits carry no query).
 */
function parseUrlParty(params: {
  [key: string]: string | string[] | undefined
}): TravellerComposition | null {
  const adults = readCount(params.adults)
  const children = readCount(params.children)
  const infants = readCount(params.infants)
  if (adults === null || children === null || infants === null) return null
  const parsed = travellerCompositionSchema.safeParse({
    adults,
    children,
    infants,
  })
  return parsed.success ? parsed.data : null
}

/**
 * `/checkout` — one-page checkout: Traveller + contact details, persistent
 * Trip and price summary, and the Paystack handoff behind a single Pay action
 * (PRD §8.3, revised flow). Fare confirmation already happened on the results
 * page, so no booking data is serialized server-side: the Confirmed Offer and
 * Travellers draft stay in session storage (vercel: server-serialization).
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const urlParty = parseUrlParty(params)

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl pb-6">
        <FlightJourneyHeader current={3} />
      </div>

      <div className="mb-8 flex flex-col gap-1.5">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
          Your Booking
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Secure Guest Booking Checkout — Complete your traveller details below.
          Pay now, or reserve your seat on international flights and pay later.
        </p>
      </div>

      <div>
        <React.Suspense fallback={<CheckoutSkeleton />}>
          <CheckoutClient urlParty={urlParty} />
        </React.Suspense>
      </div>
    </section>
  )
}
