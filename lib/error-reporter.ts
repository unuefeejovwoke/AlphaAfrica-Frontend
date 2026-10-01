import { ApiError } from "./api/client.ts"
import { errorReporterId } from "./env.ts"

/**
 * One error reporter for client and server failures (ticket 10).
 *
 * - Reports carry the flow and, where safe, the booking reference — never
 *   passport data, contact details, tokens, or the opaque fare blob. Only
 *   allowlisted fields survive {@link sanitizeReportContext}; everything
 *   else is dropped, and raw error messages are never included (a backend
 *   detail string can itself carry contact data).
 * - Repeated identical failures are deduplicated and bursts sampled, so one
 *   broken upstream does not flood the reporter.
 * - Inert when the reporter id is blank: local and preview runs stay silent.
 * - No top-level side effects and no awaiting on the send path, so calling
 *   it from an effect never delays first paint or hydration.
 */

export interface ReportContextInput {
  flow?: unknown
  bookingReference?: unknown
  route?: unknown
  code?: unknown
  status?: unknown
}

export interface ReportContext {
  flow: string
  bookingReference?: string
  route?: string
  code?: string
  status?: number
}

export interface ErrorReport {
  kind: string
  context: ReportContext
  reportedAt: string
}

const MAX_FIELD_LENGTH = 128
const BOOKING_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{2,63}$/

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, MAX_FIELD_LENGTH)
}

/**
 * Allowlist sanitizer: only the safe report fields pass through.
 * `flow` is required; the booking reference must look like a backend-issued
 * reference or it is dropped along with everything unrecognized.
 */
export function sanitizeReportContext(input: unknown): ReportContext | null {
  if (typeof input !== "object" || input === null) return null
  const record = input as ReportContextInput
  const flow = cleanString(record.flow)
  if (!flow) return null
  const context: ReportContext = { flow }
  const bookingReference = cleanString(record.bookingReference)
  if (bookingReference && BOOKING_REFERENCE_PATTERN.test(bookingReference)) {
    context.bookingReference = bookingReference
  }
  const route = cleanString(record.route)
  if (route && route.startsWith("/")) context.route = route
  const code = cleanString(record.code)
  if (code) context.code = code
  if (
    typeof record.status === "number" &&
    Number.isInteger(record.status) &&
    record.status >= 100 &&
    record.status < 600
  ) {
    context.status = record.status
  }
  return context
}

/**
 * Booking reference from a backend-bound path where it is genuinely safe:
 * verify/order segments (`/verify/<ref>/`, `/order/<ref>`). Anything else —
 * traveller names, tokens, blobs — never matches, so nothing sensitive can
 * ride along by accident.
 */
export function extractBookingReference(path: string): string | undefined {
  const match = path.match(/\/(?:verify|order)\/([^/?#]+)\/?(?:[?#]|$)/)
  const candidate = match?.[1]?.trim() ?? ""
  if (candidate && BOOKING_REFERENCE_PATTERN.test(candidate)) return candidate
  return undefined
}

/** Error kind for the report: class + typed code/status, never the message. */
function reportKind(error: unknown): string {
  if (error instanceof ApiError) {
    return `ApiError:${error.code}:${error.status ?? "none"}`
  }
  if (error instanceof Error) return error.name || "Error"
  return typeof error
}

/** Pure payload builder — what engineers see, with nothing they must not. */
export function createReport(
  error: unknown,
  input: ReportContextInput
): ErrorReport | null {
  const context = sanitizeReportContext(input)
  if (!context) return null
  return {
    kind: reportKind(error),
    context,
    reportedAt: new Date().toISOString(),
  }
}

/** Blank id keeps the reporter inert. */
export function isReporterEnabled(): boolean {
  return errorReporterId().length > 0
}

const DEDUP_WINDOW_MS = 30_000
const MAX_REPORTS_PER_MINUTE = 20

const recentReports = new Map<string, number>()
let windowStart = 0
let windowCount = 0

/** Test seam: clear dedup/sample state between cases. */
export function __resetReportDedup(): void {
  recentReports.clear()
  windowStart = 0
  windowCount = 0
}

/** Burst guard: identical reports within the window, and anything past the per-minute cap, are dropped. */
export function shouldSendReport(key: string, now = Date.now()): boolean {
  if (now - windowStart >= 60_000) {
    windowStart = now
    windowCount = 0
  }
  if (windowCount >= MAX_REPORTS_PER_MINUTE) return false
  const last = recentReports.get(key)
  if (last !== undefined && now - last < DEDUP_WINDOW_MS) return false
  recentReports.set(key, now)
  windowCount += 1
  // ponytail: unbounded growth across a long-lived server; capped by the
  // per-minute reset clearing stale keys on window rollover below.
  if (recentReports.size > MAX_REPORTS_PER_MINUTE * 4) {
    for (const [k, at] of recentReports) {
      if (now - at >= DEDUP_WINDOW_MS) recentReports.delete(k)
    }
  }
  return true
}

export type ReportTransport = (report: ErrorReport) => void

/** Server durable record: one JSON line for the platform log aggregator. */
export function writeServerReport(report: ErrorReport): void {
  console.error(`[alphaa:error] ${JSON.stringify(report)}`)
}

function defaultTransport(report: ErrorReport): void {
  if (typeof window === "undefined") {
    writeServerReport(report)
    return
  }
  const body = JSON.stringify(report)
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob =
        typeof Blob !== "undefined"
          ? new Blob([body], { type: "application/json" })
          : null
      if (blob && navigator.sendBeacon("/api/errors", blob)) return
    }
    void fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Reporting must never break the Customer flow it observes.
    })
  } catch {
    // ignore — reporting is best-effort by design
  }
}

/**
 * Report a client or server failure. Returns the payload sent, or null when
 * inert, invalid, or deduplicated. Never throws, never awaits — safe from
 * render effects and request handlers alike.
 */
export function reportError(
  error: unknown,
  input: ReportContextInput,
  transport: ReportTransport = defaultTransport
): ErrorReport | null {
  if (!isReporterEnabled()) return null
  let report: ErrorReport | null = null
  try {
    report = createReport(error, input)
  } catch {
    return null
  }
  if (!report) return null
  const key = [
    report.kind,
    report.context.flow,
    report.context.bookingReference ?? "",
    report.context.route ?? "",
    report.context.code ?? "",
    report.context.status ?? "",
  ].join(":")
  try {
    if (!shouldSendReport(key)) return null
    transport(report)
  } catch {
    return null
  }
  return report
}
