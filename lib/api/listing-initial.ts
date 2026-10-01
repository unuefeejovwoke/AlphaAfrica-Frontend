import { ApiError, type ApiErrorCode } from "./client.ts"

/**
 * Server-rendered first page for Hotel and Vehicle listings (ticket 21).
 *
 * The listing pages stream their first backend read on the server so the
 * delivered HTML carries inventory instead of an empty shell that fills in
 * after JavaScript wakes up. This module is the contract between that server
 * read and the client search shells: {@link ListingInitialPayload} is what
 * the server sends, {@link initialListingState} is how a client seeds its
 * state from it, and {@link listingSearchedKey} marks the URL state the
 * payload already covers so the client never re-fetches it — the first page
 * is fetched once, by the server.
 *
 * Pure: no fetch, no DOM. The fetch itself stays in the domain modules
 * (`getHotelListingInitial` / `getCarListingInitial`), which map every
 * outcome — validation failure, backend failure, empty page — into a
 * payload so the delivered HTML always renders a real state, never a
 * skeleton.
 */

export interface ListingInitialPayload<T> {
  status: "success" | "empty" | "error"
  page: T | null
  /** Customer-safe message; present when status is "error". */
  errorMessage?: string
  /** Typed failure class so the client can re-raise the error faithfully. */
  errorCode?: ApiErrorCode
}

/** Sentinel marking the one automatic browse-all load on a clean entry. */
export const LISTING_AUTO_BROWSE_KEY = "auto:browse-all"

/**
 * Which URL state a server payload covers. A deep link covers its own
 * serialized params; the clean landing (no listing state in the URL) covers
 * the implicit browse-all the client would otherwise auto-load itself.
 */
export function listingSearchedKey(
  hasListingState: boolean,
  paramsString: string
): string {
  return hasListingState ? paramsString : LISTING_AUTO_BROWSE_KEY
}

export interface InitialListingState<T> {
  status: "loading" | "success" | "empty" | "error"
  page: T | null
  error: ApiError | null
}

/**
 * Seed state for a listing client. Without a payload the client starts in
 * its own loading state — that is the RSC-navigation case, where fetching
 * is handed back to the client engine. With one, the delivered HTML renders
 * real results, the empty state, or the error, and hydration matches.
 */
export function initialListingState<T>(
  payload: ListingInitialPayload<T> | null | undefined
): InitialListingState<T> {
  if (!payload) return { status: "loading", page: null, error: null }
  if (payload.status === "error") {
    const code = payload.errorCode ?? "unknown"
    return {
      status: "error",
      page: null,
      error: new ApiError(
        payload.errorMessage ?? "We could not load these results.",
        { status: code === "validation" ? 400 : null, code }
      ),
    }
  }
  return { status: payload.status, page: payload.page, error: null }
}
