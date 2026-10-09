import * as React from "react"
import type { Metadata } from "next"
import { FlightPayClient } from "@/components/flights/flight-pay-client"
import { FlightJourneyHeader } from "@/components/flights/flight-journey-header"
import { Skeleton } from "@/components/ui/skeleton"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Pay for your reserved flight | Alphaa Africa",
  description:
    "Confirm and pay for a flight seat reserved with Alphaa Africa. Secure payment via Paystack.",
  alternates: { canonical: canonicalUrl("/flights/pay") },
  // A guest secure token travels in this URL. Never index it, never let a
  // crawler follow it — same treatment as /order, /orders, and /flights/verify.
  robots: { index: false, follow: false, nocache: true },
}

function PayFallback() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16 sm:px-6">
      <Skeleton className="h-8 w-64 rounded-xl" />
      <Skeleton className="h-4 w-96 rounded-lg" />
      <Skeleton className="mt-4 h-64 w-full rounded-[2rem]" />
    </div>
  )
}

/**
 * `/flights/pay?reference=…&email=…&token=…` — the destination of the "Pay Now to
 * Confirm" button in the reservation email (guide §9), and the one new page this
 * feature requires. Shows the Customer what they are about to pay for, then
 * hands them to Paystack on an explicit action.
 *
 * A static shell: it renders nothing conclusive on the server. The Booking's
 * live payment state is read on the client, because this URL may be opened on
 * any device days after the email was sent.
 */
export default function FlightPayPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
      <div className="pt-6">
        <FlightJourneyHeader current={3} />
      </div>
      <React.Suspense fallback={<PayFallback />}>
        <FlightPayClient />
      </React.Suspense>
    </div>
  )
}