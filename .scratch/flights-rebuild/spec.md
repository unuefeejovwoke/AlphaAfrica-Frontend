# Spec: Flights Experience Rebuild — Logic Hardening + Stepper UX

Status: ready-for-agent

## Problem Statement

A Customer who starts a Flight search from the homepage lands on the flights experience and gets lost. The search they just made does not visibly carry over (airports render as bare codes), the same search form appears a second time in a denser layout, results compete with a wall of filter chips and repeated support hatches, and there is no sense of progress through search, compare, fare confirmation, Traveller entry, payment, and ticket. Domestic searches stream for up to a minute with no honest progress or cancel option, cabin and stop choices are silently ignored on domestic routes, and round-trip and multi-city results show only the first leg. Behind the UI, rapid typing and rapid re-search can race (stale airport suggestions, stale search results), the result limit is never sent, and Domestic Flight Cards cannot survive the fare-confirmation step built for opaque Flight Offer blobs.

## Solution

Keep the homepage widget exactly as it is. Rebuild the flights experience around a visible six-step journey (Search, Compare, Confirm fare, Travellers, Pay, Ticket) with a sticky itinerary summary bar: after a search auto-runs, the full form collapses and the Customer sees where they are, what they searched, and how to edit it. Basic search stays visible while advanced controls (cabin, non-stop, maximum stops) move into a disclosure. Results get a compact header showing the route mode (domestic live-streaming versus international instant), the count, sort, and a single Filters entry point that opens a sheet on both desktop and mobile. Flight Offer cards become linear and comparable with an expandable journey timeline, cheapest and fastest badges, and one chip row. Domestic streaming gets honest progress, an early search reference, and cancel. Cabin and stop controls on both-Nigerian routes show an Economy-only notice and disable with explanation instead of silently ignoring. All logic fixes ride the existing domain seams with no new test files required.

## User Stories

