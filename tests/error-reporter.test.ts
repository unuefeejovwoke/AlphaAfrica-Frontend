import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

// Ticket 10 — one error reporter and a health probe.
//
// Behaviour is asserted at the reporter seam (sanitize, dedup, inertness,
// health status) with injected transports and a stubbed fetch. Route wiring
// (ingress re-sanitizes, probe never fetches) is asserted against the route
// modules themselves — `@/` aliases do not resolve under the zero-dependency
// runner, so routes stay thin and all decisions live in `lib/`.

import { ApiError } from "../lib/api/client.ts"
import { sanitizeProps } from "../lib/analytics.ts"
import {
  __resetReportDedup,
  createReport,
  extractBookingReference,
  isReporterEnabled,
  reportError,
  sanitizeReportContext,
  shouldSendReport,
  type ErrorReport,
} from "../lib/error-reporter.ts"
import { envConfigStatus } from "../lib/env.ts"
import { getHealthStatus } from "../lib/health.ts"
import { proxyToBackend } from "../lib/api/proxy.ts"

const ROOT = path.resolve(import.meta.dirname, "..")

function withEnv(
  t: { after: (fn: () => void) => void },
  vars: Record<string, string | undefined>
): void {
  const saved: Record<string, string | undefined> = {}
  for (const key of Object.keys(vars)) saved[key] = process.env[key]
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
}

function enableReporter(t: Parameters<typeof withEnv>[0]): void {
  withEnv(t, { NEXT_PUBLIC_ERROR_REPORTER_ID: "test-reporter" })
  __resetReportDedup()
  t.after(() => __resetReportDedup())
}

test("Reporter is inert when its identifier is blank", (t) => {
  withEnv(t, { NEXT_PUBLIC_ERROR_REPORTER_ID: "" })
  __resetReportDedup()
  t.after(() => __resetReportDedup())
  assert.equal(isReporterEnabled(), false)
  let calls = 0
  const sent = reportError(new Error("boom"), { flow: "booking" }, () => {
    calls += 1
  })
  assert.equal(sent, null)
  assert.equal(calls, 0, "local and preview runs stay silent")
})

test("Client and server failures reach one reporter, tagged with flow", (t) => {
  enableReporter(t)
  const sent: ErrorReport[] = []
  const failure = new ApiError("backend exploded", {
    code: "server",
    status: 500,
  })
  const report = reportError(
    failure,
    { flow: "booking", bookingReference: "ABC-123" },
    (r) => sent.push(r)
  )
  assert.ok(report, "enabled reporter sends")
  assert.equal(report?.context.flow, "booking")
  assert.equal(report?.context.bookingReference, "ABC-123")
  assert.equal(report?.kind, "ApiError:server:500")
  assert.equal(sent.length, 1)
})

test("Reports never contain passport data, contact details, tokens, or the fare blob", (t) => {
  enableReporter(t)
  const hostile = {
    flow: "booking",
    bookingReference: "ABC-123",
    passport_number: "A12345678",
    contact_email: "adaeze@example.com",
    contact_phone: "+2348031234567",
    auth_token: "Bearer secret",
    flight_offer: { id: "blob", price: "1" },
    opaque_blob: "...",
  }
  const report = createReport(
    new Error("card 4111 declined for adaeze@example.com"),
    hostile
  )
  assert.ok(report)
  const serialized = JSON.stringify(report)
  for (const leak of [
    "A12345678",
    "adaeze@example.com",
    "+2348031234567",
    "secret",
    "blob",
    "4111",
    "passport",
    "token",
  ]) {
    assert.ok(!serialized.includes(leak), `must not leak: ${leak}`)
  }
  assert.equal(report?.context.flow, "booking")
  assert.equal(report?.context.bookingReference, "ABC-123")
})

test("The analytics sanitisation seam drops the same hostile keys", () => {
  const clean = sanitizeProps({
    flow: "booking",
    passport_number: "A12345678",
    contact_email: "adaeze@example.com",
    auth_token: "secret",
    flight_offer: "blob",
    reference: "ABC-123",
  })
  for (const key of Object.keys(clean)) {
    assert.doesNotMatch(
      key,
      /passport|payment|card|token|email|phone|auth|reference|order|flight_offer|opaque|blob/i,
      `analytics seam must strip: ${key}`
    )
  }
  const report = sanitizeReportContext({
    flow: "booking",
    bookingReference: "ABC-123",
    passport_number: "A12345678",
  })
  assert.deepEqual(report, { flow: "booking", bookingReference: "ABC-123" })
})

test("An unsafe booking reference is dropped but the report still sends", (t) => {
  enableReporter(t)
  const report = createReport(new Error("x"), {
    flow: "booking",
    bookingReference: "not a ref!!",
  })
  assert.ok(report)
  assert.equal(report?.context.bookingReference, undefined)
  assert.equal(createReport(new Error("x"), {}), null, "flow is required")
})

