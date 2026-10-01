# 18 — Flights results page is operable by keyboard and screen reader

**What to build:** A Customer using a screen reader or working only from the keyboard can search flights, understand the results, set filters and sorts, and hear when a fare changes.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] The page exposes exactly one first-level heading, and no nested main landmark
- [x] Every filter and sort control exposes its selected state and its group; the active sort is announced
- [x] No control removes its focus indication; the clear-all control keeps a visible focus ring
- [x] A changed or expired fare is announced, and focus moves somewhere meaningful when the form or dialog body is replaced
- [x] The decisions behind each control — pressed state, announcement text — are extracted into pure functions covered by the seam tests
- [x] A documented manual keyboard and screen-reader pass records what was verified
- [x] Selected state is never signalled by colour alone

## Comments

Implemented in commit `Ticket 18: flights results operable by keyboard and
screen reader` (plus `describePriceOutcome`, which rode along in the
concurrent 05-deadlines commit). Seam tests:
`tests/flights-results-a11y.test.ts` (6 tests). Rendered-HTML verification
(10/10 PASS against the production build) and the keyboard/SR pass record:
`.scratch/production-hardening/passes/18-flights-results-pass.md`.
Typecheck, full suite (252 pass, 0 fail) and build green. Live NVDA/VoiceOver
run left as a 5-minute human follow-up (script in the pass doc) — no screen
reader exists in this environment.
