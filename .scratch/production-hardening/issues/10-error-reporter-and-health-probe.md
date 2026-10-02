# 10 — One error reporter and a health probe

**What to build:** When a booking or search fails in production, an engineer finds out from the error reporter rather than from a Customer — and a deployment problem stays distinguishable from an application problem.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] Client and server failures reach one reporter, tagged with the flow and, where safe, the booking reference
- [x] Reports never contain passport data, contact details, tokens, or the opaque fare blob
- [x] Repeated identical failures are deduplicated or sampled so a burst does not flood the reporter
- [x] A health probe answers without touching the backend and reports configuration validity separately from liveness
- [x] The reporter is inert when its identifier is blank, so local and preview runs stay silent
- [x] Reporter initialisation does not delay first paint or hydration
- [x] Reporter payload sanitisation is covered by the existing analytics sanitisation seam tests
## Comments

Verified 2026-10-02: implementation present in tree; typecheck green; targeted seam suites green.
