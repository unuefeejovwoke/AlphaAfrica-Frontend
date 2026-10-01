# 13 — Hotels migrate onto the shared modules

**What to build:** The Hotel module uses the shared listing, session and pagination logic instead of its own copy, with identical behaviour and a green suite.

**Blocked by:** 12 — Expand: shared listing, booking-session and pagination modules.

**Status:** ready-for-agent

- [ ] Hotel listing, search, featured, slug-listing and pagination paths call the shared modules
- [ ] Hotel pending-booking storage uses the shared session helper
- [ ] The Hotel suite passes, including filter round-trip, pagination-range and pending-reuse tests
- [ ] The duplicated Hotel helpers are no longer referenced by any call site
- [ ] No behaviour change is observable by a Customer: same results, same copy, same URLs