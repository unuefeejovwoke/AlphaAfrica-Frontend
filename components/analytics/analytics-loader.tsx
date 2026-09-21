"use client";

import dynamic from "next/dynamic";

// Lazy-load the measurement provider after hydration (vercel:
// bundle-dynamic-imports). This loader is the client boundary the root
// layout renders; the provider chunk itself loads lazily so it never bloats
// the booking-path first paint.
const AnalyticsProvider = dynamic(
  () =>
    import("@/components/analytics/analytics-provider").then(
      (m) => m.AnalyticsProvider,
    ),
  { ssr: false },
);

export function AnalyticsLoader() {
  return <AnalyticsProvider />;
}
