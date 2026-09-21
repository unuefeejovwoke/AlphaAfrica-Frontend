# 01 — Hotel search foundation with URL state

**What to build:** A guest can type a free-text destination (city or Hotel name, empty means browse-all), add optional stay dates and party, run the search, and land on results that survive back, refresh, and sharing — with honest loading, empty, error, and retry states throughout.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Single destination input with empty allowed for paginated browse-all and no autocomplete index
- [ ] Date-pair validation (both or neither, real calendar dates, check-out after check-in, neither in the past) plus guest and room minimums with human-readable errors on blur and submit
- [ ] Full search state reflected in shareable URL state with centralized Hotel integration and untrusted-response validation
- [ ] Idle, loading with skeletons, success, empty, error, and retry states that never show blank containers and always offer Talk to Alphaa
- [ ] No account required and no sensitive data in URLs or analytics
