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
 * Resolve the first non-blank candidate into a normalized base URL.
 * Returns `fallback` (with a dev-only warning) when nothing usable is set or
 * the value is not an http(s) URL.
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
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[alphaa] Invalid ${label} "${raw}" — falling back to ${fallback}.`
      )
    }
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
