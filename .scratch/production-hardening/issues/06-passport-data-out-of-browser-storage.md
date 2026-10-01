# 06 — Passport data never touches browser storage

**What to build:** A Traveller's passport number, expiry, date of birth and contact details exist only in the form they typed them into. An unfinished booking can still be recognised and resumed, without keeping passport data in readable form.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Reuse identity for a Pending Booking is stored as a digest; no readable traveller payload is persisted anywhere in the browser
- [ ] The travellers draft holds no passport number, expiry, date of birth or contact details, and recovery restores everything else — party, itinerary, cabin
- [ ] The draft is cleared when the tab closes and when the flow completes, in addition to the existing teardown
- [ ] Private-mode storage failures still degrade gracefully: no throw, flow continues
- [ ] Reading storage that fails validation yields "no pending booking" rather than a crash
- [ ] Storage contents are asserted at the booking persistence seam: digest present, traveller data absent
- [ ] Existing pending-booking reuse and teardown suites pass against the digest