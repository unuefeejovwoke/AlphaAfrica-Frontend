import { envConfigStatus } from "./env.ts"

/**
 * Deployment health without touching the backend (ticket 10).
 *
 * Liveness (`checks.app`) is proven by the route answering at all;
 * configuration validity (`checks.config`) is reported separately so a
 * deployment problem stays distinguishable from an application problem.
 */

export interface HealthStatus {
  status: "ok" | "degraded"
  checks: {
    app: "ok"
    config: ReturnType<typeof envConfigStatus>
  }
  timestamp: string
}

/** Pure status builder — reads local env only, never fetches. */
export function getHealthStatus(): HealthStatus {
  const config = envConfigStatus()
  const configured =
    config.apiBaseUrl === "configured" && config.siteUrl === "configured"
  return {
    status: configured ? "ok" : "degraded",
    checks: { app: "ok", config },
    timestamp: new Date().toISOString(),
  }
}
