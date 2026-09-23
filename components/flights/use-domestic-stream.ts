"use client"

import * as React from "react"
import {
  DOMESTIC_SSE_DONE_EVENT,
  DOMESTIC_STREAM_PROXY_PATH,
  DOMESTIC_STREAM_TIMEOUT_MS,
  fetchDomesticBlocking,
  parseSseEventBlock,
  toDomesticQuery,
  type DomesticFlightCard,
  type DomesticSearchParams,
  type SseTerminalReason,
  shouldFallbackToBlocking,
} from "@/lib/api/domestic"
import { ApiError } from "@/lib/api/client"

export interface DomesticStreamState {
  cards: DomesticFlightCard[]
  isStreaming: boolean
  isFallingBack: boolean
  isComplete: boolean
  didFallback: boolean
  searchId: string | null
  error: unknown | null
}

/**
 * Progressive domestic stream — fetch + reader + AbortController (ADR-0004).
 *
 * - New `start` calls and unmount abort the prior stream; stale chunks never
 *   commit state (run-id + mounted guards).
 * - Terminal `done` event captures `search_id` for support references.
 * - Stream error/timeout automatically falls back to blocking local-search.
 * - Card appends ride `startTransition` (vercel: rendering-usetransition-loading)
 *   so typing stays responsive while results reconcile.
 */
export function useDomesticStream() {
  const [state, setState] = React.useState<DomesticStreamState>({
    cards: [],
    isStreaming: false,
    isFallingBack: false,
    isComplete: false,
    didFallback: false,
    searchId: null,
    error: null,
  })

  const abortRef = React.useRef<AbortController | null>(null)
  const runIdRef = React.useRef(0)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      runIdRef.current += 1
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [])

  const abort = React.useCallback(() => {
    runIdRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const start = React.useCallback(async (params: DomesticSearchParams) => {
    // Abort any prior stream before starting — no leaked updates.
    abortRef.current?.abort()
    const runId = runIdRef.current + 1
    runIdRef.current = runId
    const controller = new AbortController()
    abortRef.current = controller

    setState({
      cards: [],
      isStreaming: true,
      isFallingBack: false,
      isComplete: false,
      didFallback: false,
      searchId: null,
      error: null,
    })

    const fail = (error: unknown) => {
      if (!mountedRef.current || runId !== runIdRef.current) return
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        isFallingBack: false,
        isComplete: prev.cards.length > 0,
        error,
      }))
    }

    const runBlockingFallback = async () => {
      if (!mountedRef.current || runId !== runIdRef.current) return
      setState((prev) => ({ ...prev, isFallingBack: true }))
      const fallbackController = new AbortController()
      abortRef.current = fallbackController
      try {
        const cards = await fetchDomesticBlocking(params)
        if (!mountedRef.current || runId !== runIdRef.current) return
        if (fallbackController.signal.aborted) return
        setState((prev) => ({
          ...prev,
          cards,
          isStreaming: false,
          isFallingBack: false,
          isComplete: true,
          didFallback: true,
          error: cards.length === 0 ? prev.error : null,
        }))
      } catch (fallbackError) {
        if (!mountedRef.current || runId !== runIdRef.current) return
        fail(
          fallbackError instanceof ApiError
            ? fallbackError
            : new ApiError("The travel service is temporarily unavailable.", {
                code: "server",
                status: null,
              })
        )
      }
    }

    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, DOMESTIC_STREAM_TIMEOUT_MS)

    try {
      const query = new URLSearchParams(toDomesticQuery(params)).toString()
      const response = await fetch(`${DOMESTIC_STREAM_PROXY_PATH}?${query}`, {
        headers: { Accept: "text/event-stream" },
        cache: "no-store",
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        throw new ApiError("The travel service is temporarily unavailable.", {
          code: "server",
          status: response.status ?? null,
        })
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let doneSeen = false
      let doneSearchId: string | null = null

      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let boundary = buffer.indexOf("\n\n")
          while (boundary >= 0) {
            const block = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            const parsed = parseSseEventBlock(block)
            if (parsed) {
              if (parsed.event === DOMESTIC_SSE_DONE_EVENT) {
                doneSeen = true
                doneSearchId =
                  parsed.searchId ??
                  (typeof parsed.data === "string" && parsed.data.trim()
                    ? parsed.data.trim()
                    : null)
              } else if (
                typeof parsed.data === "object" &&
                parsed.data !== null
              ) {
                const card = parsed.data as DomesticFlightCard
                if (mountedRef.current && runId === runIdRef.current) {
                  // Non-urgent list growth stays in a transition.
                  React.startTransition(() => {
                    if (!mountedRef.current || runId !== runIdRef.current)
                      return
                    setState((prev) => ({
                      ...prev,
                      cards: [...prev.cards, card],
                    }))
                  })
                }
              }
            }
            boundary = buffer.indexOf("\n\n")
          }

          if (doneSeen) break
          if (!mountedRef.current || runId !== runIdRef.current) {
            try {
              await reader.cancel()
            } catch {
              // ignore — abort path already invalidated this run
            }
            window.clearTimeout(timeoutId)
            return
          }
        }
      } finally {
        window.clearTimeout(timeoutId)
        try {
          reader.releaseLock()
        } catch {
          // ignore — stream already closed or cancelled
        }
      }

      if (!mountedRef.current || runId !== runIdRef.current) return

      if (doneSeen) {
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          isFallingBack: false,
          isComplete: true,
          searchId: doneSearchId,
          error: null,
        }))
        return
      }

      // Ended without the terminal done event — treat as a stream error.
      throw new ApiError("The travel service interrupted the live results.", {
        code: "server",
        status: null,
      })
    } catch (streamError) {
      window.clearTimeout(timeoutId)
      if (!mountedRef.current || runId !== runIdRef.current) return

      let reason: SseTerminalReason = "error"
      if (timedOut) {
        reason = "timeout"
      } else if (
        streamError instanceof DOMException
          ? streamError.name === "AbortError"
          : (streamError as Error)?.name === "AbortError"
      ) {
        reason = "aborted"
      }

      if (shouldFallbackToBlocking(reason)) {
        const fallbackError =
          streamError instanceof ApiError
            ? streamError
            : new ApiError("The travel service is temporarily unavailable.", {
                code: reason === "timeout" ? "timeout" : "server",
                status: null,
              })
        // Preserve the stream failure for empty-fallback display.
        setState((prev) => ({ ...prev, error: fallbackError }))
        await runBlockingFallback()
        return
      }

      // Clean abort (new search / unmount race that kept the run id):
      // never surface, never fall back.
      if (reason === "aborted") return
      fail(
        streamError instanceof ApiError
          ? streamError
          : new ApiError("The travel service is temporarily unavailable.", {
              code: "server",
              status: null,
            })
      )
    }
  }, [])

  return { ...state, start, abort }
}

export type UseDomesticStream = ReturnType<typeof useDomesticStream>
