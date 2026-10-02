/**
 * NDPA/GDPR consent gate for third-party measurement (GTM/GA).
 *
 * No third-party tag may load or receive data before the visitor grants
 * consent. The choice persists in `localStorage`; `track()` in
 * `lib/analytics.ts` already degrades gracefully because the analytics
 * provider only initialises `window.dataLayer` after consent is granted —
 * pre-consent events stay in the in-memory log and never leave the device.
 */

export type ConsentChoice = "granted" | "denied"
export type ConsentState = ConsentChoice | "pending"

const CONSENT_KEY = "alphaa-consent-v1"

/** Window event fired whenever the visitor makes or changes a choice. */
export const CONSENT_EVENT = "alphaa-consent"

function readStored(): ConsentState {
  if (typeof window === "undefined") return "pending"
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY)
    if (raw === "granted" || raw === "denied") return raw
  } catch {
    // Private mode / blocked storage — treat as undecided, never crash.
  }
  return "pending"
}

/** Current consent state. SSR-safe: returns `"pending"` without `window`. */
export function getConsent(): ConsentState {
  return readStored()
}

/** Persist a choice and notify subscribers (provider, banner). */
export function setConsent(choice: ConsentChoice): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(CONSENT_KEY, choice)
  } catch {
    // Storage blocked — choice still applies to this page view.
  }
  window.dispatchEvent(
    new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: choice })
  )
}
