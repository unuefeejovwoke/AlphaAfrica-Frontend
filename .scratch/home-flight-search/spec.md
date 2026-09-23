# Spec: Home Flights Tab — Compact Search Widget

Design read: redesign-preserve of a trust-first booking widget for Nigerian travellers, with a premium-boutique language, leaning toward the existing Tailwind v4 + Base UI + Hugeicons system. Dials: `DESIGN_VARIANCE: 4 / MOTION_INTENSITY: 3 / VISUAL_DENSITY: 6` — match existing shell, quiet motion, compact data density.

## Problem Statement

A visitor landing on the homepage sees a Flights tab in the travel search switcher, but it only shows a "coming soon" hatch pointing to WhatsApp. There is no way to start a Flight search from home, even though the dedicated flights experience already supports one-way, round-trip, and multi-city Flight Offer search with airport autocomplete. This forces motivated Customers to discover the flights page on their own or abandon self-service for Assisted Service, hurting completed-booking conversion and making the homepage feel like a brochure rather than the product.

## Solution

Tapping the Flights tab reveals a compact flight search matching the approved screenshot and the current homepage design language: trip-type selector, FROM with swap to TO, Departure (plus Return for round-trip), Travellers picker, cabin selector, and a Search flights action. Submitting a valid search navigates to the flights experience with shareable URL search state, which auto-searches and renders results. Selecting Multi-city delegates to the full flights editor instead of cramming 2–6 legs into the home card. Hotels and Car Rentals tabs stay unchanged.

## User Stories

1. As a first-time Traveller, I want to see One way selected by default with a single Departure field, so that I am not overwhelmed on first load.
2. As a leisure Customer, I want to switch to Round trip and get a Return field, so that I can plan returns without leaving home.
3. As a Customer planning multiple stops, I want Multi-city to send me to the full flights editor, so that I can enter 2–6 legs properly instead of fighting a cramped widget.
4. As a Nigerian Traveller, I want to type 2+ characters and get airport autocomplete by IATA, city, or name, so that I avoid misspelled free-text entries.
5. As a Customer, I want my recent airports shown when the field is idle, so that repeat routes take one tap.
6. As a Customer, I want FROM and TO to reject the same airport, so that I cannot submit an impossible route.
7. As a Customer, I want a swap control between FROM and TO that never deletes my input, so that I can reverse a route instantly.
8. As a Customer, I want swap disabled only when both fields are empty, so that the control never feels dead.
9. As a Customer, I want Departure to reject past dates, so that I cannot search an impossible trip.
10. As a round-trip Customer, I want Return forced on or after Departure, so that same-day returns work but backwards ranges do not.
11. As a Customer, I want the Travellers trigger to read "1 Adult" for a solo adult, so that the common case feels human.
12. As a family Customer, I want a compact "N travellers" summary with full breakdown for screen readers, so that the box never overflows.
13. As a family Customer, I want Adults, Children, and Infants steppers with total max 9 and infants capped by adults, so that backend party rules are mirrored upfront.
14. As a Customer, I want one visible cabin selector applied to every leg, so that I do not configure cabin per leg on home.
15. As a Customer, I want validation on blur plus full validation on submit, so that typing stays quiet but Search catches everything.
16. As a Customer, I want typed-but-unselected airport text rejected with "Select an airport from the list", so that I cannot bypass autocomplete.
17. As a Customer, I want invalid submit to stay on home, focus the first error, and announce it, so that I am not jumped to an empty results page.
18. As a mobile Customer, I want single-column stacking in desktop field order with 44px targets, so that thumbs never mis-tap.
19. As a mobile Customer, I want a full-width Search action, so that the primary action is unmissable.
20. As a keyboard user, I want full tab/arrow/enter/escape support across trip selector, comboboxes, popover, and selects, so that no mouse is needed.
21. As a screen-reader user, I want proper tablist, radiogroup, combobox/listbox, dialog, labels above inputs, and errors below inputs, so that the widget is fully announced.
22. As a Customer, I want prices to remain NGN-only with no currency picker on home, so that choice overload is avoided per the domestic-routing decision.
23. As a Customer, I want no non-stop or max-stops controls on home, so that the card stays minimal and filters live on results.
24. As a Customer, I want Search to navigate to shareable URL search state that auto-searches, so that back/refresh/share preserves my search.
25. As a Customer, I want no opaque fare data in the URL, so that fares stay in memory/session like the rest of the flights flow.
26. As a returning Customer, I want my last trip-type remembered only after explicit choice, so that first visit stays predictable.
27. As a support-seeking Customer, I want human assistance reachable within one step of any failure, so that I never feel stuck.
28. As Alphaa operations, I want `flight_search_started` tracked only on valid submit without PII or fare blobs, so that analytics stays clean.
29. As Alphaa operations, I want home validation messages human-readable and mapped from technical errors, so that raw backend copy never reaches Customers.
30. As a dark-mode user, I want the widget fully legible in both themes with AA contrast, so that neither theme feels second-class.

