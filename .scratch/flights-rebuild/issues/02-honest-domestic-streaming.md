# 02 — Honest domestic streaming

**What to build:** Make both-Nigerian searches feel alive and honest: progressive Domestic Flight Cards arrive with real progress copy and elapsed time, the search reference appears early and survives completion, cancel stops the stream, cabin and stop controls show an Economy-only notice and disable with explanation, and selecting a domestic card follows a domestic booking branch that never forces Amadeus-style revalidation on a card carrying no opaque blob.

**Blocked by:** 01 — Request lifecycle hardening (reuses its abort and run-guard convention).

**Status:** resolved

## Comments
- `lib/api/domestic.ts`: `parseSseEventBlock` captures searchId from ANY event (early ref) + done bare-string; `fetchDomesticBlocking(params, {signal})` cancellable; new `isDomesticFlightCard` (no blob/itineraries/codes → domestic) + `SELECTED/CONFIRMED_DOMESTIC_CARD` session handoff.
- `use-domestic-stream.ts`: `startedAt` exposed; early searchId commits on any event and retained; fallback uses own AbortController + signal; abort during fallback returns quietly with no late commits.
- `domestic-stream-results.tsx`: honest progress (count so far + airlines checking + elapsed seconds ticking + skeletons, never blank); search ref visible early + retained + carried into support context; Cancel action while streaming/fallback; empty completion keeps ref.
- `flight-search-form.tsx` + `ui/select.tsx`: Select gains `disabled`; both-Nigerian one-way/round-trip shows Economy-only notice (`role=note`, live) and disables cabin/non-stop/max-stops with explanation; domestic params carry no fare classes so backend never receives ignored values.
- `flight-search-page-client.tsx`: `handleSelect` branches domestic (session domestic key, route=domestic analytics) vs Amadeus; `handleCancelDomestic` wires abort; `DomesticStreamResults` receives `startedAt` + `onCancel`.
- `price-confirmation-client.tsx`: new `domestic` phase checked first (domestic key, then legacy-shape guard); skips `confirmFlightPrice` entirely — no card fields submitted as opaque blob; persists domestic confirmed for travellers/payment; renders domestic summary + continue/back/Ask Alphaa.
- Verify: `pnpm typecheck` pass; `pnpm build` pass; `pnpm test` 97/99 — display-selector seam (fallback trigger) + all flights seams green; 2 failures pre-existing `navigation.test.ts`, untouched.

## Code-review fixes
- `use-domestic-stream.ts`: terminal `done` retains the early `searchId` (`doneSearchId ?? prev.searchId`) instead of overwriting with null.
- `lib/api/domestic.ts`: new shared `resolveBookingBranch(searchMode, raw)` resolver; page client + fare confirmation both call it (replaces the repeated branch cascade).

- [ ] Domestic search streams cards progressively with honest progress (count so far, airlines still checking, elapsed time) plus skeletons, never a blank spinner (story 11)
- [ ] Search reference is visible early, retained on completion, and carried into support context; empty completion keeps the reference (story 12)
- [ ] Cancel during streaming or fallback stops work promptly with no late commits (story 13)
- [ ] Cabin, non-stop, and maximum-stops controls on both-Nigerian routes show the Economy-only notice and disable with explanation; the backend never receives fare classes it ignores (story 14)
- [ ] Selecting a Domestic Flight Card enters a domestic booking branch; no card fields are ever submitted as an opaque Amadeus blob (story 27)
- [ ] Stream error or timeout falls back to the blocking search; clean completion or user abort never does (display-selector seam: fallback trigger)
