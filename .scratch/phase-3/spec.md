Status: ready-for-agent

# Specification: Phase 3 — Flights

## Problem Statement

Travellers who need flights — first-time international travellers afraid of an expensive mistake, families, students, business travellers who need efficiency — cannot today search, compare, pay for, and confirm a flight without human back-and-forth. Domestic searches take 30–60 seconds and feel broken with a blank spinner; international fares change between search and payment without explanation; traveller forms ask for unclear documents; and returning from payment leaves the question "did my booking succeed and is my money safe?" unanswered.

## Solution

A guest-first flight journey with no account required: trip-type search (one-way, round-trip, multi-city) with airport autocomplete, progressive streamed domestic results and full international offers, live client-side filter and sort, a dedicated fare-confirmation step that transparently handles airline price changes, guided traveller and contact entry, Paystack redirect with idempotent verification, and a premium confirmation showing the Booking with its PNR and Payment Reference plus recovery paths. Human help via WhatsApp or Talk to Alphaa stays one tap away at every decision point.

Ubiquitous language (CONTEXT.md): Flight Offer = raw selectable search result with opaque fare blob; Confirmed Offer = Flight Offer with live fare revalidated; Pending Booking = Confirmed Offer plus Travellers and Customer contact submitted for payment; Booking = confirmed reservation with verified reference; PNR = airline order reference created only after payment verification; Payment Reference = Paystack identifier linking verification; Domestic Flight Card = normalized QuickAir result without opaque blob; Traveller = individual flying; Customer = paying contact; Guest Booking = no account required.

## User Stories

1. As a leisure traveller, I want to search one-way flights by origin, destination, date, party, and cabin, so that I can see bookable options fast.
2. As a business traveller, I want round-trip search with return date validated after departure, so that I book efficient work trips without date errors.
3. As a family coordinator, I want multi-city search from 2 up to 6 legs with add and remove, so that complex itineraries are expressible without a separate enquiry.
4. As a first-time traveller, I want airport autocomplete from IATA code, city, or airport name with at least 2 characters, so that I never type a free-text airport that fails later.
5. As a mobile traveller, I want debounced autocomplete with cached results and recent searches, so that typing on a slow connection stays responsive.
6. As a domestic traveller, I want progressive results with honest progress copy such as Finding available flights and airlines being checked, so that a 30–60 second search feels alive rather than broken.
7. As a domestic traveller, I want results to appear as airlines respond with a clear completion state and search identifier retained for support, so that I trust partial results.
8. As a traveller on a failed search, I want a human message such as we could not find flights right now with retry and Talk to Alphaa actions, so that I know what to do next.
9. As a price-sensitive traveller, I want to filter by price, duration, stops, departure time, airline, and cabin, so that I narrow hundreds of options without a new search.
10. As a traveller, I want to sort by recommended, cheapest, fastest, and earliest departure, so that comparison matches my intent.
11. As a mobile traveller, I want filters in a bottom sheet and a sticky summary with large tap targets, so that refining on a small screen is thumb-friendly.
12. As a traveller who selected a flight, I want a dedicated fare-confirmation step showing confirming live fare, so that I understand the pause before traveller entry.
13. As a traveller whose fare did not change, I want to proceed directly to traveller entry, so that unchanged fares add no friction.
14. As a traveller whose airline updated the fare, I want the previous amount, new amount, difference, and continue or cancel actions, so that I consent to the new price.
15. As a traveller whose offer expired, I want a clear re-search prompt plus Talk to Alphaa, so that a stale fare never silently becomes a booking.
16. As a Customer booking for others, I want per-Traveller entry of first name, last name, date of birth, gender, email, phone country code, phone, and Traveller type (adult, child, held infant), so that airline order creation succeeds.
17. As an international Traveller, I want passport number, expiry, and nationality requested only when relevant, so that domestic booking stays light.
18. As a Customer, I want contact name, email, and phone with contact-is-first-Traveller preselected, so that repeat typing is avoided.
19. As a Nigerian traveller, I want local formats such as 0803 numbers accepted and normalized before submission, so that valid numbers are never rejected.
20. As a parent, I want infant count constrained to adult count and total party capped at nine with readable errors, so that impossible parties are caught before payment.
21. As a cautious payer, I want a persistent trip and price summary showing fare, total, and currency in NGN, so that what I pay is unambiguous.
22. As a Guest Booking customer, I want to complete search, price confirmation, traveller entry, and payment without registering, so that account creation never blocks booking.
23. As a payer, I want submit and pay actions disabled while a transaction is being created with duplicate submissions prevented, so that double charges cannot happen from double taps.
24. As a payer redirected to Paystack, I want to return to a verification state such as confirming payment that never assumes return means success, so that I wait rather than re-pay.
25. As a verified customer, I want a premium confirmation with Booking reference, PNR where available, route, dates, Traveller summary, amount, payment state, and next steps, so that success is certain.
26. As a customer whose booking was not completed, I want to know whether payment is safe, keep my Payment Reference, and reach support, so that deducted funds can be reconciled.
27. As a returning customer, I want view booking, download or share confirmation, and contact Alphaa from the confirmation, so that post-payment tasks are closed loop.
28. As an anxious traveller at any step, I want a support escape hatch such as need help choosing, Talk to Alphaa, so that human assistance is always close.
29. As a keyboard and screen-reader user, I want labelled controls, visible focus, accessible errors, dialogs, date and party selectors, and announced loading states, so that the full journey is operable without a mouse or hover.
30. As a sharer, I want search state preserved across back navigation and refresh with shareable URL state, so that results are not lost.

