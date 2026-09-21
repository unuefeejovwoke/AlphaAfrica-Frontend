Status: ready-for-agent

# Specification: Phase 4 — Hotels

## Problem Statement

Travellers who need a place to stay — leisure travellers asking "show me where I can go and make the trip easy", first-time travellers afraid of an expensive mistake, families, business travellers who need efficiency, and high-intent customers who prefer human help — cannot today discover, compare, and pay for a Hotel without human back-and-forth. There is no hotel search with clear per-night pricing, no Hotel detail with gallery plus Room Type choice, no Guest Booking path that works without an account, and no confirmation that answers "did my booking succeed and is my money safe?" Every failure risks the visitor concluding Alphaa cannot help with this trip.

## Solution

A guest-first hotel journey with no account required: free-text Hotel search (city or hotel name, empty means browse-all) with stay dates and party carried in shareable URL state, server-side price/star/ordering filters plus client-side amenity refinement, Hotel cards showing from-price per night, an ISR Hotel detail with gallery, overview, location, amenities, Room Type selection with capacity guidance, and a sticky booking panel, a guided Hotel Guest and stay form with Nigerian phone normalization, Paystack redirect with single-flight duplicate protection, and reference-only verification rendering a premium Hotel Booking confirmation with reference, dates, nights, room, guests, amount, and payment state. Human help via WhatsApp and Talk to Alphaa stays one tap away at every decision point.

Ubiquitous language (CONTEXT.md): Hotel = sellable lodging property with city/country, star rating, amenities, from-price per night; Room Type = bookable room kind within a Hotel with per-night price, per-room guest capacity, and room count; Hotel Guest = single booking contact and stay representative captured as one full name, email, and phone; Hotel Booking = Hotel plus one Room Type plus dates, room/guest counts, and its Hotel Guest, paid via Paystack reference and verified to pending/confirmed/cancelled/failed; Guest Booking = reservation completed without account registration; Customer = paying contact (for guest hotel bookings, the same person as the Hotel Guest); Booking = confirmed reservation with verified reference; Payment Reference = Paystack identifier linking verification.

## User Stories

