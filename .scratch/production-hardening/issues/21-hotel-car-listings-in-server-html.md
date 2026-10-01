# 21 — Hotel and Car listings exist in server HTML

**What to build:** A Customer browsing Hotels or Vehicles sees the inventory in the first response rather than an empty shell that fills in after JavaScript wakes up, and the price they browse is not an hour stale relative to the price they pay.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The first page of Hotel and Vehicle listings is rendered on the server and present in the delivered HTML
- [ ] Filtering, sorting and pagination continue to work through the same client controls the Customer already uses, and deep links still restore state
- [ ] Price-bearing listing and detail pages no longer serve totals that can disagree with checkout — either the cache lifetime is shortened to something honest or the amount is fetched live
- [ ] The catalogue markup remains crawlable and accessible, and empty and error states still render when the backend returns nothing
- [ ] Tests cover both the server-rendered first page and the client-side transitions
- [ ] No client-only fetch is duplicated by the server render — the first page is fetched once