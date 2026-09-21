# 01 — One-way international search with airport autocomplete

**What to build:** A guest can choose two airports through autocomplete, pass validation, run a one-way international search, and see Flight Offers with clear prices plus empty, error, and retry states.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Autocomplete triggers from 2 characters across IATA code, city, or airport name with debounced, deduplicated, cached results and recent searches
- [ ] Validation rejects same origin and destination, past or impossible dates, and invalid party composition with human-readable errors on blur and submit
- [ ] One-way search returns Flight Offers showing airline, departure, arrival, duration, stops, airports, cabin, baggage where available, total price, currency in NGN, and select action
- [ ] Loading, empty, error, and retry states never show blank containers and always offer Talk to Alphaa
- [ ] No account is required and no sensitive data appears in URLs or analytics
