"use client"

import * as React from "react"
import { normalizeAuthUser, type AuthUser } from "@/lib/api/auth"

/**
 * Browser session client (ticket 03). The session itself is server-owned —
 * this module only talks to the same-origin handlers, so tokens never touch
 * readable storage. `authedFetch` replays the server's single-flight rule:
 * one 401 refreshes once and retries the original request exactly once.
 */

let refreshPromise: Promise<boolean> | null = null

async function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      cache: "no-store",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/** Same-origin fetch with one silent refresh-and-retry on 401. */
export async function authedFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const first = await fetch(path, { ...init, cache: "no-store" })
  if (first.status !== 401) return first
  // Concurrent 401s share one refresh — no refresh storms from parallel reads.
  const refreshed = await refreshOnce()
  if (!refreshed) return first
  return fetch(path, { ...init, cache: "no-store" })
}

/** Current user, or null when signed out. Never throws through the UI. */
export async function fetchSessionUser(): Promise<AuthUser | null> {
  try {
    const response = await authedFetch("/api/auth/me")
    if (!response.ok) return null
    const payload = (await response.json()) as unknown
    const record =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)
        : null
    return normalizeAuthUser(record?.user ?? payload)
  } catch {
    return null
  }
}

/** Clears the server session. Callers route and refresh after. */
export async function requestSignOut(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", cache: "no-store" })
  } catch {
    // Cookie clearing is server-side and idempotent — a failed request
    // still ends with a refresh that reads the cleared (or clearing) state.
  }
}

/**
 * Broadcast channel between auth mutations and the already-mounted nav.
 * The session lives in HttpOnly cookies, so a client `fetch` login/logout
 * never re-renders the server `NavSession` on its own — the mutating
 * component notifies, `useSignedIn` applies it instantly, and a
 * `router.refresh()` afterwards converges the server RSC.
 */
export const SESSION_CHANGED_EVENT = "aa:session-changed"

export function notifySessionChanged(signedIn: boolean): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent(SESSION_CHANGED_EVENT, { detail: { signedIn } })
  )
}

/**
 * Client-live nav session. `initial` is the server truth from `NavSession`
 * (fresh on full load); the event applies login/logout instantly without
 * waiting for the RSC round-trip, and a fresh server prop re-syncs on the
 * next navigation. No extra `/api/auth/me` fetch — the mutating call
 * already knows the outcome, so the event carries it.
 */
export function useSignedIn(initial: boolean): boolean {
  const [signedIn, setSignedIn] = React.useState(initial)

  React.useEffect(() => {
    setSignedIn(initial)
  }, [initial])

  React.useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ signedIn?: unknown }>).detail
      if (typeof detail?.signedIn === "boolean") {
        setSignedIn(detail.signedIn)
      }
    }
    window.addEventListener(SESSION_CHANGED_EVENT, onChange)
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, onChange)
    }
  }, [])

  return signedIn
}

/** Checkout-grade contact: split names plus email plus phone, or nothing. */
export interface ProfileContact {
  firstName: string
  lastName: string
  email: string
  phone: string
}

/**
 * Signed-in checkout pre-fill (spec story 39). One fetch serves every
 * booking form; guests resolve to null and see zero change. Names travel
 * split — joining is each form's one line, splitting a joined name is not.
 */
export function useProfileContact(): {
  signedIn: boolean | null
  contact: ProfileContact | null
} {
  const [state, setState] = React.useState<{
    signedIn: boolean | null
    contact: ProfileContact | null
  }>({ signedIn: null, contact: null })

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      const user = await fetchSessionUser()
      if (cancelled) return
      if (!user) {
        setState({ signedIn: false, contact: null })
        return
      }
      setState({
        signedIn: true,
        contact: {
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phone: user.phone_number,
        },
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
