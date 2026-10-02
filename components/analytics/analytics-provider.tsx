"use client"

import * as React from "react"
import Script from "next/script"

import { analyticsIds } from "@/lib/env"
import {
  CONSENT_EVENT,
  getConsent,
  type ConsentState,
} from "@/lib/consent"

const { gtmId: GTM_ID, gaId: GA_ID } = analyticsIds()

/**
 * Deferred third-party measurement (Phase 3, ticket 10).
 * - Consent-gated (NDPA/GDPR): `window.dataLayer` is initialised and GTM/GA
 *   scripts load only after the visitor grants consent via `ConsentBanner`.
 *   Before that (or on decline) this renders nothing, so `track()` in
 *   `lib/analytics.ts` keeps events in its in-memory log and never pushes to
 *   a third party.
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
  const [consent, setConsentState] = React.useState<ConsentState>("pending")

  React.useEffect(() => {
    setConsentState(getConsent())
    const onChange = () => setConsentState(getConsent())
    window.addEventListener(CONSENT_EVENT, onChange)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange)
      window.removeEventListener("storage", onChange)
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (consent !== "granted") return
    if (!Array.isArray(window.dataLayer)) {
      window.dataLayer = []
    }
  }, [consent])

  if (consent !== "granted") return null
  if (!GTM_ID && !GA_ID) return null

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
  )
}
