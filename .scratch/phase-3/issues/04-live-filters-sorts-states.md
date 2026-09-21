# 04 — Live filters, sorts, and result states

**What to build:** A guest can instantly filter and sort accumulated flight results on any device with clear loading, empty, error, and retry states and no backend refetch per filter change.

**Blocked by:** 01 — One-way international search with airport autocomplete; 03 — Domestic streaming with fallback.

**Status:** ready-for-agent

- [ ] Filters for price, duration, stops, departure time, airline, and cabin apply instantly to accumulated cards including cards that arrive mid-stream
- [ ] Sorts for recommended, cheapest, fastest, and earliest departure update without refetch
- [ ] Mobile filters open as a bottom sheet with large tap targets and a sticky summary
- [ ] Skeleton, empty, error, and retry states are announced to assistive technology with a support hatch
- [ ] Missing optional fields on domestic cards render defensively without breaking layout
