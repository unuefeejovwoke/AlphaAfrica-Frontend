import { normalizeLoginResponse } from "@/lib/api/auth"
import { proxyToBackend } from "@/lib/api/proxy"
import { clearSessionCookies, jsonResponse, setSessionCookies } from "@/lib/api/session"

export const dynamic = "force-dynamic"

/**
 * `POST /api/auth/login` — credentials travel to the backend through the
 * shared proxy untouched; only the pass-through answer is read back. On
 * success the session cookies are set and the browser receives the user
 * only — tokens never reach readable JS. Backend failures pass through
 * verbatim so client `ApiError` mapping still applies.
 */
export async function POST(request: Request): Promise<Response> {
  const upstream = await proxyToBackend(request, "/api/auth/login/")
  if (!upstream.ok) return upstream

  let payload: unknown = null
  try {
    payload = await upstream.json()
  } catch {
    payload = null
  }
  const result = normalizeLoginResponse(payload)
  if (result.status === "unauthenticated") {
    await clearSessionCookies()
    return jsonResponse({ detail: "Sign-in failed." }, 401)
  }
  await setSessionCookies({ access: result.access, refresh: result.refresh })
  return jsonResponse({ user: result.user }, 200)
}
