# Production hardening

**Status:** ready-for-agent

## Problem Statement

The platform is functionally complete and verified by a clean typecheck, a clean production build and a passing suite, but it is not yet safe to put in front of paying customers. Four classes of gap stand between today's state and a launch: a framework version shipping a critical remote-code-execution advisory; a path where backend-supplied editorial and listing strings are written into the page without escaping; a brand colour that fails contrast on every primary call to action; and browser-side Hotel, Car, Visa and package calls that depend on a backend CORS setting the integration guide says will be locked to the production frontend domain before launch.

Alongside those: a failed render anywhere in a booking flow ends the Customer at a raw framework error page, a failed booking leaves no trace a human can find, a Traveller's passport details sit in browser storage, and every backend request can wait indefinitely. Underneath, the Hotel and Car modules grew as parallel copies of the same logic, so the money path is maintained in triplicate.

From the user's perspective: a Customer can click a link that 404s; a Customer who books a Hotel or Vehicle can have a payment succeed and a booking fail for reasons nobody can see; a Traveller's passport details are held by the browser longer than the flow needs; an engineer cannot tell a broken funnel from a quiet one.

## Solution

Close every launch-blocking gap at the highest seam available, then collapse the duplication that made the money path hard to reason about.

Patch the dependency. Give the site exactly one way to write structured data into a page and make that way unbreakable. Bring the brand tokens to AA so every existing usage becomes compliant without per-component patches. Give every backend call a deadline and an honest timeout failure. Move browser-side Hotel, Car, Visa and package mutations behind the same-origin seam the flight flow already uses. Add error boundaries so a failure is a designed screen, and one error reporter so the failure is visible. Keep passport data out of browser storage by storing a digest for reuse instead of the payload. Collapse the Hotel and Car twins into shared modules, one shared guest booking form, and one payment verification seam.

From the user's perspective: every booking type completes from the deployed origin no matter how the backend's CORS is configured; a failure mid-checkout shows Alphaa's own recovery screen with retry and specialist escalation; a broken funnel is visible within minutes; a Traveller's passport data exists only in the form they typed it into; every primary button and link is readable; and a maintainer changes booking verification once instead of three times.

## User Stories

1. As a Customer, I want every booking type to complete from the deployed site, so that my payment is never taken for a booking the site cannot finish.
2. As a Customer booking a Hotel, I want the stay confirmed without depending on a browser cross-origin request, so that a CORS policy cannot break my booking.
3. As a Customer hiring a Vehicle, I want the hire created and verified the same way a flight booking is, so that all booking types behave consistently.
4. As a Customer submitting an Enquiry or a Visa Consultation, I want the form to submit from the site's own origin, so that my details are not blocked by someone else's policy.
5. As a security reviewer, I want the platform free of known critical dependency advisories, so that we are not shipping a remote-code-execution path.
6. As an engineer, I want a dependency patch to be a version bump plus a build, so that patching stays routine.
7. As a Customer reading a Post, I want editorial content to render as published, so that I can trust what I read.
8. As a content editor, I want backend-supplied titles and descriptions to be incapable of executing in a visitor's browser, so that a content mistake cannot become an incident.
9. As an engineer, I want one way to emit structured data, so that the escaping rule is enforced once rather than at every call site.
10. As a Customer with low vision, I want primary buttons and links to meet contrast requirements, so that I can read and find the main action.
11. As a Customer using a screen reader on the Flights results page, I want a real page heading and announced filter state, so that I know where I am and what I have selected.
12. As a keyboard-only Customer, I want the Package gallery to open as a real dialog with focus trapped and returned, so that I can view photos without losing my place.
13. As a keyboard-only Customer, I want focus visible on every flight filter and sort control, so that I can see where I am.
14. As a screen-reader Customer, I want a changed fare announced, so that I know my booking did not silently change price.
15. As a Customer on a phone, I want steppers and filter controls large enough to hit, so that I can complete forms without mis-taps.
16. As a Customer mid-checkout, I want a failure to show an Alphaa screen with a retry and a WhatsApp option, so that I never see a framework error page.
17. As a Customer whose booking failed, I want to be told nothing was charged and what to do next, so that I am not left guessing about my money.
18. As an engineer, I want client and server failures reported in one place, so that I learn about failures before Customers report them.
19. As an operator, I want a health probe, so that a deployment problem is distinguishable from an application problem.
20. As an engineer, I want every backend call to have a deadline, so that one slow upstream response cannot hold a request open indefinitely.
21. As a Traveller, I want my passport details to exist only in the form I typed them into, so that they are not left behind in the browser after I book.
22. As a Traveller returning to an unfinished checkout, I want my party and itinerary restored, so that I do not retype everything.
23. As a Customer on a shared device, I want an unfinished draft cleared when the tab closes, so that the next person does not see my details.
24. As a Customer, I want links to lead to pages that exist, so that I never click a dead end.
25. As a Customer at a decision point, I want to reach an assisted specialist in one click, so that help is never far away.
26. As an engineer, I want one payment verification seam, so that a fix to pending or failed handling lands once for every booking type.
27. As an engineer, I want one guest booking form serving Hotel and Car, so that a validation fix is never applied to only one of them.
28. As an engineer, I want Hotel and Car to share parameter, session and pagination logic, so that a change to listing behaviour lands once.
29. As an engineer, I want the API boundary tested as behaviour rather than as source text, so that a refactor cannot pass while the behaviour is broken.
30. As a Customer, I want superseded searches abandoned as I type, so that rapid filtering does not hold up the results I am waiting for.
31. As a Customer on a slow connection, I want Hotel and Vehicle inventory present in the first response, so that I can browse without waiting for the page to wake up.
32. As a Customer, I want the price I browse to match the price I pay, so that a stale from-price never surprises me at checkout.

