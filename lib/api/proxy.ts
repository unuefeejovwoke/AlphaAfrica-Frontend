import { getApiBaseUrl } from "./client.ts"

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD", "OPTIONS"])

/** Server-side ceiling for a proxied upstream call (client fires first). */
export const PROXY_TIMEOUT_MS = 35_000

/**
 * Largest proxied request body the server will buffer (1MB). Flight offer
 * blobs and traveller payloads are kilobytes; anything larger is rejected
 * with 413 before an unbounded body is ever buffered or forwarded.
 */
export const MAX_PROXY_BODY_BYTES = 1_000_000

export interface ProxyOptions {
  /**
   * Upstream deadline in ms. The client deadline travels via
   * `request.signal`; this ceiling only guards a client that never aborts.
   */
  timeoutMs?: number
}

/**
 * Same-origin proxy for browser API calls. Forwards method, query, body, and
 * safe headers to the backend and passes the upstream status
 * and body back verbatim, so client-side `ApiError` mapping still works.
 *
 * - Never cached: flight search/price/booking/verify must reflect live data.
 * - Client disconnects abort the upstream fetch via `request.signal`.
 * - Only safe headers travel; no cookies or tokens are stored or logged.
 *   `Authorization` (logged-in order access) and guest `?token=` query params
 *   pass through untouched so the backend can enforce its own 403s.
 */
export async function proxyToBackend(
  request: Request,
  path: string,
  options: ProxyOptions = {}
): Promise<Response> {
  const incoming = new URL(request.url)
  const backendUrl = `${getApiBaseUrl()}${path}${incoming.search}`

  const headers = new Headers()
  const accept = request.headers.get("accept")
  const contentType = request.headers.get("content-type")
  const authorization = request.headers.get("authorization")
  if (accept) headers.set("accept", accept)
  if (contentType) headers.set("content-type", contentType)
  if (authorization) headers.set("authorization", authorization)

  // Forward the client deadline (disconnect/cancellation aborts upstream)
  // alongside a server-side ceiling so a hung backend cannot hold the
  // handler open. Any abort still answers 499.
  const controller = new AbortController()
  const onClientAbort = () => {
    controller.abort(request.signal.reason)
  }
  if (request.signal.aborted) {
    controller.abort(request.signal.reason)
  } else {
    request.signal.addEventListener("abort", onClientAbort, { once: true })
  }
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? PROXY_TIMEOUT_MS
  )

  // Bound the buffered body: a declared length over the cap is rejected
  // before anything is read; a missing or lying length is caught after the
  // read. Either way nothing oversized is forwarded upstream.
  const declaredLength = Number(request.headers.get("content-length") ?? "")
  if (
    !METHODS_WITHOUT_BODY.has(request.method) &&
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_PROXY_BODY_BYTES
  ) {
    clearTimeout(timer)
    request.signal.removeEventListener("abort", onClientAbort)
    return proxyJsonError("The request was too large to process.", 413)
  }

  let upstream: Response
  try {
    const text = METHODS_WITHOUT_BODY.has(request.method)
      ? undefined
      : await request.text()
    if (text !== undefined && text.length > MAX_PROXY_BODY_BYTES) {
      return proxyJsonError("The request was too large to process.", 413)
    }
    upstream = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: text,
      cache: "no-store",
      signal: controller.signal,
    })
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      return new Response(null, { status: 499 })
    }
    return proxyJsonError("The travel service is temporarily unavailable.", 502)
  } finally {
    clearTimeout(timer)
    request.signal.removeEventListener("abort", onClientAbort)
  }

  const responseHeaders = new Headers()
  responseHeaders.set(
    "Content-Type",
    upstream.headers.get("content-type") ?? "application/json"
  )
  responseHeaders.set("Cache-Control", "no-store")
  responseHeaders.set("X-Content-Type-Options", "nosniff")
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

/** JSON error answer carrying the content-type protection header. */
function proxyJsonError(message: string, status: number): Response {
  return Response.json({ message }, {
    status,
    headers: { "X-Content-Type-Options": "nosniff" },
  })
}
