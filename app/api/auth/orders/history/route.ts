import { buildLoginTarget } from "@/lib/api/auth"
import { jsonResponse, sessionProxiedRequest } from "@/lib/api/session"

export const dynamic = "force-dynamic"

/**
 * `GET /api/auth/orders/history` — session-backed order history (spec
 * stories 42–43). The Bearer attaches server-side from HttpOnly cookies,
 * so history opens without email tokens. Guest `?email=&token=` keeps
 * working through the unchanged `/api/payments/orders/history` route;
 * cross-account references pass the backend 403 through untouched.
 */
export async function GET(request: Request): Promise<Response> {
  const upstream = await sessionProxiedRequest(
    request,
    "/api/payments/orders/history/"
  )
  if (!upstream) {
    return jsonResponse({ loginTarget: buildLoginTarget("/orders") }, 401)
  }
  return upstream
}
