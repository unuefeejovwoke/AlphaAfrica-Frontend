"use client"

import * as React from "react"
import Link from "next/link"

import { analyticsIds } from "@/lib/env"
import {
  CONSENT_EVENT,
  getConsent,
  setConsent,
  type ConsentState,
} from "@/lib/consent"

/**
 * Cookie-consent banner (NDPA/GDPR).
 * - Renders only when a measurement ID is configured — with no GTM/GA id
 *   there is no third-party tracking to consent to, so it stays inert.
 * - Fixed bottom bar, keyboard-focusable actions, `role="dialog"` so screen
 *   readers announce it. Hides permanently once the visitor chooses.
 */
export function ConsentBanner() {
  const { gtmId, gaId } = analyticsIds()
  const [state, setState] = React.useState<ConsentState>("pending")

  React.useEffect(() => {
    setState(getConsent())
    const onChange = () => setState(getConsent())
    window.addEventListener(CONSENT_EVENT, onChange)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange)
      window.removeEventListener("storage", onChange)
    }
  }, [])

  if (!gtmId && !gaId) return null
  if (state !== "pending") return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 shadow-lg backdrop-blur print:hidden"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:px-8">
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          We use cookies to measure visits and improve your booking experience.{" "}
          <Link
            href="/privacy"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Privacy Policy
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setConsent("denied")}
            className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-full border border-border/60 bg-card px-5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0 sm:py-2"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => setConsent("granted")}
            className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0 sm:py-2"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
