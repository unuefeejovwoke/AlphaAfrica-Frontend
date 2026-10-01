# 14 — Cars migrate onto the shared modules

**What to build:** The Car module uses the same shared logic instead of its own copy, with identical behaviour and a green suite.

**Blocked by:** 12 — Expand: shared listing, booking-session and pagination modules.

**Status:** ready-for-agent

- [ ] Car listing, search, featured, slug-listing and pagination paths call the shared modules
- [ ] Car pending-booking storage uses the shared session helper
- [ ] The Car suite passes, including filter validation, pagination-range and pending-reuse tests
- [ ] The duplicated Car helpers are no longer referenced by any call site
- [ ] No behaviour change is observable by a Customer: same results, same copy, same URLs