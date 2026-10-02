import test from "node:test"
import assert from "node:assert/strict"
import {
  DOMESTIC_SEARCH_MAX_DURATION_SECONDS,
  DOMESTIC_STREAM_MAX_DURATION_SECONDS,
  FLIGHT_SEARCH_MAX_DURATION_SECONDS,
  imageRemotePatterns,
  securityHeaders,
} from "../lib/guardrails.ts"
import { isLoopbackUrl, resolveBaseUrl } from "../lib/env.ts"
import { MAX_PROXY_BODY_BYTES, proxyToBackend } from "../lib/api/proxy.ts"
import { DOMESTIC_STREAM_TIMEOUT_MS } from "../lib/api/domestic.ts"
import { SEARCH_TIMEOUT_MS } from "../lib/api/client.ts"

// ---------------------------------------------------------------------------
// Ticket 08 — production guardrails. Every guard is asserted at its seam in
// both directions: the trigger case and the non-trigger case.
// ---------------------------------------------------------------------------

test("Guardrails: site-wide headers block token leaks via Referer plus transport, content-type, and framing", () => {
  const headers = securityHeaders()
  const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]))
  assert.equal(
    byKey["Referrer-Policy"],
    "strict-origin-when-cross-origin",
    "Emailed order tokens in query params must never leak cross-origin"
  )
  assert.match(byKey["Strict-Transport-Security"], /max-age=\d+/)
  assert.equal(byKey["X-Content-Type-Options"], "nosniff")
  assert.equal(byKey["X-Frame-Options"], "SAMEORIGIN")
  for (const { value } of headers) {
    assert.doesNotMatch(
      value,
      /^(unsafe-url|no-referrer-when-downgrade|origin-when-cross-origin)$/,
      "No policy may send the full URL cross-origin"
    )
  }
})

test("Guardrails: loopback image hosts work in development only", () => {
  const prod = imageRemotePatterns(true)
  assert.ok(
    prod.some((p) => p.hostname === "api.alphaaafrica.com"),
    "Production keeps the backend media host"
  )
  assert.ok(
    prod.some((p) => p.hostname === "images.unsplash.com"),
    "Production keeps the legacy backend image host while records reference it"
  )
  for (const host of ["localhost", "127.0.0.1"]) {
    assert.equal(
      prod.some((p) => p.hostname === host),
      false,
      `Production must never optimise ${host} imagery`
    )
  }
  const dev = imageRemotePatterns(false)
  assert.equal(
    dev.some((p) => p.hostname === "localhost" && p.protocol === "http"),
    true,
    "Development keeps local image optimisation working"
  )
})

test("Guardrails: loopback detection names every local host shape", () => {
  for (const local of [
    "http://localhost:3000",
    "http://127.0.0.1:8000/api/",
    "http://127.1.2.3/",
    "http://[::1]:3000/",
    "http://0.0.0.0:3000/",
  ]) {
    assert.equal(isLoopbackUrl(local), true, `${local} is loopback`)
  }
  for (const remote of [
    "https://www.alphaaafrica.com",
    "https://api.alphaaafrica.com",
    "http://localhost.evil.test/",
  ]) {
    assert.equal(isLoopbackUrl(remote), false, `${remote} is not loopback`)
  }
  assert.equal(isLoopbackUrl("not-a-url"), false)
})

const RUNTIME_KEYS = ["NODE_ENV", "NEXT_PHASE"] as const

type RuntimeKey = (typeof RUNTIME_KEYS)[number]

function snapshotRuntime(): Record<RuntimeKey, string | undefined> {
  const env = process.env as Record<string, string | undefined>
  return {
    NODE_ENV: env.NODE_ENV,
    NEXT_PHASE: env.NEXT_PHASE,
  }
}

function restoreRuntime(
  snapshot: Record<RuntimeKey, string | undefined>
): void {
  const env = process.env as Record<string, string | undefined>
  for (const key of RUNTIME_KEYS) {
    const value = snapshot[key]
    if (value === undefined) delete env[key]
    else env[key] = value
  }
}

function withRuntime(
  overrides: Partial<Record<RuntimeKey, string>>,
  run: () => void
): void {
  const env = process.env as Record<string, string | undefined>
  const snapshot = snapshotRuntime()
  try {
    delete env.NODE_ENV
    delete env.NEXT_PHASE
    Object.assign(env, overrides)
    run()
  } finally {
    restoreRuntime(snapshot)
  }
}