1. As a Customer starting on the homepage, I want my route, dates, party, and cabin to visibly carry over to the flights page, so that I trust the search ran with what I entered.
2. As a Customer arriving via a shared link, I want airport codes resolved to city and airport names, so that I am not confused by bare codes.
3. As a first-time Traveller, I want to see which step I am on (Search, Compare, Confirm fare, Travellers, Pay, Ticket), so that I know what happens next.
4. As a Customer after searching, I want the long form collapsed into an itinerary summary with an Edit action, so that I am not confronted with two forms.
5. As a Customer editing a search, I want basic fields always visible and advanced fare controls behind a disclosure, so that the form feels simple but stays powerful.
6. As a Customer searching one-way, I want origin, destination, departure date, party, and cabin validated with inline errors and focus on the first error, so that I fix mistakes fast.
7. As a Customer searching round-trip, I want the return date constrained to on or after departure with a clear error otherwise, so that I never request an impossible itinerary.
8. As a Customer planning multiple stops, I want a leg editor supporting 2 to 6 legs in non-decreasing date order, so that complex itineraries validate before any fare is fetched.
9. As a Customer typing an airport, I want suggestions from 2 characters across code, city, and name with debounced fetching, recent airports when idle, and no stale list when I keep typing, so that selection feels instant and correct.
10. As a Customer who edits text after picking an airport, I want the selection cleared so a fresh pick is required, so that I never submit free text as if it were validated.
11. As a domestic Traveller (both-Nigerian route), I want progressive results as airlines respond with honest progress copy and elapsed time, so that a 30 to 60 second search feels alive rather than broken.
12. As a domestic Traveller, I want the search reference shown early and retained on completion, so that support can trace my stream.
13. As a domestic Traveller, I want a cancel action while streaming, so that a mistaken search does not run for a full minute.
14. As a domestic Traveller, I want a clear Economy-only notice with cabin and stop controls disabled and explained, so that I am never misled into picking a fare class that is ignored.
15. As an international Traveller, I want one request per itinerary with an explicit result limit, so that searches are bounded and predictable.
16. As a Customer re-searching quickly, I want the previous in-flight search aborted so stale results never overwrite fresh ones, so that what I see always matches my latest criteria.
17. As a Customer comparing offers, I want every card to show airline, departure, arrival, total duration, stops, airports, cabin, baggage when available, total price, currency, and a select action, so that I compare on facts.
18. As a Customer comparing round-trip or multi-city offers, I want the full journey timeline expandable beyond the first leg, so that I am not shown a misleading single-leg summary.
19. As a Customer scanning many offers, I want cheapest and fastest badges, so that I shortlist without reading every card.
20. As a Customer refining results, I want price, duration, stops, departure time, airline, and cabin filters plus recommended, cheapest, fastest, and earliest sorts applied instantly with no refetch, so that refinement feels free.
21. As a Customer on an international route, I want filter ceilings derived from the actual results rather than fixed domestic-scale presets, so that filters stay useful on long-haul fares.
22. As a Customer who filters to zero, I want a clear empty-filters state with a one-tap clear action, so that I recover without re-searching.
23. As a Customer whose search returns nothing, I want human copy with retry and Talk to Alphaa actions carrying my trip context, so that I know what to do next.
24. As a Customer whose search fails, I want customer-safe error copy with retry and reassurance that no Booking was made and no payment taken, so that I am not afraid to try again.
25. As a Customer selecting a Flight Offer, I want the opaque fare blob kept out of the URL and analytics with a session-backed handoff, so that fares stay private and refresh-safe.
26. As a Customer at fare confirmation, I want a dedicated step showing live rechecking, then unchanged fare continuing to Traveller entry, changed fare showing previous amount, new amount, difference, and explicit consent, and expired fare showing re-search plus Talk to Alphaa, so that I never book a stale price silently.
27. As a domestic Traveller selecting a Domestic Flight Card, I want a booking path that does not force Amadeus-style revalidation on a card that carries no opaque blob, so that domestic selection never dead-ends.
28. As a Customer entering Traveller details, I want per-Traveller first name, last name, date of birth, gender, email, phone country code, and phone with the international passport branch only when the route requires it, so that domestic Travellers are not asked for unclear documents.
29. As a Customer paying, I want single-flight Pending Booking creation that reuses the stored reference for identical Confirmed Offer plus party retries instead of duplicating, so that double-taps and retries never create duplicate charges.
30. As a Customer returning from payment, I want reference-only verification that resolves paid, pending, cancelled, and failed with the PNR shown only when the airline order exists, so that I know whether my money is safe and what to do next.
31. As a Customer needing help, I want Talk to Alphaa within one tap at search, results, fare confirmation, Traveller entry, payment, and verification with trip context but never names, emails, phones, passports, or payment data, so that specialists see my trip without seeing my private data.
32. As a Customer on a small screen, I want filters and sort in a bottom sheet with large targets and a sticky result-count action, so that refinement is thumb-friendly.
33. As a keyboard user, I want full combobox semantics on airport fields, visible focus on every control, inline errors next to fields, and focus moved to the first error on submit, so that the whole journey works without a pointer.
34. As a screen-reader user, I want polite live regions for progress, counts, and validation, semantic headings in order, and decorative icons hidden, so that I hear what sighted users see.
35. As a Customer on a slow connection, I want deferred list rendering, transitions that keep input responsive, skeletons matching final layout, and no layout shift on images and fonts, so that the page stays usable while results reconcile.
36. As Alphaa operations, I want analytics for search started and completed, Flight Offer selected, price changed, checkout started, payment initiated and completed, confirmation viewed, and support clicks carrying only trip type, cabin, route class, and counts, so that funnels stay measurable without sensitive payloads.
37. As Alphaa marketing, I want only the clean flights entry indexed with canonical, OpenGraph, and structured data while every dynamic result URL stays noindex with canonical back to the entry, so that no thin per-route page pollutes search.

## Implementation Decisions

- Modules to build or modify: the flight domain module (validation union over trip types, request mapper, airport cache and dedup, normalization, price-confirmation machine, session-backed offer storage, trip-aware support links); the shared search URL contract (builder, parser, leg blob codec, filter and sort codec); the flights page shell and client (URL hydration, auto-search gating that ignores filter keys, domestic versus international routing, progress and error states); the search form plus leg editor plus airport autocomplete; the international results list; the domestic streaming hook plus proxy plus progressive results; the offer card; the filter and sort controls plus filtered-offers state; the fare-confirmation step; the Traveller entry step; the payment creation step; the payment verification step.
- The trip-type discriminated union remains the single domain source of truth; the flat form adapter delegates to it and forwards branch issues with paths so there is exactly one rule source.
- Currency stays NGN-only in v1; display forces NGN even if the backend echoes another code, with conversion owned server-side.
- Auto-detection of domestic versus international stays both-Nigerian with no manual toggle in v1; the backend remains the authority for classification while the client routes the fetch.
- Airport autocomplete keeps the 2-character minimum, debounce, module-level result cache plus in-flight dedup, versioned recent store, opposite-route exclusion, and selection-object requirement with no free-text bypass; add request cancellation plus a run guard so stale responses never commit, and debounce the raw input rather than an already-deferred value.
- URL hydration enriches light airport entries to full city and name via the airport lookup with graceful fallback to the bare code; validation still gates auto-search and invalid or partial URL state never triggers a fetch.
- International search sends an explicit bounded result limit supported by the backend contract and aborts in-flight requests on superseding searches and unmount.
- Normalization covers all itineraries so round-trip and multi-city cards can expand a journey timeline; unknown display fields keep their defensive pass-through behavior in filters so missing data never hides a bookable option or crashes.
- Filter and sort stay client-side over accumulated cards including mid-stream arrivals with no refetch; price and duration ceilings derive from live results while retaining the existing preset labels as shortcuts.
- Domestic streaming keeps the verbatim server-sent-events pipe with no caching, AbortController lifecycle, terminal done handling with search reference capture, timeout, and blocking fallback on stream error or timeout only (never on clean completion or user abort); card appends stay in transitions.
- Fare confirmation keeps the dedicated distraction-free checkout step with same, changed, and expired branches; Domestic Flight Cards take an explicit domestic branch that does not submit card fields as an opaque Amadeus blob.
- Pending Booking creation keeps the single-flight guard with disabled actions and reference persistence, reusing the stored pending reference for identical Confirmed Offer plus party retries.
- Verification stays uncached and reference-only, resolving paid (including airline-confirmed), pending, cancelled, and failed with the PNR rendered only when non-empty and payment-safety copy on failure.
- Homepage search widget is frozen; all result rendering stays on the flights experience and no opaque fare data, tokens, passports, payment data, or personal contact details enter URLs or analytics.
- Accessibility follows the project Web Interface Guidelines: labelled controls with autocomplete and meaningful names, inline errors with focus management, polite live regions, visible focus, sufficient touch targets, sheet containment, and reduced-motion support.
- Performance follows the project React performance rules: dynamic imports for heavy result components, deferred values and transitions for list reconciliation, memoized selectors, immutable sorts, Map-based accumulation, content-visibility for long lists, and transform and opacity only for animation.
- Confirmed developer clarifications reflected here: no live backend testing in this effort (code-level verification via typecheck, build, and the agreed test seams only); flights page direction is stepper plus collapsible form with the homepage untouched; domestic v1 shows an Economy-only notice and disables cabin and stop controls with explanation.

