import { buildLoginTarget } from "@/lib/api/auth"
import { jsonResponse, sessionProxiedRequest } from "@/lib/api/session"

export const dynamic = "force-dynamic"

/**
 * `GET /api/auth/orders/[reference]` — session-backed single order (spec
 * story 42). Same contract as history: Bearer from cookies, verbatim
 * answers, plain 403s for cross-account references.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
): Promise<Response> {
  const { reference } = await params
  const upstream = await sessionProxiedRequest(
    request,
    `/api/payments/order/${encodeURIComponent(reference)}/`
  )
  if (!upstream) {
    return jsonResponse(
      { loginTarget: buildLoginTarget(`/order?reference=${encodeURIComponent(reference)}`) },
      401
    )
  }
  return upstream
}
