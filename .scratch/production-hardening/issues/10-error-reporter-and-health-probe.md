# 10 — One error reporter and a health probe

**What to build:** When a booking or search fails in production, an engineer finds out from the error reporter rather than from a Customer — and a deployment problem stays distinguishable from an application problem.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Client and server failures reach one reporter, tagged with the flow and, where safe, the booking reference
- [ ] Reports never contain passport data, contact details, tokens, or the opaque fare blob
- [ ] Repeated identical failures are deduplicated or sampled so a burst does not flood the reporter
- [ ] A health probe answers without touching the backend and reports configuration validity separately from liveness
- [ ] The reporter is inert when its identifier is blank, so local and preview runs stay silent
- [ ] Reporter initialisation does not delay first paint or hydration
- [ ] Reporter payload sanitisation is covered by the existing analytics sanitisation seam tests