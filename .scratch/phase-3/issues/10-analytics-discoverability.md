# 10 — Analytics and discoverability

**What to build:** Flight search, fare, payment, and support events are measurable without sensitive data while dynamic results stay out of search indexes and the marketing entry stays indexable.

**Blocked by:** 04 — Live filters, sorts, and result states; 08 — Verification, confirmation, and recovery.

**Status:** ready-for-agent

- [ ] Events fire for search started and completed, flight selected, price changed, checkout started, payment initiated and completed, confirmation viewed, and support clicks
- [ ] No passport, payment, password, or token data is captured in analytics payloads
- [ ] Dynamic search and streamed results are excluded from indexing with no thin indexable pages per route and date
- [ ] The stable flights entry carries unique title, meta description, canonical URL, heading hierarchy, image alt text, Open Graph data, and structured data where appropriate
- [ ] Third-party measurement loads after hydration without blocking the booking path