## Implementation Decisions

- Search routing is auto-detected with no manual toggle in v1: when origin and destination are both Nigerian airports the journey uses the domestic streaming path, otherwise the international legs-based path. Requires a canonical Nigerian-airport list for detection. Currency is fixed to NGN in v1; the data model retains a currency value with NGN default.
- Trip types map to legs: one-way is one leg, round-trip is outbound plus return, multi-city is 2 to 6 legs starting at 2 with add up to 6 and remove down to 2 through a single reusable leg editor. Cabin is a single global selection applied to every leg in v1 while the contract stays per-leg capable for a future per-leg override.
- Search validation mirrors backend exactly: airports required via autocomplete selection with origin different from destination, real calendar dates never in the past, return on or after departure with chronological multi-city chain, adults 1 to 9, children and infants 0 to 9, total party at most 9, infants at most adults. Errors are human-readable on blur and on submit; raw backend errors are never rendered.
- Airport autocomplete requires at least 2 characters, debounced around 300ms, with request deduplication, result caching, and versioned recent searches kept minimal in local storage. Interactions stay in event handlers with non-urgent list updates deferred to keep input responsive.
- Domestic streaming goes through a dynamic non-cached streaming proxy that pipes the backend event stream verbatim to the client; the client reads progressively with abort support, renders cards as they arrive inside a suspense boundary with skeleton and progress copy, captures the terminal search identifier for support, and automatically falls back to the blocking domestic search on stream error or timeout. The proxy must never be statically cached since buffering breaks streaming.
- Filtering and sorting are client-side over accumulated results with no refetch: filters cover price, duration, stops, departure time, airline, and cabin; sorts cover recommended, cheapest, fastest, and earliest departure. Search state is the URL query state so back, refresh, and share preserve it; large lists use deferred values and transitions plus content-visibility friendly rendering with defensive handling of missing domestic fields.
- Price confirmation is a dedicated step in the distraction-free checkout shell: selecting a Flight Offer calls price revalidation and renders confirming live fare; an unchanged fare proceeds to Traveller entry; a changed fare shows the airline-updated-fare message with previous amount, new amount, difference, and continue or cancel; an expired offer shows re-search plus Talk to Alphaa. The opaque offer blob lives in memory with session-storage backup for refresh and back navigation and never appears in URLs.
- Traveller entry follows the Guided stance with forms validated on blur via a Zod resolver: international paths require passport number, expiry, and nationality while domestic paths hide them; date of birth hard-validates real past-or-present dates only with soft warnings for infant and child age bands rather than hard rejection; contact-is-first-Traveller is preselected with copy; Nigerian and international phones are accepted then normalized before submission. Counters reuse the shared composition rule of adults at least 1, total at most 9, infants at most adults.
- Payment follows validate, create Pending Booking, redirect to the returned authorization URL, return, verify idempotently without caching, fetch the final order, then render: creation uses a single-flight guard with disabled actions and reuses a pending reference for identical Confirmed Offer plus party retries instead of creating duplicates; the Payment Reference persists in both the return URL and session storage; verification determines paid, confirmed, failed, cancelled, and pending states with PNR shown only when the airline order exists; failure states answer what happened, whether payment is safe, and what to do next with reference retention and support actions.
- The HTTP integration layer is centralized with no scattered fetch logic in pages: server reads use timed revalidation for stable content while mutations and verification opt out of caching entirely so a stale pending snapshot can never mask completion; all failures map to customer-safe copy plus payment-safety reassurance; API responses are treated as untrusted input with server-side validation even when client validation passes and no tokens, passports, payment data, or passwords are logged or placed in analytics.
- Shell boundaries follow the route-group decision: discovery and results use the full public shell with navigation and floating support entry; price confirmation, Traveller entry, checkout, and verification use the distraction-free checkout shell with trust badges and minimal egress. Every major page ends with a clear next action and a support hatch.
- Discoverability: dynamic search and streamed results are not indexed; only a stable marketing entry for flights is indexable with unique title, meta description, canonical URL, heading hierarchy, image alt text, Open Graph data, structured data where appropriate, and crawlable internal links. Analytics cover search started and completed, flight selected, price changed, checkout started, payment initiated and completed, confirmation viewed, and support clicks without sensitive payload data.

