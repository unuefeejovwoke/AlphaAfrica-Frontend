# 02 — Round-trip and multi-city legs with global cabin

**What to build:** A guest can search round-trip and multi-city journeys from 2 up to 6 legs with one global cabin choice, with the full itinerary validated before search.

**Blocked by:** 01 — One-way international search with airport autocomplete.

**Status:** ready-for-agent

- [ ] Round-trip requires a return date on or after departure with a readable error otherwise
- [ ] Multi-city starts at 2 legs with add up to 6 and remove down to 2 through one consistent leg editor
- [ ] Leg chain validates chronological dates, distinct airports per leg, and no past dates
- [ ] One global cabin selection applies to every leg while the contract stays per-leg capable
- [ ] Results reuse the same Flight Offer card shape as one-way with no extra fetch per leg
