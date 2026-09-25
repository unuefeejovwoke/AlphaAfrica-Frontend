# 05 — Comparable cards, help, and accessibility

**What to build:** Make comparison effortless for everyone: linear cards with cheapest and fastest badges and a single chip row, one-tap Talk to Alphaa with trip-only context at every decision point, and a full keyboard, screen-reader, touch, and reduced-motion pass with deferred lists and matching skeletons so slow connections stay usable.

**Blocked by:** 03 — Truthful results, 04 — Journey shell (needs the timeline data and the sheet-based header).

**Status:** resolved

## Comments
- `flight-offer-card.tsx`: linear order now airline+price → big departure→arrival times → stops/duration rail → one chip row (stops/cabin/baggage; duration de-duplicated from rail) → full-width Select → journey `<details>` expander; Cheapest (emerald) + Fastest (sky) badges via new `isCheapest`/`isFastest` props (ties share); skeleton pulses gain `motion-reduce:animate-none`.
- `flight-search-results.tsx` + `domestic-stream-results.tsx`: `badgeIds` memo over visible displays (`parseNairaAmount`/`parseDurationMinutes`, unknown values never badge) passed to cards; lists stay deferred + transitioned.
- Talk to Alphaa audit: trip-only context (route/dates/party/ref/amount) at search header, international + domestic results (ref carried), fare-confirmation changed/expired/missing, traveller entry (saved + form), payment (origin/dest/amount), verification (ref/route/amount); `describeFlightTrip` never carries names/emails/phones/passports/payment — no changes needed.
- Keyboard: combobox semantics (role/expanded/controls/activedescendant/arrows/Enter/Escape) intact; visible `focus-visible` on all controls incl. new summaries/sheet; `shouldFocusError` inline errors; native `<details>` expanders + Drawer Escape/Close need no pointer.
- Screen-reader: polite live regions for streaming progress/counts/validation retained; heading order h1→h2→h3 intact (timeline uses `<p>`/`<ol>`); decorative icons `aria-hidden` (new dots/chevrons hidden; journey bubbles hidden via parent).
- Touch/sheet/motion: min-h-11/12 targets kept; sheet `overscroll-contain` + sticky action; `animate-pulse/spin` all gated with `motion-reduce:animate-none` (skeletons, confirm loading, verify clock, mode dots); no layout shift (explicit skeleton shapes, no images).
- Analytics audit: search started/completed, selected, price-changed, checkout-started, payment-initiated/completed carry trip type/cabin/route/counts only — no PII or fare blobs (sanitizer-tested).
- Verify: `pnpm typecheck` pass; `pnpm build` pass; `pnpm test` 97/99 — all flights seams green; 2 failures pre-existing `navigation.test.ts`, untouched.

## Code-review fixes
- New `components/flights/use-comparison-badges.ts`: shared cheapest/fastest hook; both results lists call it (removes the duplicated double-scan memo).
- `lib/api/flight-filters.ts`: `derivePriceCeilings`/`deriveDurationCeilings` now share one generic `deriveCeilings` helper (same output, no behavior change).

- [ ] Cards read linearly (airline plus price, big departure-to-arrival times, stops and duration rail, one chip row, full-width select, details expander) with cheapest and fastest badges (stories 17, 19)
- [ ] Talk to Alphaa is one tap away at search, results, fare confirmation, Traveller entry, payment, and verification carrying route, dates, party, references, and amounts only — never names, emails, phones, passports, or payment data (story 31)
- [ ] Keyboard path works throughout: combobox semantics on airports, visible focus everywhere, inline errors with first-error focus, sheet and expander operable without a pointer (story 33)
- [ ] Screen-reader path works throughout: polite live regions for progress, counts, and validation, ordered headings, decorative icons hidden (story 34)
- [ ] Touch targets, sheet containment, and reduced-motion support meet the project Web Interface Guidelines; lists defer and transition so input stays responsive with skeletons matching final layout and no layout shift (stories 32, 35)
- [ ] Analytics carry trip type, cabin, route class, and counts only — no personal or fare-blob data (story 36)