1. As a leisure traveller, I want to search Hotels by a single destination field matching city or hotel name, so that I find options without learning separate city-versus-hotel inputs.
2. As a casual browser, I want an empty destination search to return paginated browse-all results, so that discovery works before I know exactly where to stay.
3. As a date-flexible shopper, I want check-in and check-out optional at search time, so that I can explore Hotels before fixing dates.
4. As a date-committed shopper, I want partial dates rejected (both or neither) with check-out after check-in and neither in the past, so that impossible stays are caught before results.
5. As a family coordinator, I want guests and rooms adjustable with sensible defaults and minimums of one, so that party shape carries into booking as a hint.
6. As a sharer, I want the full search and filter state in the URL, so that back, refresh, and shared links restore exactly what I saw.
7. As a price-sensitive traveller, I want a maximum per-night price filter applied server-side, so that over-budget Hotels never appear.
8. As a comfort-seeking traveller, I want a minimum star-rating filter from one to five applied server-side, so that quality floor is guaranteed.
9. As a preference-driven traveller, I want amenity multi-select refinement over the result set, so that must-have amenities narrow options without a new search.
10. As a comparison shopper, I want ordering by price ascending and descending, star rating ascending and descending, and name, so that sorting matches my intent.
11. As a paginated browser, I want explicit page navigation over the result count, so that large inventories stay navigable.
12. As a scanner, I want every Hotel card to show image, Hotel name, city and country, star rating, key amenities, and from-price per night with a clear call to action, so that comparison is instant.
13. As a confused shopper on empty results, I want a composed empty state with clear next actions (widen dates, raise price cap, lower stars, talk to Alphaa), so that zero results never feel dead.
14. As a shopper on failure, I want a human message naming what happened with retry plus Talk to Alphaa, so that I know what to do next.
15. As a detail-oriented traveller, I want a Hotel detail with gallery, overview, location, full amenities, Room Type list with pricing, and sticky booking panel, so that one page answers "can Alphaa help with this stay?".
16. As a visual evaluator, I want gallery images with descriptive alt text and a readable main image, so that the property feels real before I pay.
17. As a locationchecker, I want city, address, country, and coordinates shown as display-only place context with a map link when coordinates exist, so that I judge suitability without a fake radius filter.
18. As a Room Type chooser, I want exactly one Room Type selectable per Hotel Booking via a clear radio choice showing name, description, per-night price, per-room capacity, and room count, so that the booking maps to one backend reservation.
19. As a family of five eyeing a two-guest room, I want an inline capacity message telling me to add rooms or choose another Room Type, so that over-capacity is fixed before payment.
20. As a guest encountering a zero-capacity data row, I want booking to continue without a false block, so that bad data never strands a legitimate stay.
21. As a date changer, I want nights and preview totals to re-derive while keeping my Room Type choice, so that editing dates does not force re-selection.
22. As a price reader, I want card copy locked as from-price per night, Room Type copy as per-night price, and the booking summary as nights times price times rooms with the charged total taken only from the backend, so that what I pay is unambiguous.
23. As a Hotel Guest booking without an account, I want to complete search, Room Type choice, guest details, payment, and confirmation with no registration gate, so that account creation never blocks booking.
24. As a Hotel Guest, I want a single full-name field plus email plus phone (Nigerian formats accepted and normalized), so that contact entry matches the backend guest shape with minimal typing.
25. As a mobile guest, I want steppers for rooms and guests, mobile-optimized date pickers, large tap targets, and a sticky booking summary, so that booking is thumb-friendly.
26. As a cautious payer, I want submit and pay actions disabled while the reservation is being created with double-tap duplicates prevented and the Payment Reference persisted, so that double charges cannot happen.
27. As a payer redirected to Paystack, I want to return to an explicit verifying state (do not close yet) that never assumes return means success, so that I wait rather than re-pay.
28. As a verified guest, I want a premium confirmation showing Hotel Booking reference, Hotel and Room Type names, check-in and check-out, nights, rooms, guests, per-night price, total amount, payment state, and next steps, so that success is certain.
29. As a guest whose Hotel Booking was not completed, I want to know whether payment is safe, keep my Payment Reference, and reach support, so that deducted funds can be reconciled.
30. As a returning guest, I want view booking, download or share confirmation, and contact Alphaa from the confirmation, plus an account nudge only after success, so that post-payment tasks close the loop without pre-booking friction.
31. As an anxious traveller at any step, I want a support escape hatch such as need help choosing and Talk to Alphaa with stay context carried into WhatsApp, so that human assistance is always close.
32. As a keyboard and screen-reader user, I want labelled controls, visible focus, accessible form errors, accessible dialogs and bottom-sheet filters, proper button semantics, and announced loading states, so that the full journey is operable without mouse or hover.
33. As a search-engine visitor, I want indexable Hotel listing and Hotel detail pages each with unique title, meta description, canonical URL, heading hierarchy, Open Graph data, structured Hotel data, and crawlable internal links, so that stays are discoverable (dynamic search result combinations themselves are not indexed).
34. As an AI-search reader, I want factual Hotel content with clear entity relationships (Hotel, place, Room Type, price, amenities), so that generative engines quote Alphaa accurately.
35. As a performance-sensitive visitor on a slow connection, I want optimized images with lazy loading below the fold, skeletons matching final layout, parallel detail fetches, no blocking decoration, and cached stable Hotel content, so that the journey feels fast.
36. As a product owner, I want analytics for hotel search, Hotel viewed, Hotel Booking started, payment initiated and completed, confirmation viewed, and support clicks without any passport, payment, password, or token data captured, so that conversion is measurable without leaking sensitivity.

## Implementation Decisions

