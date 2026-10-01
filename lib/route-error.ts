import { ApiError } from "./api/client.ts"
import type { ErrorPreset } from "./feedback-presets.ts"

/**
 * Shared error-boundary decisions (ticket 09).
 *
 * Every route-group boundary and the global boundary render the existing
 * `ErrorState` vocabulary — diagnosis, retry, specialist escalation — and
 * never a raw backend message, field dump, or stack trace. The mapping from
 * a thrown value to that vocabulary lives here so it is testable without a
 * DOM harness.
 */

/**
 * Pick the `ErrorState` preset for a render failure. Timeouts keep the
 * honest timeout copy (no booking was made and no payment was taken);
 * everything else — including raw backend errors with field details — maps
 * to the general preset, whose copy is static and customer-safe.
 */
export function resolveRouteErrorPreset(error: unknown): ErrorPreset {
  if (error instanceof ApiError && error.code === "timeout") return "timeout"
  return "general"
}

/**
 * Reset the boundary once the Customer moves on: a stale failure screen must
 * not persist when navigation inside the same route group succeeds.
 */
export function shouldResetRouteError(
  pathWhenFailed: string | null,
  currentPath: string | null
): boolean {
  if (pathWhenFailed === null || currentPath === null) return false
  return pathWhenFailed !== currentPath
}