test("Repeated identical failures are deduplicated, bursts sampled", (t) => {
  enableReporter(t)
  const sent: ErrorReport[] = []
  const transport = (r: ErrorReport) => sent.push(r)
  const failure = new Error("same upstream breakage")
  assert.ok(reportError(failure, { flow: "proxy" }, transport))
  assert.equal(
    reportError(failure, { flow: "proxy" }, transport),
    null,
    "identical repeat within the window is suppressed"
  )
  assert.equal(sent.length, 1)
  for (let i = 0; i < 30; i++) {
    shouldSendReport(`distinct-${i}`)
  }
  assert.equal(
    shouldSendReport("one-too-many"),
    false,
    "bursts past the per-minute cap are sampled out"
  )
})

test("Booking references come only from verify/order path segments", () => {
  assert.equal(
    extractBookingReference("/api/flights/bookings/verify/ABC-123/"),
    "ABC-123"
  )
  assert.equal(
    extractBookingReference("/api/payments/order/XYZ789"),
    "XYZ789"
  )
  assert.equal(extractBookingReference("/api/flights/search/"), undefined)
  assert.equal(extractBookingReference("/api/visa/apply/"), undefined)
  assert.equal(extractBookingReference("/api/order/../secret"), undefined)
})

test("Health probe answers without touching the backend", async (t) => {
  const original = globalThis.fetch
  globalThis.fetch = (() => {
    throw new Error("health probe must never fetch")
  }) as typeof fetch
  t.after(() => {
    globalThis.fetch = original
  })
  const status = getHealthStatus()
  assert.equal(status.checks.app, "ok")
  assert.ok(status.timestamp.length > 0)
  assert.ok(["ok", "degraded"].includes(status.status))
})

test("Health probe reports configuration validity separately from liveness", (t) => {
  withEnv(t, {
    NEXT_PUBLIC_API_BASE_URL: "https://api.alphaaafrica.com",
    API_BASE_URL: "",
    NEXT_PUBLIC_SITE_URL: "https://www.alphaaafrica.com",
    SITE_URL: "",
  })
  assert.deepEqual(envConfigStatus(), {
    apiBaseUrl: "configured",
    siteUrl: "configured",
  })
  assert.equal(getHealthStatus().status, "ok")
})

test("Error ingress and probe routes stay thin and safe", () => {  const errors = fs.readFileSync(
    path.join(ROOT, "app/api/errors/route.ts"),
    "utf8"
  )
  assert.match(errors, /sanitizeReportContext/, "ingress re-sanitizes")
  assert.match(errors, /writeServerReport/, "ingress becomes the record")
  assert.ok(!errors.includes("console.log"), "no casual logging")
  const health = fs.readFileSync(
    path.join(ROOT, "app/api/health/route.ts"),
    "utf8"
  )
  assert.match(health, /getHealthStatus/, "probe delegates to the seam")
  assert.ok(!health.includes("fetch("), "probe never touches the backend")
  const boundary = fs.readFileSync(
    path.join(ROOT, "components/feedback/route-error.tsx"),
    "utf8"
  )
  assert.match(boundary, /reportError\(error/, "client failures reach the reporter")
  const global = fs.readFileSync(path.join(ROOT, "app/global-error.tsx"), "utf8")
  assert.match(global, /reportError\(error/, "failures outside groups report too")
  const proxy = fs.readFileSync(path.join(ROOT, "lib/api/proxy.ts"), "utf8")
  assert.match(proxy, /reportError\(error/, "server failures reach the reporter")
  assert.match(proxy, /extractBookingReference/, "server tags the reference")
})

test("Distinct failures sharing kind and flow do not over-suppress", (t) => {
  enableReporter(t)
  const sent: ErrorReport[] = []
  const transport = (r: ErrorReport) => sent.push(r)
  const failure = new Error("upstream breakage")
  assert.ok(reportError(failure, { flow: "proxy", route: "/a/" }, transport))
  assert.ok(
    reportError(failure, { flow: "proxy", route: "/b/" }, transport),
    "different routes are different failures"
  )
  assert.equal(sent.length, 2)
})

test("A passed-through backend failure still reaches the reporter", async (t) => {
  enableReporter(t)
  withEnv(t, { NEXT_PUBLIC_API_BASE_URL: "https://backend.test" })
  const originalFetch = globalThis.fetch
  globalThis.fetch = (() =>
    Promise.resolve(
      Response.json({ message: "backend exploded" }, { status: 502 })
    )) as typeof fetch
  const lines: string[] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "))
  }
  t.after(() => {
    globalThis.fetch = originalFetch
    console.error = originalError
  })
  const response = await proxyToBackend(
    new Request("http://localhost/api/flights/search/", { method: "GET" }),
    "/api/flights/search/"
  )
  assert.equal(response.status, 502, "upstream status still passes through")
  assert.ok(
    lines.some((line) => line.includes("[alphaa:error]")),
    "the 502 must leave a reporter trace"
  )
})
