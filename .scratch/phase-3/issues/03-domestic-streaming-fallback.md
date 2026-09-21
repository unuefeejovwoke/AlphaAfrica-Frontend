# 03 — Domestic streaming with fallback

**What to build:** A guest searching between two Nigerian airports is auto-routed to progressive streamed Domestic Flight Cards with honest progress, completion, and a blocking fallback when streaming fails.

**Blocked by:** 01 — One-way international search with airport autocomplete.

**Status:** ready-for-agent

- [ ] Both-Nigerian origin and destination auto-select the domestic streaming path with no manual toggle
- [ ] Cards render progressively as airlines respond with progress copy and a terminal completion state retaining the search identifier for support
- [ ] New searches and unmounts abort the prior stream with no leaked updates
- [ ] Stream error or timeout automatically falls back to the blocking domestic search without losing entered criteria
- [ ] Search criteria survive back navigation, refresh, and sharing
