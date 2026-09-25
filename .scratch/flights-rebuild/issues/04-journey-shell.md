# 04 — Journey shell

**What to build:** Make the Customer impossible to lose: a six-step journey header (Search, Compare, Confirm fare, Travellers, Pay, Ticket), a sticky itinerary summary that collapses the long form after search with an Edit action, basic fields up front with advanced fare controls behind a disclosure, and a compact results header with route-mode pill, live count, sort, and a single Filters entry that opens a sheet on desktop and mobile — deleting the desktop filter wall.

**Blocked by:** 02 — Honest domestic streaming, 03 — Truthful results (needs the mode signal and truthful counts).

**Status:** resolved

## Comments
- New `components/flights/flight-journey-header.tsx`: six-step `ol` (Search/Compare/Confirm fare/Travellers/Pay/Ticket) with `aria-current="step"`, done/current/upcoming states, decorative icons hidden, live polite announcer, horizontal scroll on small screens.
- Wired current step: `/flights` (1 Search / 2 Compare via `hasSearched`), `/flights/confirm` (3), `/checkout` (4), `/checkout/payment` (5), `/flights/verify` (6).
- `flight-search-page-client.tsx`: `formExpanded` state; `doSearch` collapses into sticky (`top-16`, backdrop-blur) itinerary summary (route incl. Return/Multi-city legs, dates, party A/C/I, cabin, mode pill) with `Edit search` re-expanding + scrolling to form; summary derives from URL values so homepage carry-over is visibly confirmed; form remounts from URL state on re-expand.
- `flight-search-form.tsx`: cabin/non-stop/max-stops moved behind native `<details>` "Advanced fare options" disclosure; basic route/dates/party/search stay visible with full-width search action; trip-type/leg-editor/validation untouched; domestic disable + Economy-only notice preserved.
- `flight-filter-bar.tsx`: rewritten as compact header + single sheet — mode pill (Domestic·Live pulsing / International·Instant), live count (`aria-live`, streaming/stale/filtering aware), sort `Select`, one Filters button with active-count badge (always visible); Drawer sheet (filters only, sort removed) on both desktop (`md:items-center`) and mobile; desktop filter wall deleted.
- `flight-search-results.tsx` (mode=international) + `domestic-stream-results.tsx` (mode=domestic): pass `totalCount`/`isStale`/`isStreaming`, removed duplicated count `<p>`; domestic keeps elapsed/search-ref/cancel context row.
- Filter/sort URL shareability unchanged (`FILTER_PARAM_KEYS` needle + `useFilteredOffers` replace/adopt); back/refresh/share preserve refinement without refetch.
- Homepage widget untouched: `components/home/home-flight-search.tsx` absent from diff (verified via `git status`).
- Verify: `pnpm typecheck` pass; `pnpm build` pass; `pnpm test` 97/99 — all flights seams green; 2 failures pre-existing `navigation.test.ts`, untouched.

## Code-review fixes
- `flight-journey-header.tsx`: `aria-current="step"` moved from inner `span` onto the `li` step item.
- `flight-search-page-client.tsx`: `expandForm`/`handleRetry` scroll via a shared ref callback honoring `prefers-reduced-motion` (auto vs smooth); no more `document.getElementById` chain.
- Checkout + payment shells: removed legacy "Step 1/2 of 3" pills — the six-step journey header is the single progress source.
- `flight-filter-bar.tsx`: Sort group restored inside the Filters sheet ("Filter & sort flights"); header select and sheet chips stay synced on the same state (story 32).

- [ ] Journey header shows current step across search, fare confirmation, Traveller entry, payment, and verification (story 3)
- [ ] After a search runs, the full form collapses into a sticky itinerary summary (route, dates, party, cabin, mode) with an Edit action that re-expands it; homepage carry-over is visibly confirmed (stories 1, 4)
- [ ] Basic search (route, dates, party, search action) stays visible while cabin, non-stop, and maximum stops live behind a disclosure; trip-type, leg editor (2 to 6 legs, chronological), and inline validation with first-error focus keep working (stories 5, 6, 7, 8)
- [ ] Results header shows the route-mode pill (domestic live versus international instant), the live result count, sort control, and one Filters entry with active-count badge opening a sheet on both desktop and mobile; no expanded filter wall remains (stories 20, 32)
- [ ] Filter and sort state stays shareable in the URL without retriggering backend fetches; back, refresh, and share preserve refinement (stories 20, 37)
- [ ] Homepage widget is untouched in visuals, copy, and analytics