## Implementation Decisions

- The dependency is patched to the advisory's patched floor as a version bump alone; no wider upgrade is taken on.
- One shared renderer becomes the only sanctioned way to emit structured data into a page. It escapes every character that can terminate a script context, and no call site carries escaping logic of its own.
- Brand tokens are the single lever for the contrast pass: the primary token changes once, and muted foreground, secondary placeholders and the positive call to action are corrected so every existing usage becomes compliant without per-component edits.
- The three existing module boundaries — backend boundary, booking persistence, booking verification — become the only new test surfaces. No test framework, DOM harness or runtime dependency is added.
- Interactive accessibility is verified by extracting the interactive decision (what state a control is in, what should be announced) into pure functions the seam tests cover, plus a documented manual keyboard and screen-reader pass. Nothing is rendered in tests.
- Same-origin seam: Hotel, Car, Visa and package mutations and verifications route through site-owned handlers shaped exactly like the existing flight and payment handlers, so no browser call names the backend host. The origin the backend will lock CORS to is confirmed with the backend as an external dependency before launch, never assumed.
- Error boundaries sit at every route group plus a global boundary, and render the existing error-state and retry vocabulary so a failure screen matches the rest of the interface. Raw backend messages, field dumps and stack traces never reach a Customer.
- One error reporter receives both client and server failures, tagged with the flow and, where safe, the booking reference — never with traveller or payment data.
- Passport data: booking reuse identity becomes a digest computed in the browser; the travellers draft holds only what the form needs and is cleared when the tab closes; the recovery behaviour is preserved by restoring non-sensitive fields.
- The Hotel and Car consolidation follows expand, migrate, contract. Shared parameter, booking-session and pagination modules are added beside the existing code; each domain migrates in its own ticket with the suite green throughout; duplicated helpers are deleted only once both migrations land.
- One payment verification seam owns the read policy (never cached), the status vocabulary, the settle retry and the analytics emission, so each booking type's client delegates rather than re-implementing.
- One guest booking form takes booking-specific creation, reuse and payload construction as inputs, so the phase machine, field map, validation and error handling exist once.
- Production guardrails: security headers are set once for the whole site; development-only image hosts are enabled only outside production; a deployment whose site or backend URL is malformed or points at localhost fails loudly instead of silently falling back to production defaults; long-running handlers declare a duration budget that covers their own client waits plus a margin.
- Analytics emits a state change once per occurrence: confirmation events are guarded against re-firing on retry or back navigation, and one page view is recorded per load regardless of how many tag managers are configured.
- Sign In entry points are removed rather than disabled, because a control that cannot work is a dead end. Guest Booking and the emailed order links are unaffected.

## Testing Decisions

- A good test asserts external behaviour through a module interface — what a request looked like, what was stored, what state a booking resolved to — never source text or implementation shape. The existing habit of asserting against source text is retired for every path these tickets touch.
- **Seam 1, backend boundary.** The API client and each same-origin handler are exercised against a stubbed fetch. Asserted: path, query and headers; same-origin versus absolute URL construction; deadline propagation; error-to-message mapping; un-cached reads; abort behaviour answering 499.
- **Seam 2, booking persistence.** Asserted: reuse identity (an unchanged booking reuses, any change starts new), that stored values are digests rather than traveller data, and that teardown clears state. Storage that fails validation yields "no pending booking" rather than a crash.
- **Seam 3, booking verification.** Asserted per booking type: the terminal and pending vocabulary, unknown states resolving conservatively, no trust placed in a return redirect, and reads that are never cached.
- Interactive accessibility is tested at the level of the extracted decision — pressed state, announcement text, dialog open and close transitions — plus a documented manual pass.
- Modules under test: the backend client and handlers, the booking session store, the verification seam, the shared listing parameter and pagination modules, the shared guest form's validation and phase transitions, and the structured-data renderer.
- Prior art: the existing pure-helper suites (env resolution, blog sanitisation, verification state mapping, URL round-trips, analytics sanitisation) already run under the project's zero-dependency Node test runner. New tests follow that style and run in the same command.

## Out of Scope

- All SEO and discovery work: sitemap, robots, metadata completeness, social cards, structured-data graph quality, and backend SEO configuration. Explicitly deferred.
- Anything the current PRD requires that the code does not implement. The PRD is treated as outdated and is not a source of truth for this work.
- The accounts feature itself — registration, sign-in, password reset, profile, booking history behind an account. Only the dead entry points are retired.
- Payment behaviour, pricing and the Paystack redirect beyond the verification seam and request deadlines. The backend remains authoritative for all totals.
- Any change to flight search, fare confirmation or traveller form behaviour beyond the timeout and verification seams.
- Visual redesign of any page.

## Further Notes

- Two decisions are external and must be confirmed with the backend before launch: the origin CORS will be locked to, and the production frontend origin the backend uses for emailed order links.
- The backend API integration guide is the source of truth for the same-origin handler shapes; the flight and payment handlers already in place are the pattern to mirror.
- Where an accessibility fix and a contrast fix touch the same token, the token change lands first so the component fix stays minimal.
- Findings this work does not address, all inside the deferred SEO scope: placeholder contact values published in structured data, share-URL social metadata, and post view-count semantics.
- The Hotel and Car modules carry the bulk of the duplication; collapsing them is deliberately sequenced as expand, migrate, contract so the suite stays green at every step.