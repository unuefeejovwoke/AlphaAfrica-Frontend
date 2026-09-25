import * as React from "react"
import type { Metadata } from "next"
import { CheckoutPaymentClient } from "@/components/flights/checkout-payment-client"
import { FlightJourneyHeader } from "@/components/flights/flight-journey-header"
import { Skeleton } from "@/components/ui/skeleton"
import { canonicalUrl } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Pay Securely via Paystack | Alphaa Africa",
  description:
    "Review your trip and price summary, then create one Pending Booking and pay securely on Paystack. Duplicate payments are prevented and your reference is kept safe.",
  alternates: { canonical: canonicalUrl("/checkout/payment") },
  robots: {
    index: false,
    follow: false,
  },
}

function PaymentFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading payment step"
      className="mx-auto flex w-full max-w-2xl flex-col gap-4"
    >
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
    </div>
  )
}

// Static shell in the distraction-free checkout group (ADR-0001). The
// Confirmed Offer blob and Travellers draft are client-side (sessionStorage)
// and never enter the URL, so the server renders no booking data — nothing
// is serialized to the client (vercel: server-serialization).
export default function CheckoutPaymentPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <FlightJourneyHeader current={5} />
      </div>
      <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-4 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-4xl">
          Review and Pay Securely
        </h1>
        <p className="min-w-0 text-sm leading-relaxed break-words text-muted-foreground">
          Confirm your trip and total, then continue to Paystack. One booking is
          created per trip — double taps cannot double-charge you.
        </p>
      </div>
      <div className="mt-8">
        <React.Suspense fallback={<PaymentFallback />}>
          <CheckoutPaymentClient />
        </React.Suspense>
      </div>
    </section>
  )
}
