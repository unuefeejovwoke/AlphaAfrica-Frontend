import {
  buildRefreshRequest,
  normalizeRefreshResponse,
} from "@/lib/api/auth"
import { proxyToBackend } from "@/lib/api/proxy"
import {
  jsonResponse,
  readSessionTokens,
  setSessionCookies,
  clearSessionCookies,
} from "@/lib/api/session"

export const dynamic = "force-dynamic"

/**
 * `POST /api/auth/refresh` — rotates the session from the refresh cookie
 * through the shared proxy. Failure clears both cookies and answers a
 * fixed non-revealing 401, so a dead session never lingers and backend
 * detail never crosses the seam; the caller routes to login with a
 * return target.
 */
export async function POST(request: Request): Promise<Response> {
  const { refresh } = await readSessionTokens()
  if (!refresh) {
    return jsonResponse({ detail: "No session to refresh." }, 401)
  }

  const forward = new Request(request.url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(buildRefreshRequest(refresh)),
  })
  const upstream = await proxyToBackend(forward, "/api/auth/token/refresh/")
  let payload: unknown = null
  try {
    payload = await upstream.json()
  } catch {
    payload = null
  }
  const pair = normalizeRefreshResponse(payload)
  if (!upstream.ok || pair.status === "unauthenticated") {
    await clearSessionCookies()
    return jsonResponse({ detail: "Session expired." }, 401)
  }
  await setSessionCookies({ access: pair.access, refresh: pair.refresh })
  return jsonResponse({ ok: true }, 200)
}
