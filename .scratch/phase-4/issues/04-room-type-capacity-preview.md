# 04 — Room Type choice with capacity and price preview

**What to build:** A guest can pick exactly one Room Type for the Hotel Booking, get guided when the party does not fit, change dates without losing the choice, and see a nights-based price preview where only the backend total can charge.

**Blocked by:** 03 — Hotel detail with gallery, rooms, and SEO.

**Status:** ready-for-agent

- [ ] Exactly one Room Type selectable per Hotel Booking via an accessible radio choice showing name, description, per-night price, per-room capacity, and room count
- [ ] Capacity enforced as guests at most per-room capacity times rooms with inline guidance to add rooms or choose another Room Type; zero-capacity rows never block
- [ ] Property room counts shown as informational display only with availability owned by the backend at creation time
- [ ] Date changes preserve the chosen Room Type while re-deriving nights and preview (nights times per-night price times rooms); charged total comes only from backend responses
- [ ] Sticky summary with per-night clarity and Talk to Alphaa escape on every state
