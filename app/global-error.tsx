"use client"

import * as React from "react"
import { ErrorState } from "@/components/feedback/error-state"
import { resolveRouteErrorPreset } from "@/lib/route-error"

/**
 * Global boundary for failures outside a route group (ticket 09).
 *
 * Owns its own `<html>`/`<body>` (required) and stays dependency-light: no
 * router hooks (no router context exists here), just the existing
 * `ErrorState` with retry, the home route, and specialist escalation.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const regionRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    regionRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <html lang="en">
      <body>
        <main className="mx-auto w-full max-w-3xl px-4 py-10">
          <div
            ref={regionRef}
            tabIndex={-1}
            aria-label="Alphaa is temporarily unavailable"
            className="outline-none"
          >
            <ErrorState
              preset={resolveRouteErrorPreset(error)}
              error={error}
              onRetry={reset}
              retryLabel="Try Again"
              alternateLabel="Return Home"
              alternateHref="/"
            />
          </div>
        </main>
      </body>
    </html>
  )
}
