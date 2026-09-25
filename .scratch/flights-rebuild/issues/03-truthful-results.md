# 03 — Truthful results

**What to build:** Make every result tell the truth: round-trip and multi-city Flight Offers expand the full journey timeline instead of showing only the first leg, price and duration filters derive from the live results so long-haul refinement works, zero-filter matches recover with one tap, and backend failures render human error copy instead of masquerading as empty results.

**Blocked by:** 01 — Request lifecycle hardening (builds on its bounded, validated result set).

**Status:** resolved

## Comments
- `lib/api/flights.ts`: `FlightOfferDisplay` gains `journeys: FlightJourney[]` (all itineraries, defensive); `getSegmentEndpoints` extended (carrier/flightNumber/duration); `buildJourneys` normalizes every itinerary; summary fields unchanged so existing seam tests stay green.
- `lib/api/domestic.ts`: `normalizeDomesticCard` emits single-journey timeline for shared card UI.
- `flight-offer-card.tsx`: native `<details>` journey timeline (Outbound/Return/Leg N headings, per-segment times/airports/carrier/duration/cabin), shown when >1 itinerary or >1 segment; keyboard/screen-reader free; never dumps raw payload.
- `lib/api/flight-filters.ts`: `PRESET_*` + `derivePriceCeilings`/`deriveDurationCeilings` (presets remain, nice 1/2/5×10ⁿ dynamic extension to rounded live max; unknown values never shrink list).
- `use-filtered-offers.ts`: returns live `priceCeilings`/`durationCeilings` (recompute on accumulated + mid-stream arrivals, memoized).
- `flight-filter-bar.tsx`: accepts optional ceilings props (defaults to presets); `flight-search-results.tsx` + `domestic-stream-results.tsx` pass live ceilings; filters/sorts stay client-side instant with no refetch; zero-filter/empty/failed distinct copy unchanged.
- Tests: updated `tests/flights-filters-sorts.test.ts` card helper with `journeys: []` (required-field maintenance, no new files).
- Verify: `pnpm typecheck` pass; `pnpm build` pass; `pnpm test` 97/99 — display-selector seam (normalization/filter/sort/codec) green; 2 failures pre-existing `navigation.test.ts`, untouched.

- [ ] Every card shows airline, departure, arrival, total duration, stops, airports, cabin, baggage when available, total price in NGN, currency, and a select action (story 17)
- [ ] Round-trip and multi-city offers expand all itineraries in a journey timeline; raw API payload is never dumped on the Customer (story 18)
- [ ] Price and duration ceilings derive from live results so international fares stay refinable; existing preset labels remain as shortcuts (story 21)
- [ ] Price, duration, stops, departure time, airline, and cabin filters plus recommended, cheapest, fastest, and earliest sorts apply instantly over accumulated cards with no refetch, including mid-stream arrivals (story 20)
- [ ] Zero-filter matches show a clear state with one-tap clear; empty searches and failed searches each show distinct human copy with retry plus Talk to Alphaa carrying trip context and reassurance that no Booking was made and no payment taken (stories 22, 23, 24)
- [ ] Display-selector seam stays green: normalization across shape variants with defensive pass-through, single-pass filtering, immutable sorting with unparseable values sinking, and filter/sort URL codec round-trips with invalid values dropped
