# 02 — One-way compact search

**What to build:** The Flights tab shows a compact search with One way selected, empty FROM and TO with recent airports on idle, a styled native Departure field, and Search. A valid search navigates to shareable flights URL state that auto-searches; an invalid search stays on home with inline errors.

**Blocked by:** 01-shared-url-contract.

**Status:** ready-for-agent

- [ ] Empty fields with recents; autocomplete pick required (typed-but-unselected text rejected)
- [ ] Same-airport route rejected; past Departure dates rejected
- [ ] Valid one-way navigates to flights URL state that auto-searches
- [ ] Invalid submit shows inline errors with no navigation
