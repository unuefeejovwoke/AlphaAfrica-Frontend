import * as React from "react"
import type { Metadata } from "next"
import { FlightVerifyClient } from "@/components/flights/flight-verify-client"
import { FlightJourneyHeader } from "@/components/flights/flight-journey-header"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Confirming your flight payment | Alphaa Africa",
  description:
    "We're confirming your flight payment. Returning here does not mean the payment succeeded — do not close this page yet.",
  alternates: { canonical: canonicalUrl("/flights/verify") },
  robots: { index: false, follow: false },
}

function VerifyFallback() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 py-16 text-center sm:px-6">
      <p
        className="text-2xl font-extrabold tracking-tight text-foreground"
        role="status"
        aria-live="polite"
      >
        Confirming your payment…
      </p>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        Reading your payment reference. Do not close this page yet.
      </p>
    </div>
  )
}

/**
 * `/flights/verify?reference=…` (static shell, never indexed): the Paystack
 * return target via the ticket-07 contract. Renders nothing conclusive on
 * the server — the client reads the reference from the return URL, verifies
 * it without caching, and renders the premium confirmation or the
 * payment-safety recovery panel (spec stories 24–27).
 */
export default function FlightVerifyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6">
      <FlightJourneyHeader current={6} />
      <React.Suspense fallback={<VerifyFallback />}>
        <FlightVerifyClient />
      </React.Suspense>
    </div>
  )
}