## Testing Decisions

- A good test verifies external behavior through public boundaries with independent literal expectations, survives refactors without reaching into internals, and advances in vertical tracer slices of one failing test then minimal implementation rather than bulk horizontal tests.
- Seams under test, pre-agreed during grilling with no new seams proposed: search validation covering legs shape and party composition; price-confirmation machine covering same, changed, and expired branches; Traveller validation covering the international passport branch versus domestic; filter and sort selectors as pure functions over accumulated cards; payment verification covering idempotent completion and the single-flight duplicate guard.
- Prior art is the existing behavior-level suite covering foundations, listings, routes, checkout showcase, forms, feedback, navigation, support, and tokens, verified with typecheck and production build passing and keyboard, focus, contrast, and ARIA checks on forms, dialogs, and selectors.

## Out of Scope

- Hotel search detail and booking, car rental booking, package and visa flows beyond the shared support hatch, authentication and account history, and post-booking変更 flows.
- Multi-currency selection, per-leg cabin override UI, full six-leg itinerary pricing edge cases beyond the validated legs contract, and backend or markup-policy changes.
- End-to-end streaming and live Paystack redirect tests in v1; contract and seam tests cover streaming and verification instead.
- CMS, real payment secrets, content management, thin SEO pages for every route and date combination, and any fabricated testimonials, statistics, partnerships, or certifications.

## Further Notes

- Source of the canonical Nigerian-airport detection list and its refresh cadence still needs an owner; backend remains the authority for domestic versus international classification.
- Context7 sources consulted: Next.js streaming route-handler guidance for the SSE proxy shape and React Hook Form resolver guidance for on-blur Zod validation.
- Applicable performance guidance: parallelize independent fetches, stream behind suspense boundaries, defer third-party analytics until after hydration, import heavy result components dynamically, and keep client state subscriptions narrow with transitions for non-urgent filter updates.
- Payment reconciliation depends on the retained Payment Reference and terminal search identifier; support tooling should be able to locate both without customer-provided card or token data.
- Follow the route-group layout boundary, form-validation, and ISR decisions already recorded alongside the flight routing and streaming decision.
