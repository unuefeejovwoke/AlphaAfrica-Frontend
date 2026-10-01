/**
 * Centralized environment access for the Alphaa Africa platform.
 *
 * Single source of truth for every runtime env read so callers never scatter
 * `process.env` keys across the codebase. Values are read lazily (per call),
 * never cached at module scope, so tests can override `process.env` freely.
 *
 * Validation policy is warn-with-fallback: a missing or malformed value logs a
 * dev-only warning and falls back to the production default, so a bad local
 * `.env.local` can never hard-crash the app. `NEXT_PUBLIC_*` keys are inlined
 * by Next.js at build time (changing them requires a rebuild); the server-only
 * keys (`API_BASE_URL`, `SITE_URL`) are read at runtime.
 */

const FALLBACK_API_BASE_URL = "https://api.alphaaafrica.com"
const FALLBACK_SITE_URL = "https://www.alphaaafrica.com"

function readFirst(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim() ?? ""
    if (trimmed.length > 0) return trimmed
  }
  return ""
}

/** Trim whitespace and strip trailing slashes so URL joins stay predictable. */
export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * True for loopback hosts: `localhost`, all `127.x`, `::1`, `0.0.0.0`.
 * Pure seam so the production guardrail (and its tests) can name the exact
 * hosts a deployment must never point at.
 */
export function isLoopbackUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase()
    if (host === "localhost" || host === "0.0.0.0") return true
    if (host === "::1" || host === "[::1]") return true
    if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true
    return false
  } catch {
    return false
  }
}

/** True only at production request runtime — never during `next build`. */
function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  )
}

/** Build-phase fallbacks already reported (module-scoped so one bad value
 * logs once per build instead of once per prerendered page). */
const reportedBuildFallbacks = new Set<string>()

/** Loudly report a build-phase fallback exactly once per bad value. */
function reportBuildFallback(
  label: string,
  raw: string,
  reason: string,
  fallback: string
): void {
  const key = `${label}:${raw}`
  if (reportedBuildFallbacks.has(key)) return
  reportedBuildFallbacks.add(key)
  console.error(
    `[alphaa] Invalid ${label} "${raw}" (${reason}) — falling back to ${fallback} for this build only.`
  )
}

/**
 * Resolve the first non-blank candidate into a normalized base URL.
 *
 * An explicitly configured value that is malformed or points at loopback
 * fails loudly at production runtime (throw) instead of silently falling
 * back to the production default — a deployment talking to the wrong place
 * must be impossible to miss. During `next build` the same misconfiguration
 * is loudly reported (`console.error`) but still falls back, so local
 * production-mode builds with loopback `.env.local` values keep working;
 * in development it keeps the existing warn-with-fallback behaviour.
 */
export function resolveBaseUrl(
  label: string,
  fallback: string,
  ...candidates: Array<string | undefined>
): string {
  const raw = readFirst(...candidates)
  if (raw.length === 0) return fallback
  const normalized = normalizeBaseUrl(raw)
  if (!isHttpUrl(normalized)) {
    // Malformed values can never work anywhere: loud in production, a
    // warning elsewhere, fallback everywhere except production runtime.
    if (isProductionRuntime()) {
      throw new Error(
        `[alphaa] Invalid ${label} "${raw}" (malformed) — refusing to serve production traffic against the ${fallback} fallback.`
      )
    }
    if (process.env.NODE_ENV === "production") {
      reportBuildFallback(label, raw, "malformed", fallback)
    } else {
      console.warn(
        `[alphaa] Invalid ${label} "${raw}" — falling back to ${fallback}.`
      )
    }
    return fallback
  }
  if (!isLoopbackUrl(normalized)) return normalized
  // Loopback is the normal local setup — accepted silently outside
  // production. A production deployment pointing at localhost fails loudly
  // at runtime instead of silently serving the production fallback.
  if (isProductionRuntime()) {
    throw new Error(
      `[alphaa] Invalid ${label} "${raw}" (points at loopback) — refusing to serve production traffic against the ${fallback} fallback.`
    )
  }
  if (process.env.NODE_ENV === "production") {
    reportBuildFallback(label, raw, "points at loopback", fallback)
    return fallback
  }
  return normalized
}

/**
 * Backend base URL.
 * Precedence: `NEXT_PUBLIC_API_BASE_URL` → server-only `API_BASE_URL` →
 * production default. Used by the API client and, server-side, the proxy.
 */
export function apiBaseUrl(): string {
  return resolveBaseUrl(
    "API base URL",
    FALLBACK_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.API_BASE_URL
  )
}

/**
 * Absolute site root for canonical links, metadata, and JSON-LD.
 * Precedence: `NEXT_PUBLIC_SITE_URL` → server-only `SITE_URL` → production
 * default.
 */
export function siteUrl(): string {
  return resolveBaseUrl(
    "site URL",
    FALLBACK_SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL
  )
}

export interface AnalyticsIds {
  gtmId: string
  gaId: string
}

/**
 * Third-party measurement IDs (`NEXT_PUBLIC_*` only, so this stays safe for
 * client components). Blank means disabled — the provider no-ops.
 */
export function analyticsIds(): AnalyticsIds {
  return {
    gtmId: (process.env.NEXT_PUBLIC_GTM_ID ?? "").trim(),
    gaId: (process.env.NEXT_PUBLIC_GA_ID ?? "").trim(),
  }
}
