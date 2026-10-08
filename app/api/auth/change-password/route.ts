import { buildLoginTarget } from "@/lib/api/auth"
import { jsonResponse, sessionProxiedRequest } from "@/lib/api/session"

export const dynamic = "force-dynamic"

/**
 * `POST /api/auth/change-password` — signed-in rotation (spec story 32).
 * Passwords pass through the session Bearer untouched and write-only;
 * the backend answer (200, field errors, 401) travels back verbatim.
 * No session means 401 with a login target.
 */
export async function POST(request: Request): Promise<Response> {
  const upstream = await sessionProxiedRequest(
    request,
    "/api/auth/change-password/"
  )
  if (!upstream) {
    return jsonResponse({ loginTarget: buildLoginTarget("/profile") }, 401)
  }
  return upstream
}
