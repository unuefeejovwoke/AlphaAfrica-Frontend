/**
 * Centralized API client for the Alphaa Africa platform (Phase 2).
 *
 * - Base URL comes from the environment via `lib/env.ts`
 *   (`NEXT_PUBLIC_API_BASE_URL`, server-only `API_BASE_URL` override).
 * - Server GET helpers use ISR (`next: { revalidate: 3600 }`) per ADR-0003.
 * - Client POST helpers opt out of caching (`cache: "no-store"`).
 * - All failures throw a typed {@link ApiError}; use
 *   {@link getHumanErrorMessage} to render customer-safe copy (PRD §10, §20).
 *   Never render raw backend errors to customers.
 */

import { apiBaseUrl } from "../env.ts"

export const API_REVALIDATE_SECONDS = 3600

/**
 * Per-operation request deadlines (ticket 05). Every backend read and write
 * carries one: search and streaming wait longest, booking writes less, and
 * verification/detail reads least — a slow upstream fails honestly instead
 * of hanging. Streaming keeps its own long budget
 * (`DOMESTIC_STREAM_TIMEOUT_MS` in `lib/api/domestic.ts`).
 */
export const DEFAULT_READ_TIMEOUT_MS = 15_000
export const WRITE_TIMEOUT_MS = 20_000
export const SEARCH_TIMEOUT_MS = 30_000

const TIMEOUT_MESSAGE =
  "The travel service took too long to respond. No booking was made and no payment was taken."

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/**
 * Prefer backend-flagged entries, falling back to the first results so Home
 * sections never render an empty container while items exist (PRD §12).
 * Shared by destinations and packages to keep featured selection consistent.
 */
export function pickFeatured<T extends { is_featured?: boolean }>(
  results: T[],
  limit = 6
): T[] {
  const flagged = results.filter((item) => item.is_featured)
  const source = flagged.length > 0 ? flagged : results
  return source.slice(0, Math.max(1, limit))
}

export type ApiErrorCode =
  | "network"
  | "timeout"
  | "not-found"
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "rate-limited"
  | "server"
  | "unknown"

export class ApiError extends Error {
  readonly status: number | null
  readonly code: ApiErrorCode
  readonly fieldErrors: Record<string, string[]> | null
  readonly reference: string | null

  constructor(
    message: string,
    options: {
      status?: number | null
      code?: ApiErrorCode
      fieldErrors?: Record<string, string[]> | null
      reference?: string | null
      cause?: unknown
    } = {}
  ) {
    super(message)
    this.name = "ApiError"
    this.status = options.status ?? null
    this.code = options.code ?? "unknown"
    this.fieldErrors = options.fieldErrors ?? null
    this.reference = options.reference ?? null
    if (options.cause !== undefined) {
      ;(this as { cause?: unknown }).cause = options.cause
    }
  }
}

/**
 * Resolve the backend base URL from the environment (see `lib/env.ts`).
 * Kept as the public accessor so existing import sites stay unchanged.
 */
export function getApiBaseUrl(): string {
  return apiBaseUrl()
}

function buildQueryString(
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  if (!query) return ""
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue
    params.append(key, String(value))
  }
  return params.toString()
}

export function buildApiUrl(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  const base = getApiBaseUrl()
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const suffix = buildQueryString(query)
  return suffix.length > 0
    ? `${base}${normalizedPath}?${suffix}`
    : `${base}${normalizedPath}`
}

/**
 * Browser requests for proxied endpoints stay same-origin (relative path) so
 * local and deployed environments behave identically with no CORS. Server
 * calls (RSC/ISR) always use the absolute backend URL.
 */
