"use client";

import * as React from "react";
import Script from "next/script";

const GTM_ID = (process.env.NEXT_PUBLIC_GTM_ID ?? "").trim();
const GA_ID = (process.env.NEXT_PUBLIC_GA_ID ?? "").trim();

/**
 * Deferred third-party measurement (Phase 3, ticket 10).
 * - Initializes `window.dataLayer` after hydration so `track()` pushes never
 *   throw before GTM/GA arrive.
 * - Loads GTM/GA with `strategy="lazyOnload"` (vercel:
 *   rendering-script-defer-async) so measurement never blocks the booking
 *   path — scripts fetch during browser idle, after interactive hydration.
 * - Mounted via `next/dynamic` with `ssr: false` from the root layout
 *   (vercel: bundle-dynamic-imports, bundle-defer-third-party), so the
 *   provider chunk stays out of the first-paint bundle.
 * - No-ops when no measurement ID is configured (local/dev): funnel events
 *   still flow to the in-memory log via `lib/analytics.ts`.
 */
export function AnalyticsProvider() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!Array.isArray(window.dataLayer)) {
      window.dataLayer = [];
    }
  }, []);

  if (!GTM_ID && !GA_ID) return null;

  return (
    <>
      {GTM_ID ? (
        <Script
          id="alphaa-gtm"
          src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`}
          strategy="lazyOnload"
        />
      ) : null}
      {GA_ID ? (
        <>
          <Script
            id="alphaa-ga"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`}
            strategy="lazyOnload"
          />
          <Script
            id="alphaa-ga-config"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(GA_ID)});`,
            }}
          />
        </>
      ) : null}
    </>
  );
}
