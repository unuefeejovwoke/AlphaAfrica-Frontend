# Manual pass — 19, Package gallery keyboard + screen reader

Date: 2026-10-01. Environment: Windows, production build served locally,
verified against rendered HTML (fetch + assert script) plus seam tests.
No live screen reader or keyboard driver exists in this environment —
live-reader behaviour is verified by construction and each item names how.

## First paint (verified in rendered package HTML)

- Photo openers are real `<button type="button">` with names
  (`Open photo N of M: <caption>`) — PASS.
- Zero `role="button"` divs on the page — PASS.
- Every gallery image carries a non-empty naming alt
  (`<caption> (photo N of M)`) — PASS.
- Lightbox dialog markup absent from first paint (dynamic `ssr: false`
  chunk `package-lightbox`, loads on first open) — PASS.
- Exactly one `h1`, exactly one `main` — PASS.

## Dialog (verified in code + primitive defaults)

- Enlarged view is `DialogPrimitive` (Root controlled / Portal / Backdrop /
  Popup / Title / Close): focus trapped while open, background inert,
  Escape closes, scroll locked — all primitive defaults, no hand-rolled
  handlers. `finalFocus` points at the launching opener button, so focus
  returns where the Customer started.
- Counter + caption region is `aria-live="polite"`; thumbnails are buttons
  with `aria-label="Go to photo N"` + `aria-current`; main image alt names
  photo and place. Arrow keys move (only custom handler left).

## Keyboard walkthrough (by construction, DOM order)

Tab to a photo opener (visible ring) → Enter/Space opens → focus enters
the dialog (Close button first) → arrows move photos (announced via live
counter) → Escape or Close returns focus to the same opener → Tab
continues from there. Thumbnails are Tab stops with current announced.

## Screen reader (NVDA/VoiceOver) — human follow-up

Not executable here. Recommended 3-minute script: open a package, confirm
each opener announces "Open photo N of M"; open one, confirm dialog role
+ title announced and background silenced; arrow through photos, confirm
counter announcements; Escape, confirm focus returns to the opener.
