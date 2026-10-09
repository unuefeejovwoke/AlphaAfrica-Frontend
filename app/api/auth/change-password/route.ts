import { buildChangePasswordRequest, buildLoginTarget } from "@/lib/api/auth"
import { jsonResponse, sessionProxiedRequest } from "@/lib/api/session"

export const dynamic = "force-dynamic"

/**
 * `POST /api/auth/change-password` — signed-in rotation (spec story 32).
 * Passwords pass through the session Bearer untouched and write-only;
 * the backend answer (200, field errors, 401) travels back verbatim.
 * No session means 401 with a login target.
 */
export async function POST(request: Request): Promise<Response> {
  let input: unknown
  try {
    input = await request.json()
  } catch {
    return jsonResponse({ detail: "Invalid request." }, 400)
  }
  const record =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {}
  // Shape through the builder so `confirm_password` (form-only) never
  // travels; missing keys fall through as "" and the backend owns the 400.
  const body = buildChangePasswordRequest({
    old_password:
      typeof record.old_password === "string" ? record.old_password : "",
    new_password:
      typeof record.new_password === "string" ? record.new_password : "",
  })
  const upstream = await sessionProxiedRequest(
    request,
    "/api/auth/change-password/",
    { body }
  )
  if (!upstream) {
    return jsonResponse({ loginTarget: buildLoginTarget("/profile") }, 401)
  }
  return upstream
}