## Implementation Decisions

Homepage design match (audited from live home):

- Shell stays rounded large card surface with backdrop blur and soft elevated shadow, generous padding scaling up at larger breakpoints. No new page chrome; widget lives inside the existing switcher panel.
- Trip selector uses the existing segmented-tab language: muted track pill, card-colored active pill with subtle ring and shadow, primary-colored icon on active, muted icon inactive. Lightweight radio semantics underneath. No navy pill from the screenshot; system style wins per grilling decision and dark-mode parity.
- Field labels are uppercase micro-labels above inputs; helper text optional in markup; error text below inputs. Never placeholder-as-label.
- Inputs are standard-height rounded bordered card surfaces with soft shadow, muted placeholder, primary-tinted focus ring. Airport fields carry a leading location glyph and a clear affordance; selected state shows a compact "Selected: IATA — city" confirmation line.
- Swap is a small circular bordered action between route fields (horizontal on desktop, rotated vertical on mobile) with an arrow glyph and visible focus ring.
- Travellers trigger is a bordered card-style button showing the smart short label; the popover is a card popup with standard padding and shadow containing the existing stepper unchanged. Cabin uses the existing select primitive (trigger plus popup list with check indicator).
- Primary Search action uses the default brand button (brand orange fill, light foreground, rounded, semibold, active press scale, loading spinner state). Screenshot blue is explicitly rejected to preserve the single-accent lock.
- Motion is quiet: color transitions only, press scale on CTA, list updates deferred so typing stays high priority. Honors reduced-motion; no scroll hijack, no marquee, no glow.
- Density is compact-product (denser than marketing sections): route row, dates row, travellers plus cabin row, full-width Search. Desktop multi-column via grid; mobile strict single column with explicit fallback.

Modules built/modified:

- New compact home flight search module (client leaf) owning trip state, route state, date state, party state, cabin state, and submit mapping. Rendered only when the Flights tab is active so hotels/cars bundles are untouched.
- Home search switcher keeps tab state, keyboard arrow navigation, and tabpanel semantics; flights panel swaps hatch for the new widget.
- Shared flight URL contract extracted so home and the flights page use one builder and one parser for search params (origin, destination, dates, legs blob for multi-city delegate, party counts, cabin, trip flags). Eliminates drift between submit and hydration.
- No changes to the flights search executor, domestic streaming, price confirmation, checkout, payment, or backend contracts.

Interfaces and contracts:

- Form layer is React Hook Form plus Zod with the discriminated trip union as the single domain source of truth. The flat form adapter exists only so the array path stays stable; semantic rules are never duplicated in the widget.
- Airport selection uses the existing airport domain interface: 2-char minimum, debounced fetch, module-level result cache plus in-flight dedup, recent-airport store, exclusion of the opposite IATA, selection object required (no free-text bypass).
- Submit maps a validated payload through the existing legs-contract mapper (one-way equals 1 leg, round-trip equals outbound plus return, cabin fanned to every leg) and then through the shared URL builder. Currency is fixed NGN; opaque Flight Offer blobs never enter the URL.
- Multi-city in the widget is a delegate state, not an editor: one explanatory row plus a continue action carrying the multi-city trip flag into the full editor.

