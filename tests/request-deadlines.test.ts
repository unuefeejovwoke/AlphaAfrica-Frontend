import test from "node:test"
import assert from "node:assert/strict"

// Ticket 05 — every backend call has a deadline and an honest timeout.
//
// Exercised at the backend boundary seam (the API client + same-origin
// proxy) against a stubbed fetch: deadlines fire, caller cancellation still
// propagates as cancellation, and an aborted upstream still answers 499.

import {
  ApiError,
  apiGet,
  apiPost,
  DEFAULT_READ_TIMEOUT_MS,
  getHumanErrorMessage,
  SEARCH_TIMEOUT_MS,
  WRITE_TIMEOUT_MS,
} from "../lib/api/client.ts"
import { DOMESTIC_STREAM_TIMEOUT_MS } from "../lib/api/domestic.ts"
import { proxyToBackend } from "../lib/api/proxy.ts"
import { searchAirports } from "../lib/api/flights.ts"

function stubFetch(
  t: { after: (fn: () => void) => void },
  impl: (url: unknown, init?: RequestInit) => Promise<Response>
): void {
  const original = globalThis.fetch
  globalThis.fetch = impl as typeof fetch
  t.after(() => {
    globalThis.fetch = original
  })
}

/** Never resolves on its own; rejects AbortError when the signal fires. */
function hangingFetch(
  _url: unknown,
  init?: RequestInit
): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener(
      "abort",
      () => {
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true }
    )
  })
}

function okFetch(body: unknown): Promise<Response> {
  return Promise.resolve(
    Response.json(body, {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  )
}

test("A fired read deadline surfaces the honest timeout copy", async (t) => {
  stubFetch(t, hangingFetch)
  const error = await apiGet("/api/hotels/", { timeoutMs: 20 }).catch(
    (e: unknown) => e
  )
  assert.ok(error instanceof ApiError, "deadline must throw ApiError")
  assert.equal(error.code, "timeout", "timeout classification must be reachable")
  assert.match(
    getHumanErrorMessage(error),
    /No booking was made and no payment was taken/,
    "timeout must surface the honest copy, not a generic network error"
  )
})

test("A fired write deadline is a timeout, not a network failure", async (t) => {
  stubFetch(t, hangingFetch)
  const error = await apiPost("/api/flights/search/", {}, { timeoutMs: 20 }).catch(
    (e: unknown) => e
  )
  assert.ok(error instanceof ApiError)
  assert.equal(error.code, "timeout")
})

test("Caller cancellation propagates as cancellation, never a retryable failure", async (t) => {
  stubFetch(t, hangingFetch)
  const controller = new AbortController()
  const pending = apiGet("/api/hotels/", {
    signal: controller.signal,
    timeoutMs: 5_000,
  })
  controller.abort()
  const error = await pending.catch((e: unknown) => e)
  assert.ok(
    !(error instanceof ApiError),
    "cancellation must not convert into ApiError"
  )
  assert.equal(
    (error as Error).name,
    "AbortError",
    "caller abort must propagate as AbortError for run-guards"
  )
})

test("Pre-aborted callers fail fast without touching the network", async (t) => {
  let calls = 0
  stubFetch(t, () => {
    calls += 1
    return okFetch([])
  })
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(
    searchAirports("LOS", { signal: controller.signal }),
    (e: unknown) => (e as Error).name === "AbortError"
  )
  assert.equal(calls, 0, "stale requests must never commit a fetch")
})

test("Every call carries a deadline even when the caller passes none", async (t) => {
  let seenSignal: AbortSignal | null = null
  stubFetch(t, (_url, init) => {
    seenSignal = init?.signal ?? null
    return okFetch([])
  })
  await apiGet("/api/hotels/")
  const signal: unknown = seenSignal
  assert.ok(signal instanceof AbortSignal, "reads must always send a signal")
  assert.equal(signal.aborted, false)
})

test("Deadlines are sized per operation: search outlasts booking and verification reads", () => {
  assert.ok(
    SEARCH_TIMEOUT_MS > WRITE_TIMEOUT_MS,
    "search must outlast booking writes"
  )
  assert.ok(
    WRITE_TIMEOUT_MS > DEFAULT_READ_TIMEOUT_MS,
    "booking writes must outlast verification reads"
  )
  assert.ok(
    DOMESTIC_STREAM_TIMEOUT_MS > SEARCH_TIMEOUT_MS,
    "streaming keeps the longest budget"
  )
})

test("Proxy forwards the deadline upstream; an aborted upstream still answers 499", async (t) => {
  stubFetch(t, hangingFetch)
  const response = await proxyToBackend(
    new Request("http://localhost/api/flights/search/", { method: "GET" }),
    "/api/flights/search/",
    { timeoutMs: 20 }
  )
  assert.equal(response.status, 499)
})

test("Proxy passes live upstream responses through with their status", async (t) => {
  stubFetch(t, (_url, init) => {
    assert.ok(init?.signal instanceof AbortSignal, "upstream needs the signal")
    return okFetch({ results: [] })
  })
  const response = await proxyToBackend(
    new Request("http://localhost/api/flights/search/", { method: "GET" }),
    "/api/flights/search/"
  )
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("Cache-Control"), "no-store")
})
