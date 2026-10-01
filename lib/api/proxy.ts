import { getApiBaseUrl } from "./client.ts"

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD", "OPTIONS"])

/** Server-side ceiling for a proxied upstream call (client fires first). */
export const PROXY_TIMEOUT_MS = 35_000

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

  let upstream: Response
  try {
    upstream = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: METHODS_WITHOUT_BODY.has(request.method)
        ? undefined
        : await request.text(),
      cache: "no-store",
      signal: controller.signal,
    })
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      return new Response(null, { status: 499 })
    }
    return Response.json(
      { message: "The travel service is temporarily unavailable." },
      { status: 502 }
    )
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
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
