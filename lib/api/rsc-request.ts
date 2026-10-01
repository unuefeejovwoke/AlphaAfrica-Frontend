import { headers } from "next/headers"

/**
 * Whether this render is an RSC payload request for a client-side
 * navigation rather than the HTML document. Server-only: reads request
 * headers via `next/headers`, so it must never be imported by client code.
 *
 * Next's client router marks every RSC request (navigation, prefetch,
 * refresh) with `RSC: 1`; document requests — first visit, refresh, shared
 * link, crawler — never carry it. Verified against the installed framework
 * (`node_modules/next/dist/client/components/router-reducer/fetch-server-response.js`).
 *
 * Ticket 21 uses this to fetch the Hotel and Vehicle listings' first page
 * exactly once: the server fetches for documents (so the HTML carries
 * inventory), and the client search engine fetches for navigations —
 * neither duplicates the other.
 */
export async function isRscNavigationRequest(): Promise<boolean> {
  return (await headers()).get("RSC") === "1"
}
