# 03 — Round-trip, swap, and validation polish

**What to build:** Round trip reveals a Return field, the swap control reverses the route without deleting input, and validation runs on blur plus submit with invalid submits focusing the first error and announcing it.

**Blocked by:** 02-one-way-compact-search.

**Status:** ready-for-agent

- [ ] Return appears for round-trip; Return before Departure rejected (same-day allowed)
- [ ] Swap exchanges both sides even when one is empty; disabled only when both are empty
- [ ] Validation is quiet while typing, errors on blur and full check on submit
- [ ] Invalid submit focuses the first error with an alert announcement and no navigation
