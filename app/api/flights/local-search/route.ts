import { proxyToBackend } from "@/lib/api/proxy"

export const dynamic = "force-dynamic"
// Duration budget: 60s covers the 30s client search deadline plus margin
// (see DOMESTIC_SEARCH_MAX_DURATION_SECONDS in lib/guardrails.ts — kept as
// a literal here because route segment config must be statically analyzable).
export const maxDuration = 60

export function GET(request: Request): Promise<Response> {
  return proxyToBackend(request, "/api/flights/local-search/")
}
