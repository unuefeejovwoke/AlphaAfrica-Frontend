import { proxyToBackend } from "@/lib/api/proxy"

export const dynamic = "force-dynamic"

export function POST(request: Request): Promise<Response> {
  return proxyToBackend(request, "/api/auth/password-reset/request/")
}