## Testing Decisions

- A good test asserts external behavior at the seam (parse this URL, validate this payload, map to this request, normalize this card, filter and sort these displays, resolve this price outcome, trigger fallback on this stream reason) without locking implementation details such as component markup, hook internals, debounce timers, or stylesheet classes.
- Seam 1 (existing, highest): shared search URL contract plus trip validation — builder and parser round-trips for one-way, round-trip, and multi-city including the legs blob; invalid and partial URL state parsing to not-valid and never auto-searching; discriminated-union acceptance and rejection including distinct airports, future dates, return on or after departure, chronological multi-city chain with leg-count bounds, and party composition rules; request mapping to the legs contract including outbound-plus-return construction and global cabin fan-out plus the explicit result limit.
- Seam 2 (existing, pure): display selectors — normalization of international offers and domestic cards across shape variants including multi-itinerary offers and missing fields; single-pass filtering and immutable sorting including unparseable values sinking without crashing; filter and sort URL codec round-trips with invalid values dropped; price-confirmation machine across same, changed, and expired plus expiry-error classification; streaming fallback trigger on error and timeout only.
- Page abort, collapse, progress, and empty-state behaviors are verified as integration behavior through Seam 1 URL and payload assertions, not through a new seam.
- Prior art: the existing behavior-level suites for search URL round-trips, trip-type validation, traveller composition, price confirmation outcomes, filter and sort selectors, booking duplicate guard, domestic streaming fallback, verification guards, autocomplete debounce and cache and recent behavior, and home submit navigation.

## Out of Scope

- Any change to the homepage search widget visuals, copy, or analytics.
- Backend schema, migration, endpoint, pricing, markup, or airline-coverage changes.
- Live backend testing, load testing, or sandbox payment runs in this effort.
- Hotel, car rental, package, visa, account, order-history, and post-booking change or cancellation flows.
- Manual domestic versus international toggle, mixed-cabin per-leg selection UI, and multi-currency display.
- Full visual rebrand, new design system adoption, framework or styling-library migration.
- Custom 404, cookie consent, legal pages, and marketing site work beyond the existing flights entry SEO.

## Further Notes

- Domain vocabulary follows the project glossary: Guest Booking, Assisted Service, Traveller, Customer, Booking, Flight Offer, Confirmed Offer, Pending Booking, PNR, Payment Reference, Domestic Flight Card. Avoided synonyms from the glossary (passenger, ticket holder, deal, ticket, order, transaction) are not used for these concepts in this spec.
- Area decisions respected: domestic auto-routing with streaming proxy and no manual toggle plus NGN-only currency; checkout as a distraction-free shell with session-backed opaque blobs never in URLs; dynamic result URLs canonicalized and not indexed.
- Context7 documentation lookup was attempted for current framework patterns but the lookup service was unreachable in this environment; framework behavior above follows the repo's established patterns and the fetched Web Interface Guidelines instead.
- No file paths or code snippets are included intentionally so the spec does not rot as the tree evolves; implementers should locate the existing seams by their behavior names above.
