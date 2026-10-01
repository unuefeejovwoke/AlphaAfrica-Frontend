import { getHealthStatus } from "@/lib/health"

/**
 * Health probe (ticket 10): answers liveness plus configuration validity
 * without touching the backend.
 */

export const dynamic = "force-dynamic"

export function GET(): Response {
  return Response.json(getHealthStatus())
}
