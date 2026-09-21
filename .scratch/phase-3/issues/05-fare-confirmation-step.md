# 05 — Fare confirmation step

**What to build:** A guest who selects a Flight Offer sees a dedicated fare-confirmation step producing a Confirmed Offer, with transparent handling when the airline updated the fare or the offer expired.

**Blocked by:** 01 — One-way international search with airport autocomplete.

**Status:** ready-for-agent

- [ ] Selecting an offer shows a confirming-live-fare state explaining the pause before Traveller entry
- [ ] An unchanged fare proceeds directly to Traveller entry with no added friction
- [ ] A changed fare shows the airline-updated-fare message with previous amount, new amount, difference, and continue or cancel actions
- [ ] An expired offer shows a re-search prompt plus Talk to Alphaa and never silently books
- [ ] The opaque offer payload persists across refresh and back navigation without ever appearing in URLs
