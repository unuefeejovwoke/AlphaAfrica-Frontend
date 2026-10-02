/**
 * Production guardrails (ticket 08) — pure, dependency-free helpers so both
 * `next.config.ts` and the Node test runner can consume them.
 */

/** One response header entry, shaped for `next.config.ts` headers(). */
export interface SecurityHeader {
  key: string
  value: string
}

/**
 * Site-wide security headers for a payment site.
 *
 * - `Referrer-Policy: strict-origin-when-cross-origin` keeps the full URL
 *   (which carries emailed order tokens and payment references as query
 *   params) same-origin, while cross-origin navigations (Paystack, WhatsApp)
 *   receive the origin only — tokens never leak via the Referer header.
 * - HSTS, no-sniff, and framing denial are the standard transport,
 *   content-type, and framing protections around them.
 */
export function securityHeaders(): SecurityHeader[] {
  return [
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
  ]
}

/** One `next/image` remote pattern. */
export interface RemoteImagePattern {
  protocol: "http" | "https"
  hostname: string
}

const PRODUCTION_IMAGE_PATTERNS: RemoteImagePattern[] = [
  // Backend records still carry Unsplash URLs (hotel/room/package imagery);
  // drop this entry only once no live record references the host.
  { protocol: "https", hostname: "images.unsplash.com" },
  { protocol: "https", hostname: "api.alphaaafrica.com" },
]

/**
 * Image hosts for `next/image` optimisation — backend media hosts. Site-owned
 * imagery lives in `public/images/` and needs no host allowlist entry.
 * Loopback hosts (localhost, 127.0.0.1) work in development only — a
 * production deployment must never advertise or optimise localhost imagery.
 */
export function imageRemotePatterns(
  isProduction: boolean
): RemoteImagePattern[] {
  if (isProduction) return [...PRODUCTION_IMAGE_PATTERNS]
  return [
    ...PRODUCTION_IMAGE_PATTERNS,
    { protocol: "http", hostname: "localhost" },
    { protocol: "http", hostname: "127.0.0.1" },
  ]
}

// ---------------------------------------------------------------------------
// Duration budgets for long-running handlers (seconds for `maxDuration`).
// Each budget covers its own client wait plus a margin, so the platform
// never kills a handler the client is still waiting on.
// ---------------------------------------------------------------------------

/** International search: 30s client search deadline + margin. */
export const FLIGHT_SEARCH_MAX_DURATION_SECONDS = 60

/** Blocking domestic search: 30s client search deadline + margin. */
export const DOMESTIC_SEARCH_MAX_DURATION_SECONDS = 60

/**
 * Domestic SSE stream: 75s client stream wait
 * (`DOMESTIC_STREAM_TIMEOUT_MS`) + 15s margin.
 */
export const DOMESTIC_STREAM_MAX_DURATION_SECONDS = 90
