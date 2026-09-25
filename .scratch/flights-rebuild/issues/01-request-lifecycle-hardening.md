# 01 — Request lifecycle hardening

**What to build:** Make every Flight search request truthful end to end: airport suggestions never show a stale list while the Customer keeps typing, re-searching never lets an older response overwrite a newer one, shared links resolve airport codes to city and airport names, and every international search sends a bounded result limit through the existing legs contract.

**Blocked by:** None — can start immediately.

**Status:** resolved

## Comments
- `lib/api/client.ts`: `apiGet`/`apiPost` accept `signal`; AbortError propagates so run-guards ignore stale responses instead of converting cancellation to network errors.
- `lib/api/flights.ts`: `searchAirports(query, {signal})` with abort propagation (cache/dedup signal-agnostic); new `fetchAirportByIata` (cache scan → lookup → exact IATA match, null fallback, never throws except on abort); `FLIGHT_SEARCH_MAX_OFFERS=20` (apidoc 1–50/default 20) included in `toFlightSearchRequest`; `searchFlights(payload, {signal})` single request per itinerary.
- `airport-autocomplete.tsx`: debounces RAW `query` (300ms), per-run AbortController + `runIdRef` guard; stale/aborted runs never commit; unmount aborts and invalidates.
- `flight-search-page-client.tsx`: international `doSearch` uses `searchRunRef` + `searchAbortRef` with signal to `searchFlights`; AbortError + superseded runs return silently; unmount cancels; domestic start cancels in-flight international (and vice versa); shared-link hydration enriches light IATA airports via `fetchAirportByIata` in parallel with run-guard, graceful fallback to bare code, display-only (validation still IATA-gated).
- Verify: `pnpm typecheck` pass; `pnpm build` pass; `pnpm test` 97/99 — all `tests/flights-*.test.ts`, `flight-booking`, `flight-verify`, `home-flight-search` seams green; 2 failures pre-existing in `tests/navigation.test.ts` (CTA copy + footer, untouched by this ticket).

- [ ] Typing continuously in either airport field ends with suggestions matching the final text, never an older prefix (covers spec stories 9, 10)
- [ ] Submitting two searches in quick succession leaves only the latest results on screen; unmount cancels in-flight work (story 16)
- [ ] Opening a shared or refreshed search URL shows airport names, not bare codes, with graceful fallback when lookup fails (stories 1, 2)
- [ ] International search sends the backend-supported bounded result limit as one request per itinerary; invalid or partial URL state still never triggers a fetch (stories 6, 7, 8, 15)
- [ ] Existing seams under test stay green: shared URL contract round-trips plus trip validation (one-way, round-trip, multi-city legs shape, party composition) at the URL-plus-validation seam
