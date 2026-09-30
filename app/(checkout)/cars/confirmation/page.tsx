import * as React from "react"
import type { Metadata } from "next"
import { CarConfirmationClient } from "@/components/cars/car-confirmation-client"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Confirming your Car payment | Alphaa Africa",
  description:
    "We're confirming your car hire payment. Returning here does not mean the payment succeeded — do not close this page yet.",
  alternates: { canonical: canonicalUrl("/cars/confirmation") },
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
 * `/cars/confirmation?reference=…` — Paystack return target.
 * Client verifies without caching via universal order + module fallback.
 */
export default function CarConfirmationPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6">
      <React.Suspense fallback={<ConfirmationFallback />}>
        <CarConfirmationClient />
      </React.Suspense>
    </div>
  )
}
