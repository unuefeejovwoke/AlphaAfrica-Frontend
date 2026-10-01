import {
  sanitizeReportContext,
  writeServerReport,
  type ErrorReport,
} from "@/lib/error-reporter"

/**
 * Error ingress (ticket 10): the client beacon lands here and becomes the
 * server durable record. The payload is re-sanitized — only the allowlisted
 * context plus a charset-checked kind survive — so a hostile client cannot
 * smuggle PII into the logs.
 */

export const dynamic = "force-dynamic"

const SAFE_KIND_PATTERN = /^[\w:.-]{1,64}$/

export async function POST(request: Request): Promise<Response> {
  let body: unknown = null
  try {
    body = (await request.json()) as unknown
  } catch {
    return Response.json({ message: "Unprocessable report." }, { status: 400 })
  }
  if (typeof body !== "object" || body === null) {
    return Response.json({ message: "Unprocessable report." }, { status: 400 })
  }
  const record = body as Record<string, unknown>
  const rawContext = record.context
  const context = sanitizeReportContext(
    typeof rawContext === "object" && rawContext !== null
      ? (rawContext as Record<string, string>)
      : {}
  )
  if (!context) {
    return Response.json({ message: "Unprocessable report." }, { status: 400 })
  }
  const kind =
    typeof record.kind === "string" && SAFE_KIND_PATTERN.test(record.kind)
      ? record.kind
      : "client-report"
  const report: ErrorReport = {
    kind,
    context,
    reportedAt: new Date().toISOString(),
  }
  writeServerReport(report)
  return new Response(null, { status: 202 })
}