test("Guardrails: production runtime fails loudly on malformed or loopback URLs", () => {
  withRuntime({ NODE_ENV: "production" }, () => {
    assert.throws(
      () => resolveBaseUrl("site URL", "https://fallback.test", "not-a-url"),
      /refusing to serve production traffic/,
      "Malformed production URLs must throw, never silently fall back"
    )
    assert.throws(
      () =>
        resolveBaseUrl(
          "site URL",
          "https://fallback.test",
          "http://localhost:3000"
        ),
      /loopback/,
      "Loopback production URLs must throw, never silently fall back"
    )
    assert.throws(
      () =>
        resolveBaseUrl(
          "API base URL",
          "https://fallback.test",
          "http://127.0.0.1:8000"
        ),
      /loopback/,
      "Loopback backend URLs must throw too"
    )
  })
})

test("Guardrails: valid, unset, and build-phase URLs never throw", () => {
  withRuntime({ NODE_ENV: "production" }, () => {
    assert.equal(
      resolveBaseUrl(
        "site URL",
        "https://fallback.test",
        "https://www.alphaaafrica.com/"
      ),
      "https://www.alphaaafrica.com"
    )
    assert.equal(
      resolveBaseUrl("site URL", "https://fallback.test"),
      "https://fallback.test",
      "Unset values still fall back — only explicit misconfiguration throws"
    )
  })
  withRuntime(
    { NODE_ENV: "production", NEXT_PHASE: "phase-production-build" },
    () => {
      const errors: unknown[][] = []
      const originalError = console.error
      console.error = (...args: unknown[]) => {
        errors.push(args)
      }
      try {
        assert.equal(
          resolveBaseUrl(
            "site URL",
            "https://fallback.test",
            "http://localhost:3000"
          ),
          "https://fallback.test",
          "Builds fall back so local production-mode builds stay green"
        )
      } finally {
        console.error = originalError
      }
      assert.equal(errors.length, 1, "Build-phase fallback is loudly reported")
      assert.match(String(errors[0]?.[0]), /loopback/)
    }
  )
  withRuntime({}, () => {
    assert.equal(
      resolveBaseUrl(
        "site URL",
        "https://fallback.test",
        "http://localhost:3000/"
      ),
      "http://localhost:3000",
      "Development keeps loopback working without warnings-as-errors"
    )
  })
})

test("Guardrails: proxy rejects oversized bodies before touching upstream", async () => {
  const calls: unknown[] = []
  const originalFetch = globalThis.fetch
  ;(globalThis as { fetch?: unknown }).fetch = async (...args: unknown[]) => {
    calls.push(args)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
  try {
    const oversized = new Request("http://localhost/api/flights/search/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: `{"pad":"${"x".repeat(MAX_PROXY_BODY_BYTES)}"}`,
    })
    const rejected = await proxyToBackend(oversized, "/api/flights/search/")
    assert.equal(rejected.status, 413)
    assert.equal(calls.length, 0, "Oversized bodies never reach the backend")

    const small = new Request("http://localhost/api/flights/search/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ origin: "LOS" }),
    })
    const passed = await proxyToBackend(small, "/api/flights/search/")
    assert.equal(passed.status, 200)
    assert.equal(calls.length, 1, "Normal bodies still proxy through")
    assert.equal(
      passed.headers.get("X-Content-Type-Options"),
      "nosniff",
      "Proxy responses carry content-type protection"
    )
  } finally {
    ;(globalThis as { fetch?: unknown }).fetch = originalFetch
  }
})

test("Guardrails: proxy error answers carry content-type protection", async () => {
  const originalFetch = globalThis.fetch
  ;(globalThis as { fetch?: unknown }).fetch = async () => {
    throw new Error("backend down")
  }
  try {
    const request = new Request("http://localhost/api/flights/search/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ origin: "LOS" }),
    })
    const response = await proxyToBackend(request, "/api/flights/search/")
    assert.equal(response.status, 502)
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff")
  } finally {
    ;(globalThis as { fetch?: unknown }).fetch = originalFetch
  }
})

test("Guardrails: handler budgets cover their own client waits plus a margin", () => {
  assert.ok(
    DOMESTIC_STREAM_MAX_DURATION_SECONDS * 1000 > DOMESTIC_STREAM_TIMEOUT_MS,
    "The SSE stream must outlive the 75s client stream wait"
  )
  for (const budget of [
    FLIGHT_SEARCH_MAX_DURATION_SECONDS,
    DOMESTIC_SEARCH_MAX_DURATION_SECONDS,
    DOMESTIC_STREAM_MAX_DURATION_SECONDS,
  ]) {
    assert.ok(
      Number.isInteger(budget) && budget > 0 && budget <= 300,
      `Budget ${budget}s must be a positive platform-legal maxDuration`
    )
  }
  assert.ok(
    FLIGHT_SEARCH_MAX_DURATION_SECONDS * 1000 > SEARCH_TIMEOUT_MS &&
      DOMESTIC_SEARCH_MAX_DURATION_SECONDS * 1000 > SEARCH_TIMEOUT_MS,
    "Search handlers cover the client search deadline with margin"
  )
})
