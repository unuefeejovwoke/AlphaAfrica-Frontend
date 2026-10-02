# 06 — Passport data never touches browser storage

**What to build:** A Traveller's passport number, expiry, date of birth and contact details exist only in the form they typed them into. An unfinished booking can still be recognised and resumed, without keeping passport data in readable form.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] Reuse identity for a Pending Booking is stored as a digest; no readable traveller payload is persisted anywhere in the browser
- [x] The travellers draft holds no passport number, expiry, date of birth or contact details, and recovery restores everything else — party, itinerary, cabin
- [x] The draft is cleared when the tab closes and when the flow completes, in addition to the existing teardown
- [x] Private-mode storage failures still degrade gracefully: no throw, flow continues
- [x] Reading storage that fails validation yields "no pending booking" rather than a crash
- [x] Storage contents are asserted at the booking persistence seam: digest present, traveller data absent
- [x] Existing pending-booking reuse and teardown suites pass against the digest
## Comments

Verified 2026-10-02: implementation present in tree; typecheck green; targeted seam suites green.
