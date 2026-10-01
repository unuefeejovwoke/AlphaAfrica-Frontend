# 11 — One payment verification seam for every booking type

**What to build:** Pending, confirmed, failed and cancelled resolve the same way for Flights, Hotels, Vehicles and Visa Consultations, from one place, with one analytics contract. A Visa Consultation stops reporting a paid order as unpaid, and confirmation events stop firing twice on retry or back navigation.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] One module owns the status vocabulary, the read policy, the settle retry and the analytics emission; each booking type's client delegates
- [ ] The settle retry the flight and hotel flows already have is shared, so Visa Consultations benefit from it
- [ ] Payment state is read from the field the backend treats as authoritative, with the legacy field as fallback
- [ ] Confirmation analytics fire exactly once per state change, including on back navigation and retry
- [ ] One page view is recorded per load regardless of how many tag managers are configured
- [ ] A successful verification clears the stored Payment Reference on every booking type
- [ ] Seam tests cover pending, confirmed, failed, cancelled and unknown for each booking type, and assert reads are never cached