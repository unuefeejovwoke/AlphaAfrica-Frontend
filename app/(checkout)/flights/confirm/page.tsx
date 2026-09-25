import * as React from "react"
import type { Metadata } from "next"
import { PriceConfirmationClient } from "@/components/flights/price-confirmation-client"
import { FlightJourneyHeader } from "@/components/flights/flight-journey-header"
import { canonicalUrl } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Confirm Live Fare | Alphaa Africa",
  description:
    "We recheck your selected flight with the airline before traveller details. Unchanged fares continue directly; changed fares need your consent; expired fares never book silently.",
  alternates: { canonical: canonicalUrl("/flights/confirm") },
  robots: {
    index: false,
    follow: false,
  },
}

// Static shell in the distraction-free checkout group (ADR-0001). The opaque
// Flight Offer blob is client-side (sessionStorage) and never enters the URL,
// so the server renders no offer data — nothing is serialized to the client
// (vercel: server-serialization).
export default function ConfirmFlightPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6">
      <FlightJourneyHeader current={3} />
      <React.Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            className="px-4 py-10 sm:px-6"
          >
            Confirming live fare… airlines are rechecking this price…
          </div>
        }
      >
        <PriceConfirmationClient />
      </React.Suspense>
    </div>
  )
}
