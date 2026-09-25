# 06 — Checkout integrity and verification

**What to build:** Make the money path incapable of silent mistakes: fare confirmation explicitly handles rechecking, unchanged, changed-with-consent, and expired branches; Traveller entry asks for passports only on international routes; Pending Booking creation reuses the stored reference on identical retries instead of duplicating; and reference-only verification resolves paid, pending, cancelled, and failed with the PNR shown only when the airline order exists plus payment-safety copy.

**Blocked by:** 02 — Honest domestic streaming, 05 — Comparable cards, help, and accessibility (needs the domestic branch and the comparable selection handoff).

**Status:** resolved

## Comments
- Handoff integrity: `saveSelectedOffer`/`saveConfirmedOffer` (flights) + domestic card saves now write module memory first with sessionStorage backup; reads prefer memory, fall back to session — blob never in URLs/analytics either way. New `clearSelectedOffer`/`clearSelectedDomesticCard`; `handleSelect` clears the opposite branch so back-then-reselect never shadows fresh state; legacy domestic-shaped Amadeus saves still take the domestic branch defensively.
- Party integrity (found bug: `/checkout` parsed party from URL but confirmation navigated without it → always solo-adult slots): new `SELECTED_PARTY_SESSION_KEY` + `saveSelectedParty`/`readSelectedParty` (validated 1–9 ranges, memory + session) saved at selection from URL values; `buildCheckoutPartyQuery` forwards `?adults=&children=&infants=` on every continue path (same-branch auto `replace`, changed/domestic `push`); checkout page already parses these into exact slots.
- Fare confirmation: rechecking/unchanged→auto-continue/changed (previous/new/difference + continue-or-back + Ask Alphaa)/expired (re-search + Talk)/error (retry)/missing + domestic (no price call, direct continue) — nothing books silently (no booking call in this step).
- Traveller entry: international detection from Confirmed Offer route (strict-superset default), passport block only when required — unchanged, verified.
- Payment: single-flight guard (`creationRef` + `isLoading`-disabled pay + redirecting status replacing actions) with identical-retry reuse via `hashBookingKey`/`findReusableBooking` — unchanged, verified.
- Verification: uncached reference-only (`noStore` booking + tolerant order fetch), paid incl. airline-confirmed, pending/cancelled/failed branches, PNR only when non-empty, safety copy + reference retention on failure, saved-reference resume — unchanged, verified.
- Verify: `pnpm typecheck` pass; `pnpm build` pass; `pnpm test` 97/99 — price machine + verification seams green; 2 failures pre-existing `navigation.test.ts`, untouched.

- [ ] Selecting a Flight Offer hands off the opaque blob via memory with session backup, never in URLs or analytics (story 25)
- [ ] Fare confirmation shows live rechecking, continues unchanged fares to Traveller entry, shows previous amount, new amount, difference, and explicit continue-or-back on changed fares, and shows re-search plus Talk to Alphaa on expired fares — nothing ever books silently (story 26)
- [ ] Traveller entry captures per-Traveller identity, contact, and phone with the passport branch only when the route requires it (story 28)
- [ ] Pending Booking creation uses a single-flight guard with disabled actions and reuses the stored pending reference for identical Confirmed Offer plus party retries (story 29)
- [ ] Verification is uncached and reference-only, resolving paid (including airline-confirmed), pending, cancelled, and failed with the PNR rendered only when non-empty and reassurance plus reference retention on failure (story 30)
- [ ] Price machine plus verification seams stay green: same, changed, and expired outcomes, expiry-error classification, and idempotent verification behavior