- Search semantics are free-text and forgiving in v1: one destination input partial-matches city or hotel name server-side with empty meaning browse-all paginated; there is no autocomplete index and no split city-versus-hotel inputs; dates are optional at search but when either is present both become required with real calendar validation, check-out strictly after check-in, and neither in the past; guests and rooms default sensibly with minimums of one and travel in URL state as booking hints rather than hard availability gates, because the backend validates dates but returns all active Hotels regardless.
- Filtering is split by capability: maximum per-night price, minimum stars, ordering, destination, party hints, and pagination are server query parameters reflected in the URL; amenities refinement is client-side over the fetched page; location is display-only place context in v1 with no radius or geo-query behavior.
- Pricing display is locked by copy contract: cards show from-price per night derived from the lowest Room Type; each Room Type shows its per-night price; the booking panel shows nights times per-night price times rooms as a preview while the only chargeable total is the backend-computed amount returned at creation and verification.
- Room selection is exactly one Room Type per Hotel Booking with capacity enforced as guests at most per-room capacity times rooms; zero-capacity rows are treated as unknown and never block; property room counts are informational display only and never frontend inventory blocks, with the backend owning availability at creation time; changing dates preserves the chosen Room Type while re-deriving nights and preview.
- There is no flight-style fare revalidation step: reservation creation is the quote, returning a Paystack authorization URL and Payment Reference, followed by external redirect and reference-only verification that must never be cached; verification resolves pending, confirmed, cancelled, and failed with reassurance copy and reference retention on failure.
- Routing and caching are hybrid: the Hotel listing is fully dynamic with no static pre-rendering and opt-out caching since every query combination is request-time state; the Hotel detail is statically pre-rendered for known slugs with hourly revalidation and open-ended fallback for new slugs, carrying a prices-confirmed-at-booking caveat against stale from-prices.
- Forms follow the guided on-blur plus on-submit plus pre-payment validation stance with human-readable errors and mapped backend field errors; email, Nigerian and international phone (normalized before submission), future stay dates, and counter minimums reuse the shared validation primitives; submission uses a single-flight guard with disabled actions and reference persistence across retries.
- The HTTP integration is centralized with no scattered request logic in pages: stable Hotel detail reads use timed revalidation while search, creation, and verification opt out of caching entirely; all failures map to customer-safe copy plus payment-safety reassurance; responses are treated as untrusted and revalidated even after client validation passes; no tokens, payment data, or passwords are logged, placed in URLs, or captured in analytics.
- Shell and conversion behavior: discovery and detail use the full public shell with navigation and persistent support entry; the guest-details and verification steps use the distraction-free checkout shell; every service surface ends with one obvious primary action plus a Talk to Alphaa escape; account encouragement appears only after successful Guest Booking.
- Discoverability and performance: Hotel listing and detail pages carry unique metadata, canonical links, alt text, Open Graph, and structured Hotel markup with crawlable links; images lazy-load below the fold with priority on hero; independent detail fetches parallelize; heavy gallery behavior loads on demand; filter updates keep input responsive via transitions and deferred values.
- Prior architectural decisions respected: form validation through the shared resolver approach; marketing-content revalidation cadence for stable Hotel detail; no manual domestic-versus-international style toggle (single free-text destination instead); bundled version-matched framework docs govern fetch caching and static-params behavior where remote documentation was unreachable.

## Testing Decisions

- A good test verifies external behavior through public boundaries with independent literal expectations, survives refactors without reaching into internals, and advances in vertical tracer slices of one failing test then minimal implementation rather than bulk horizontal tests.
- Seams under test, pre-agreed during grilling with no new seams proposed (existing shared seams preferred; new hotel seams proposed at the highest pure point): hotel search query validation covering destination trimming, date-pair rules, counter minimums, price and star bounds, and ordering values; capacity rule covering exact-fit, over-capacity, multi-room scaling, and zero-capacity passthrough; nights calculation plus preview-total arithmetic covering same-day rejection, multi-night spans, and room multipliers; Hotel and Room Type normalization plus display mapping covering missing images, empty amenities, and price fallbacks; booking payload building covering full-name shape, email validity, and Nigerian phone normalization.
- Prior art is the existing behavior-level suite covering foundations, listings with search-param round-trips and featured sorting and image resolution and JSON-LD, routes, checkout showcase, forms, feedback, navigation, support, and tokens, plus the flight suite covering search validation, price confirmation, traveller validation, filter and sort selectors, and verification guards; hotel tests mirror that shape with typecheck and production build passing and keyboard, focus, contrast, and ARIA checks on search, filters, room radios, date pickers, and guest forms.

## Out of Scope

- Flight search detail and booking, car rental booking, package and visa flows beyond the shared support hatch, authentication and account history, and post-booking change or cancellation flows.
- Multi-room-type splitting within one reservation, live inventory holds, per-night seasonal price calendars, multi-currency selection, and backend availability or markup-policy changes.
- End-to-end live Paystack redirect tests in v1; contract and seam tests cover creation and verification instead.
- CMS, real payment secrets, content management, thin indexed pages for every query combination, and any fabricated reviews, numbers, partnerships, certifications, or claims.

## Further Notes

- Context7 remote documentation was unreachable at spec time (resolution failed repeatedly); the spec grounds framework behavior in the bundled version-matched framework docs (server fetch caching with opt-out semantics, static-params pre-rendering with open-ended fallback, async dynamic params) plus the backend API contract and existing decisions.
- Applicable performance guidance: parallelize independent fetches, stream detail behind suspense with skeletons, defer third-party analytics until after hydration, load heavy gallery behavior on demand, and keep filter subscriptions narrow with transitions for non-urgent updates.
- The capacity rule and the no-revalidation booking shape are the two decisions most likely to be revisited once real booking rejection data arrives; the spec keeps both as pure seams so behavior can change without reshaping the journey.