function buildRequestUrl(
  path: string,
  query:
    Record<string, string | number | boolean | null | undefined> | undefined,
  sameOrigin: boolean | undefined
): string {
  if (!sameOrigin || typeof window === "undefined") {
    return buildApiUrl(path, query)
  }
  // Strip the trailing slash so Next route handlers match without a redirect
  // (POST redirects would still carry the body, but a direct match is cleaner).
  const normalizedPath = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`
  const suffix = buildQueryString(query)
  return suffix.length > 0 ? `${normalizedPath}?${suffix}` : normalizedPath
}

function statusToCode(status: number | null): ApiErrorCode {
  if (status === null) return "network"
  if (status === 404) return "not-found"
  if (status === 400) return "validation"
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 429) return "rate-limited"
  if (status >= 500) return "server"
  return "unknown"
}

function extractFieldErrors(payload: unknown): Record<string, string[]> | null {
  if (typeof payload !== "object" || payload === null) return null
  const record = payload as Record<string, unknown>
  const out: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(record)) {
    if (key === "detail" || key === "message") continue
    if (typeof value === "string") {
      out[key] = [value]
    } else if (
      Array.isArray(value) &&
      value.every((v) => typeof v === "string")
    ) {
      out[key] = value as string[]
    }
  }
  return Object.keys(out).length > 0 ? out : null
}

function extractDetail(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null
  const record = payload as Record<string, unknown>
  const detail = record.detail ?? record.message
  return typeof detail === "string" && detail.length > 0 ? detail : null
}

/** Caller cancellation (AbortError, or a caller-owned TimeoutError). */
function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError" || error.name === "TimeoutError"
  }
  const name = (error as { name?: unknown } | null)?.name
  return name === "AbortError" || name === "TimeoutError"
}

interface Deadline {
  signal: AbortSignal
  /** True only when our own timer fired — never for caller cancellation. */
  timedOut: () => boolean
  cleanup: () => void
}

/**
 * Link a caller signal with our own deadline. The caller's abort propagates
 * untouched (run-guards rely on AbortError); our timer firing marks the
 * deadline so the caller maps it to an honest timeout instead.
 */
function createDeadline(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number
): Deadline {
  const controller = new AbortController()
  let fired = false
  const onCallerAbort = () => {
    controller.abort(callerSignal?.reason)
  }
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort(callerSignal.reason)
    } else {
      callerSignal.addEventListener("abort", onCallerAbort, { once: true })
    }
  }
  const timer = setTimeout(() => {
    fired = true
    controller.abort()
  }, timeoutMs)
  return {
    signal: controller.signal,
    timedOut: () => fired,
    cleanup: () => {
      clearTimeout(timer)
      callerSignal?.removeEventListener("abort", onCallerAbort)
    },
  }
}

async function throwForResponse(
  response: Response,
  path: string
): Promise<never> {
  let payload: unknown = null
  try {
    const text = await response.text()
    payload = text.length > 0 ? (JSON.parse(text) as unknown) : null
  } catch {
    payload = null
  }

  const fieldErrors = extractFieldErrors(payload)
  const detail = extractDetail(payload)
  throw new ApiError(detail ?? `Request to ${path} failed.`, {
    status: response.status,
    code: statusToCode(response.status),
    fieldErrors,
  })
}

export interface ApiGetOptions {
  query?: Record<string, string | number | boolean | null | undefined>
  revalidate?: number
  tags?: string[]
  /**
   * Opt out of the Data Cache entirely (`cache: "no-store"`).
   * Required for verification endpoints (e.g. visa/payment verify):
   * a cached "pending" response must never mask a completed payment.
   */
  noStore?: boolean
  /** AbortSignal for request cancellation — stale responses never commit. */
  signal?: AbortSignal
  /**
   * Per-operation deadline in ms. Defaults to {@link DEFAULT_READ_TIMEOUT_MS};
   * pass {@link SEARCH_TIMEOUT_MS} for search reads.
   */
  timeoutMs?: number
  /**
   * Browser calls go through the same-origin Next proxy route instead of the
   * backend host (no CORS, identical local/production behaviour).
   */
  sameOrigin?: boolean
  /**
   * Logged-in order access: sent as `Authorization: Bearer` to the
   * same-origin proxy, which forwards it to the backend. Never logged,
   * never stored, never placed in URLs.
   */
  authToken?: string
}

/**
 * Server-side GET with ISR caching. Use from React Server Components.
 *
 * Per Context7 Next.js docs, `next: { revalidate }` sets the cache lifetime
 * of the resource in seconds on the server Data Cache.
 */
export async function apiGet<T>(
  path: string,
  options: ApiGetOptions = {}
): Promise<T> {
  const url = buildRequestUrl(path, options.query, options.sameOrigin)
  const headers: Record<string, string> = { Accept: "application/json" }
  if (options.authToken && options.authToken.trim()) {
    headers.Authorization = `Bearer ${options.authToken.trim()}`
  }
  const deadline = createDeadline(
    options.signal,
    options.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS
  )
  let response: Response
  try {
    response = await fetch(
      url,
      options.noStore
        ? {
            method: "GET",
            headers,
            cache: "no-store",
            signal: deadline.signal,
          }
        : {
            method: "GET",
            headers,
            next: {
              revalidate: options.revalidate ?? API_REVALIDATE_SECONDS,
              ...(options.tags ? { tags: options.tags } : {}),
            },
            signal: deadline.signal,
          }
    )
  } catch (error) {
    // A fired deadline surfaces the honest timeout copy; caller cancellation
    // propagates untouched so run-guards can ignore stale responses — never
    // converted into a retryable network failure.
    if (deadline.timedOut()) {
      throw new ApiError(TIMEOUT_MESSAGE, {
        status: null,
        code: "timeout",
        cause: error,
      })
    }
    if (isAbortError(error)) {
      throw error
    }
    throw new ApiError("Network request failed.", {
      status: null,
      code: "network",
      cause: error,
    })
  } finally {
    deadline.cleanup()
  }

  if (!response.ok) {
    await throwForResponse(response, path)
  }

  try {
    return (await response.json()) as T
  } catch (error) {
    throw new ApiError("Invalid response from the travel service.", {
      status: response.status,
      code: "server",
      cause: error,
    })
  }
}

export interface ApiPostOptions {
  query?: Record<string, string | number | boolean | null | undefined>
  /** AbortSignal for request cancellation — stale responses never commit. */
  signal?: AbortSignal
  /**
   * Per-operation deadline in ms. Defaults to {@link WRITE_TIMEOUT_MS};
   * pass {@link SEARCH_TIMEOUT_MS} for search writes.
   */
  timeoutMs?: number
  /**
   * Browser calls go through the same-origin Next proxy route instead of the
   * backend host (no CORS, identical local/production behaviour).
   */
  sameOrigin?: boolean
}

/**
 * Client-side POST for mutations (Enquiry, Visa Consultation).
 * Never cached: always `cache: "no-store"`.
 */
export async function apiPost<
  TResponse,
  TBody extends Record<string, unknown> | unknown,
>(path: string, body: TBody, options: ApiPostOptions = {}): Promise<TResponse> {
  const url = buildRequestUrl(path, options.query, options.sameOrigin)
  const deadline = createDeadline(
    options.signal,
    options.timeoutMs ?? WRITE_TIMEOUT_MS
  )
  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(body ?? {}),
      signal: deadline.signal,
    })
  } catch (error) {
    if (deadline.timedOut()) {
      throw new ApiError(TIMEOUT_MESSAGE, {
        status: null,
        code: "timeout",
        cause: error,
      })
    }
    if (isAbortError(error)) {
      throw error
    }
    throw new ApiError("Network request failed.", {
      status: null,
      code: "network",
      cause: error,
    })
  } finally {
    deadline.cleanup()
  }

  if (!response.ok) {
    await throwForResponse(response, path)
  }

  // Some mutation endpoints return 201 with an empty body.
  const text = await response.text()
  if (text.length === 0) {
    return {} as TResponse
  }
  try {
    return JSON.parse(text) as TResponse
  } catch (error) {
    throw new ApiError("Invalid response from the travel service.", {
      status: response.status,
      code: "server",
      cause: error,
    })
  }
}

/**
 * Map any thrown value to customer-safe copy (PRD §20).
 * Never surfaces raw backend payloads, field dumps, or stack traces.
 */
export function getHumanErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "network":
        return "We could not reach the travel service. Check your connection and try again, or speak with Alphaa for help."
      case "timeout":
        return "The travel service took too long to respond. No booking was made and no payment was taken. Please try again."
      case "not-found":
        return "We could not find what you were looking for. It may have been removed. Try another option or speak with Alphaa."
      case "validation":
        return "Some details need attention before we can continue. Review the highlighted fields and try again."
      case "unauthorized":
      case "forbidden":
        return "This action needs a signed-in session. Please log in and try again."
      case "rate-limited":
        return "Too many recent attempts. Wait a moment and try again."
      case "server":
        return "The travel service is temporarily unavailable. Please try again shortly or speak with Alphaa."
      default:
        return "Something did not complete on our side. Please try again or speak with Alphaa for help."
    }
  }
  if (error instanceof Error && /abort|timeout/i.test(error.message)) {
    return "The travel service took too long to respond. No booking was made and no payment was taken. Please try again."
  }
  return "Something did not complete on our side. Please try again or speak with Alphaa for help."
}

/**
 * Customer-safe payment/booking failure reassurance (PRD §20).
 * Callers should render this alongside {@link getHumanErrorMessage}.
 */
export function getPaymentSafetyCopy(): string {
  return "If a payment was deducted, our team can locate and reconcile it. Keep your reference and contact Alphaa support."
}
