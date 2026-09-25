import { getApiBaseUrl } from "./client.ts"

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD", "OPTIONS"])

/**
 * Same-origin proxy for browser API calls. Forwards method, query, body, and
 * Accept/Content-Type headers to the backend and passes the upstream status
 * and body back verbatim, so client-side `ApiError` mapping still works.
 *
 * - Never cached: flight search/price/booking/verify must reflect live data.
 * - Client disconnects abort the upstream fetch via `request.signal`.
 * - Only safe headers travel; no cookies or tokens are stored or logged.
 */
export async function proxyToBackend(
  request: Request,
  path: string
): Promise<Response> {
  const incoming = new URL(request.url)
  const backendUrl = `${getApiBaseUrl()}${path}${incoming.search}`

  const headers = new Headers()
  const accept = request.headers.get("accept")
  const contentType = request.headers.get("content-type")
  if (accept) headers.set("accept", accept)
  if (contentType) headers.set("content-type", contentType)

  let upstream: Response
  try {
    upstream = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: METHODS_WITHOUT_BODY.has(request.method)
        ? undefined
        : await request.text(),
      cache: "no-store",
      signal: request.signal,
    })
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      return new Response(null, { status: 499 })
    }
    return Response.json(
      { message: "The travel service is temporarily unavailable." },
      { status: 502 }
    )
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
