import { getApiBaseUrl } from "@/lib/api/client"
import { parseDomesticParams, toDomesticQuery } from "@/lib/api/domestic"

/**
 * Domestic SSE proxy — Phase 3, ticket 03 (ADR-0004).
 *
 * Pipes the backend `GET /api/flights/local-search-stream/` event stream
 * verbatim to the client:
 * - `force-dynamic` + `cache: no-store` so the stream is never ISR-cached
 *   (buffering would break SSE — Context7: non-ISR routes stream directly).
 * - No mutable module state (vercel: server-no-shared-module-state).
 * - Client disconnects abort the upstream fetch via `request.signal`.
 */

export const dynamic = "force-dynamic"
// Duration budget: 90s covers the 75s client stream wait plus a 15s margin
// (see DOMESTIC_STREAM_MAX_DURATION_SECONDS in lib/guardrails.ts — kept as
// a literal here because route segment config must be statically analyzable).
export const maxDuration = 90

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const adultsRaw = Number(url.searchParams.get("adults") ?? "1")
  const childrenRaw = Number(url.searchParams.get("children") ?? "0")
  const infantsRaw = Number(url.searchParams.get("infants") ?? "0")

  const params = parseDomesticParams({
    origin: url.searchParams.get("origin") ?? "",
    destination: url.searchParams.get("destination") ?? "",
    date: url.searchParams.get("date") ?? "",
    adults: Number.isFinite(adultsRaw) ? adultsRaw : 1,
    children: Number.isFinite(childrenRaw) ? childrenRaw : 0,
    infants: Number.isFinite(infantsRaw) ? infantsRaw : 0,
    return_date: url.searchParams.get("return_date"),
  })

  if (!params) {
    return Response.json(
      {
        message:
          "Select a valid origin, destination, and date to search domestic flights.",
      },
      { status: 400 }
    )
  }

  // Query holds only safe primitives (IATA, date, party counts) — never
  // tokens, passports, payment data, or opaque blobs (spec §59).
  const backendUrl = `${getApiBaseUrl()}/api/flights/local-search-stream/?${new URLSearchParams(
    toDomesticQuery(params)
  ).toString()}`

  let upstream: Response
  try {
    upstream = await fetch(backendUrl, {
      method: "GET",
      // The backend negotiates this header and rejects a bare
      // `text/event-stream` with 406, which would fail every stream and send
      // the client into the blocking fallback. Offering the JSON error
      // payload alongside the stream satisfies the negotiation while still
      // preferring the event stream.
      headers: { Accept: "text/event-stream, application/json" },
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

  if (!upstream.ok || !upstream.body) {
    const status =
      upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502
    return Response.json(
      { message: "The travel service is temporarily unavailable." },
      { status }
    )
  }

  // Pipe verbatim — no buffering, no transformation (Context7 SSE pattern).
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
