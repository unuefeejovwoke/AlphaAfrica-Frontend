import { cookies } from "next/headers"
import { isProduction } from "../env.ts"
import {
  buildRefreshRequest,
  normalizeRefreshResponse,
  resolveAuthSession,
} from "./auth.ts"
import { proxyToBackend } from "./proxy.ts"

/**
 * Server-owned session (auth spec, ticket 03). Tokens live in HttpOnly,
 * Secure, SameSite-Lax cookies set, rotated, and cleared by same-origin
 * handlers only — never in readable storage, URLs, logs, or analytics.
 *
 * Backend calls go through the existing proxy (`./proxy.ts`), never a
 * second fetch stack: server-to-backend requests are forwarded with the
 * same timeout, no-store, and reporting behaviour as every other handler,
 * then read back for cookie rotation. Pure shaping and normalization stay
 * in `./auth.ts`.
 *
 * Server-only: reads `next/headers` cookies. Client code talks to the
 * session through `/api/auth/*` handlers and `session-client.ts`, never
 * this module.
 */

export const ACCESS_COOKIE = "aa_access"
export const REFRESH_COOKIE = "aa_refresh"

/** Short-lived access; the backend stays authoritative on exact lifetime. */
const ACCESS_MAX_AGE = 900
/** Long-lived refresh — presence keeps the Customer signed in across visits. */
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7

function cookieFlags(maxAge: number) {
  return {
    httpOnly: true,
    // Local dev serves over http, where Secure would drop the cookie.
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  }
}

export async function readSessionTokens(): Promise<{
  access: string | null
  refresh: string | null
}> {
  const store = await cookies()
  return {
    access: store.get(ACCESS_COOKIE)?.value ?? null,
    refresh: store.get(REFRESH_COOKIE)?.value ?? null,
  }
}

/** Nav-grade session: signed-in when access is present, refresh path when not. */
export async function getNavSession(): Promise<{ signedIn: boolean }> {
  const { access, refresh } = await readSessionTokens()
  const state = resolveAuthSession({ access, refresh })
  return { signedIn: state.status === "signed-in" }
}

export async function setSessionCookies(input: {
  access: string
  refresh?: string | null
}): Promise<void> {
  const store = await cookies()
  store.set(ACCESS_COOKIE, input.access, cookieFlags(ACCESS_MAX_AGE))
  if (input.refresh) {
    store.set(REFRESH_COOKIE, input.refresh, cookieFlags(REFRESH_MAX_AGE))
  }
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies()
  store.delete(ACCESS_COOKIE)
  store.delete(REFRESH_COOKIE)
}

interface BackendCall {
  status: number
  body: unknown
}

/**
 * Server-to-backend call through the shared proxy. A constructed request
 * carries the method, body, and Bearer — tokens in headers only — and the
 * pass-through response is read back as status plus JSON.
 */
async function backendCall(
  path: string,
  init: { method: string; body?: unknown; access?: string }
): Promise<BackendCall> {
  const headers: Record<string, string> = { accept: "application/json" }
  if (init.body !== undefined) headers["content-type"] = "application/json"
  if (init.access) headers.authorization = `Bearer ${init.access}`
  const forward = new Request("http://localhost/", {
    method: init.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const upstream = await proxyToBackend(forward, path)
  let body: unknown = null
  try {
    body = await upstream.json()
  } catch {
    body = null
  }
  return { status: upstream.status, body }
}

/**
 * One refresh rotation shared by session reads: valid pair rotates the
 * cookies and yields the access token; anything else clears and yields null.
 */
async function rotateSessionRefresh(refresh: string): Promise<string | null> {
  const rotated = await backendCall("/api/auth/token/refresh/", {
    method: "POST",
    body: buildRefreshRequest(refresh),
  })
  const pair = normalizeRefreshResponse(rotated.body)
  if (rotated.status !== 200 || pair.status === "unauthenticated") {
    await clearSessionCookies()
    return null
  }
  await setSessionCookies({ access: pair.access, refresh: pair.refresh })
  return pair.access
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  })
}

/**
 * Session read with single-flight 401 → refresh → retry once, never a loop.
 * A failed or rejected session clears the cookies so a shared device never
 * retains access; the caller answers 401 with a login target.
 */
export async function readSessionUser(): Promise<
  | { status: "signed-in"; user: unknown }
  | { status: "signed-out" }
  | { status: "unavailable" }
> {
  const { access, refresh } = await readSessionTokens()
  const state = resolveAuthSession({ access, refresh })
  if (state.status === "signed-out") return { status: "signed-out" }

  if (state.status === "signed-in") {
    const me = await backendCall("/api/auth/me/", {
      method: "GET",
      access: access ?? undefined,
    })
    if (me.status === 200) return { status: "signed-in", user: me.body }
    // Access rejected but a refresh exists — fall through to refresh once.
    if (me.status !== 401 || !refresh) {
      if (me.status < 500) await clearSessionCookies()
      return me.status >= 500 ? { status: "unavailable" } : { status: "signed-out" }
    }
  }

  // Refresh-then-retry, exactly once.
  if (!refresh) {
    await clearSessionCookies()
    return { status: "signed-out" }
  }
  const nextAccess = await rotateSessionRefresh(refresh)
  if (!nextAccess) return { status: "signed-out" }
  const retry = await backendCall("/api/auth/me/", {
    method: "GET",
    access: nextAccess,
  })
  if (retry.status === 200) return { status: "signed-in", user: retry.body }
  if (retry.status < 500) await clearSessionCookies()
  return retry.status >= 500 ? { status: "unavailable" } : { status: "signed-out" }
}

/**
 * Valid session access token for server-side Bearer reads (order history,
 * single order). Refreshes once when only a refresh cookie remains; null
 * when no session exists. A rejected access with a live refresh rotates
 * first — callers never attach a known-dead token.
 */
export async function readSessionAccessToken(): Promise<string | null> {
  const { access, refresh } = await readSessionTokens()
  const state = resolveAuthSession({ access, refresh })
  if (state.status === "signed-out") return null
  if (state.status === "signed-in") return access
  if (!refresh) return null
  return rotateSessionRefresh(refresh)
}

/**
 * Session-authenticated backend passthrough. The session Bearer attaches
 * server-side from HttpOnly cookies — a browser-supplied Authorization
 * never overrides it — and the upstream answer returns verbatim (status
 * included), so 403s stay plain forbidden. No query travels: the reference
 * rides the path and guest tokens belong on the guest routes, so session
 * and guest credentials never mix on one call. Null when no session
 * exists — the handler answers 401 with a login target instead.
 */
export async function sessionProxiedRequest(
  request: Request,
  backendPath: string,
  init: { method?: string; body?: unknown } = {}
): Promise<Response | null> {
  const access = await readSessionAccessToken()
  if (!access) return null
  const headers: Record<string, string> = {
    accept: "application/json",
    authorization: `Bearer ${access}`,
  }
  if (init.body !== undefined) headers["content-type"] = "application/json"
  const forward = new Request("http://localhost/", {
    method: init.method ?? request.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  return proxyToBackend(forward, backendPath)
}

export { jsonResponse }
