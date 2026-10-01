"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { ErrorState } from "@/components/feedback/error-state"
import {
  resolveRouteErrorPreset,
  shouldResetRouteError,
} from "@/lib/route-error"

export interface RouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  /** Human section name for the region label (never rendered from the error). */
  flow: string
}

/**
 * Shared segment-error screen for the route groups (ticket 09).
 *
 * - Renders the existing `ErrorState`: diagnosis, retry, specialist
 *   escalation. The thrown value (backend messages, field dumps, stack
 *   traces) is never rendered — only the preset copy and, for typed API
 *   failures, the customer-safe message.
 * - `reset` re-runs the failed segment, preserving page state above the
 *   boundary where possible.
 * - The boundary resets when the Customer navigates on, so a stale failure
 *   screen never persists inside the group.
 * - Focus moves to the failure region on mount so screen-reader and keyboard
 *   Customers land on the diagnosis; `ErrorState` keeps `role="alert"`.
 */
export function RouteError({ error, reset, flow }: RouteErrorProps) {
  const pathname = usePathname()
  const failedPathRef = React.useRef<string | null>(null)
  if (failedPathRef.current === null && pathname !== null) {
    failedPathRef.current = pathname
  }
  const regionRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    regionRef.current?.focus({ preventScroll: true })
  }, [])

  React.useEffect(() => {
    if (shouldResetRouteError(failedPathRef.current, pathname)) reset()
  }, [pathname, reset])

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div
        ref={regionRef}
        tabIndex={-1}
        aria-label={`${flow} is temporarily unavailable`}
        className="outline-none"
      >
        <ErrorState
          preset={resolveRouteErrorPreset(error)}
          error={error}
          onRetry={reset}
          retryLabel="Try Again"
        />
      </div>
    </main>
  )
}
