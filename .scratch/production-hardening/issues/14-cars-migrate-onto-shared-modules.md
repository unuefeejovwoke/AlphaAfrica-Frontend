# 14 — Cars migrate onto the shared modules

**What to build:** The Car module uses the same shared logic instead of its own copy, with identical behaviour and a green suite.

**Blocked by:** 12 — Expand: shared listing, booking-session and pagination modules.

**Status:** ready-for-human

- [x] Car listing, search, featured, slug-listing and pagination paths call the shared modules
- [x] Car pending-booking storage uses the shared session helper
- [x] The Car suite passes, including filter validation, pagination-range and pending-reuse tests
- [x] The duplicated Car helpers are no longer referenced by any call site
- [x] No behaviour change is observable by a Customer: same results, same copy, same URLs
## Comments

Verified 2026-10-02: implementation present in tree; typecheck green; targeted seam suites green.
