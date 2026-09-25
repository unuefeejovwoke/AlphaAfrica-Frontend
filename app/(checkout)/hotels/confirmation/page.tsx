import * as React from "react"
import type { Metadata } from "next"
import { HotelConfirmationClient } from "@/components/hotels/hotel-confirmation-client"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Confirming your Hotel payment | Alphaa Africa",
  description:
    "We're confirming your hotel payment. Returning here does not mean the payment succeeded — do not close this page yet.",
  alternates: { canonical: canonicalUrl("/hotels/confirmation") },
  robots: { index: false, follow: false },
}

function ConfirmationFallback() {
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
 * `/hotels/confirmation?reference=…` (static shell, never indexed): the
 * Paystack return target per the ADR-0005 contract. Renders nothing
 * conclusive on the server — the client reads the Payment Reference from the
 * return URL, verifies it without caching, and renders the premium Hotel
 * Booking confirmation or the payment-safety recovery panel.
 */
export default function HotelConfirmationPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6">
      <React.Suspense fallback={<ConfirmationFallback />}>
        <HotelConfirmationClient />
      </React.Suspense>
    </div>
  )
}
