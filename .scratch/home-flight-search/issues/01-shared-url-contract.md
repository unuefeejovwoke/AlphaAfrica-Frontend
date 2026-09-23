# 01 — Shared flight search URL contract

**What to build:** Home submit and the flights page read and write identical URL search state from one shared implementation, so a search started on home auto-searches correctly on the flights page with no drift between builder and parser.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] One-way and round-trip payloads build identical params in both callers
- [ ] Multi-city trip flag round-trips through the shared parser
- [ ] Invalid or partial URL state is rejected without triggering a search
- [ ] Existing flights hydration behavior is unchanged (no regressions)
