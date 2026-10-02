"use client"

import dynamic from "next/dynamic"

import { ConsentBanner } from "@/components/analytics/consent-banner"

// Lazy-load the measurement provider after hydration (vercel:
// bundle-dynamic-imports). This loader is the client boundary the root
// layout renders; the provider chunk itself loads lazily so it never bloats
// the booking-path first paint. The consent banner ships in the same boundary
// so no page ever needs its own import.
const AnalyticsProvider = dynamic(
  () =>
    import("@/components/analytics/analytics-provider").then(
      (m) => m.AnalyticsProvider
    ),
  { ssr: false }
)

export function AnalyticsLoader() {
  return (
    <>
      <AnalyticsProvider />
      <ConsentBanner />
    </>
  )
}
