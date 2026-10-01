# Manual pass — 18, Flights results keyboard + screen reader

Date: 2026-10-01. Environment: Windows, production build served locally,
verified against rendered HTML (fetch + assert script) plus seam tests.
No live screen reader (NVDA/VoiceOver) or keyboard driver exists in this
environment — live-reader behaviour below is verified by construction
(native controls, ARIA wiring, primitive defaults) and each item names how.

## Landmarks and headings (verified in rendered /flights HTML)

- Exactly one `<h1>` (`Search flights`, sr-only) — PASS.
- Exactly one `<main>` (site shell `#main-content`); the two results views
  render `<div>` — PASS.
- Results heading stays `h2#flight-results-heading` under the h1 — PASS.

## Controls (verified in code + seam tests)

- Sort pills share `FlightSortPills`: `role="group"` + `aria-label="Sort
  flights"`, each pill `aria-pressed`, selected pill carries a check icon
  (colour never alone), active sort announced via a polite live region
  (`describeSortSelection`, tested).
- Sidebar price / duration / cabin / departure buttons: `aria-pressed`;
  each section `role="group"` with label (Stops, Maximum price, Maximum
  duration, Departure time, Airlines, Cabin class).
- Airline matrix buttons (desktop + mobile): `aria-pressed` + `aria-label`;
  show more/less: `aria-expanded`. Mobile `h4`-in-`button` fixed to `span`.
- Clear-all keeps a visible focus ring (was `focus-visible:outline-none`
  with no ring); both mobile drawer close buttons gained rings; every sort
  and filter button has an explicit focus ring.

## Fare changes (verified in code + seam tests)

- Changed / expired outcomes render `describePriceOutcome` text in a
  `role="alert"` region and move focus to the dialog title
  (`tabIndex={-1}` + effect). Same-fare outcomes announce nothing and
  continue — asserted in `tests/flights-results-a11y.test.ts`.
- Modify panel: expanding via Modify/Edit moves focus to its heading;
  first paint never steals focus (flag-gated effect).
- Dialog close restores focus via the Base UI primitive default.

## Keyboard walkthrough (by construction, DOM order)

Skip link → nav → journey steps (announced, `aria-current="step"`) →
search form → Modify (expands + focus to heading) → sort group (arrows
move between pills natively as Tab stops; pressed announced) → filters →
cards → fare dialog (trap, Escape, restore). Every stop is a native
button/input with a visible ring; no `tabIndex` hacks, no clickable divs.

## Screen reader (NVDA/VoiceOver) — human follow-up

Not executable here. Recommended 5-minute script: enable reader, land on
/flights, confirm one h1; run a search; Tab to sort group, confirm
"pressed" + live "Sorted by cheapest — N flights shown"; toggle a filter,
confirm pressed; open a fare dialog on a changed fare, confirm the alert
text reads and focus lands on the new title.
