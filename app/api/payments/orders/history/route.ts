import { proxyToBackend } from "@/lib/api/proxy"

export const dynamic = "force-dynamic"

export function GET(request: Request): Promise<Response> {
  return proxyToBackend(request, "/api/payments/orders/history/")
}
