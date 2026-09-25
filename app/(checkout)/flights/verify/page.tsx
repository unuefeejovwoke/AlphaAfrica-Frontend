import * as React from "react"
import type { Metadata } from "next"
import { FlightVerifyClient } from "@/components/flights/flight-verify-client"
import { FlightJourneyHeader } from "@/components/flights/flight-journey-header"
import { Skeleton } from "@/components/ui/skeleton"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Official Flight E-Ticket & Confirmation | Alphaa Africa",
  description:
    "Your official electronic flight ticket and travel confirmation document issued by Alphaa Africa.",
  alternates: { canonical: canonicalUrl("/flights/verify") },
  robots: { index: false, follow: false },
}

function VerifyFallback() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
      <Skeleton className="size-12 rounded-2xl" />
      <Skeleton className="h-8 w-64 rounded-xl" />
      <Skeleton className="h-4 w-96 rounded-lg" />
      <Skeleton className="mt-4 h-96 w-full rounded-[2rem]" />
    </div>
  )
}

/**
 * `/flights/verify?reference=…` (static shell, never indexed): the Paystack
 * return target via the ticket-07 contract. Renders the official electronic
 * ticket or the payment-safety recovery panel (spec stories 24–27).
 */
export default function FlightVerifyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 sm:px-6 print:m-0 print:max-w-none print:p-0">
      <div className="print:hidden">
        <FlightJourneyHeader current={4} />
      </div>
      <React.Suspense fallback={<VerifyFallback />}>
        <FlightVerifyClient />
      </React.Suspense>
    </div>
  )
}
