# 19 — Package gallery uses real buttons and a real dialog

**What to build:** Opening a Package photo is a real button, the enlarged view is a real dialog, and a keyboard or screen-reader Customer can open it, move through the photos, close it and land back where they started.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] Photo openers are real buttons with accessible names; no clickable divs
- [x] The enlarged view uses the project's existing dialog primitive, with focus trapped while open and restored on close
- [x] The background is inert while the dialog is open, and Escape closes it
- [x] Each photo has alt text that names what it shows
- [x] Open and close transitions are extracted into pure functions covered by the seam tests
- [x] A documented manual keyboard and screen-reader pass records what was verified
- [x] The interaction-only lightbox is not required for the first paint of a Package detail page

## Comments

Implemented in commit `Ticket 19: package gallery uses real buttons and a
real dialog`. Seam tests: `tests/package-gallery-a11y.test.ts` (5 tests).
Rendered-HTML verification (first paint: real buttons, named alts, no
dialog markup) and the keyboard/SR pass record:
`.scratch/production-hardening/passes/19-package-gallery-pass.md`.
Typecheck, full suite (252 pass, 0 fail) and build green. Live NVDA/VoiceOver
run left as a 3-minute human follow-up (script in the pass doc) — no screen
reader exists in this environment.