Key interactions:

- Trip change clears hidden-branch errors and toggles Return visibility; Return minimum tracks Departure.
- Autocomplete edit after selection clears that selection, forcing a fresh pick.
- Swap exchanges values and selection objects, re-validates distinctness, and announces via live region.
- Travellers popover closes on outside/escape and returns focus to the trigger; total announced politely.
- Invalid submit focuses the first invalid control and surfaces inline errors plus a root alert for cross-field errors.
- Valid submit fires the search-started analytic with trip type, cabin, and domestic/international route class only, then navigates with scroll preserved; the flights page owns auto-search, skeletons, streaming, filters, and selection into fare confirmation.

Schema and API notes:

- No schema or migration changes. Client reuses the airport shape, cabin enum, party composition rules, future-date string rule, and per-leg shape already owned by the flight domain module.
- No new endpoints. Home performs zero search fetches; only autocomplete reads via the centralized API client. Actual search remains the flights page search for international and the SSE stream plus blocking fallback for domestic Nigerian routes.

## Testing Decisions

- Good tests assert external behavior only: visible labels, navigation targets, error copy, focus movement, and URL params — never internal hook state or library internals.
- Domain seam: the discriminated trip union is the validation seam. Cases include past dates, same-airport routes, return-before-departure, infants exceeding adults, totals over 9, and unknown URL hydration rejected without auto-search.
- Integration seam: the shared URL contract is the navigation seam. Cases include one-way and round-trip building exact params, multi-city delegate carrying the trip flag, invalid payload producing no navigation, and round-trip URL parsing back to identical form state.
- Widget behavior seam: the compact module tested via submit-to-URL, swap with empty/one/both filled, autocomplete-pick-required guard, travellers summary copy ("1 Adult" versus "N travellers"), and focus-first-error on invalid submit.
- Prior art: existing flight form and page-client tests for Zod parsing and URL hydration; autocomplete tests for debounce/cache/recent; stepper tests for party clamping. New tests mirror those patterns at the higher URL seam rather than re-testing primitives.
- Manual gates: keyboard-only pass, screen-reader label/error announcement pass, 360px mobile stacking pass, light plus dark contrast pass, typecheck plus production build.

## Out of Scope

- Inline results on the homepage; all result rendering stays on the flights experience.
- Multi-city leg editing on home; full editor owns 2–6 legs, chronological chain, and per-leg display.
- Non-stop toggle, max-stops, sorting, and filtering on home; results page owns them.
- Currency selection (NGN-only), fare display, price confirmation, Traveller details, checkout, Paystack flow, PNR issuance, Booking verification, and confirmation screens.
- Hotels, Car Rentals, Packages, and Visa tab changes.
- Custom calendar component, new icon family, new font, new color accent, or screenshot-navy pill.
- Backend, endpoint, or pricing-markup changes.

## Further Notes

- Screenshot fidelity versus system consistency: the screenshot layout (field order, swap affordance, travellers plus cabin plus search arrangement) is adopted; its navy active pill and blue CTA are intentionally not adopted to preserve the locked homepage system and AA contrast in both themes.
- Date display like "30 Sept 2026" is achieved by styling the native date control, not a custom calendar, keeping keyboard entry, mobile pickers, and zero new dependencies.
- Defaults are empty with recents; the screenshot route values are treated as illustrative content, not preloads, to avoid false submissions.
- Analytics must never capture names, emails, phones, passport data, payment data, tokens, or opaque fare blobs.
- The shared URL helper extraction is a pure move with no behavior change to the flights page; it exists solely to keep home submit and flights hydration to one implementation.
