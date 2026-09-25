import * as React from "react"
import Link from "next/link"
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
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <FlightJourneyHeader current={3} />
      </div>
      <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-4 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-4xl">
          Secure Guest Booking Checkout
        </h1>
        <p className="min-w-0 text-sm leading-relaxed break-words text-muted-foreground">
          Complete your reservation without creating an account. Your payment
          stays protected by 256-bit encryption, and our Abuja specialists
          remain one call away if you need assistance…
        </p>
        <p className="text-xs text-muted-foreground">
          Complete your booking details below — your reference is issued once
          payment is confirmed.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Return to homepage
          </Link>
        </div>
      </div>
      <div className="mt-8">
        <React.Suspense fallback={<CheckoutSkeleton />}>
          <CheckoutClient urlParty={urlParty} />
        </React.Suspense>
      </div>
    </section>
  )
}
