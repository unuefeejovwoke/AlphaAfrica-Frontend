# 06 — Verification with confirmation and recovery

**What to build:** A guest returning from Paystack waits through an explicit verifying state and lands on a premium Hotel Booking confirmation — or a clear recovery path that protects their money and reference.

**Blocked by:** 05 — Hotel Guest form with creation and Paystack redirect.

**Status:** done

- [ ] Reference-only verification with no caching that never assumes return means success, showing an explicit do-not-close verifying state
- [ ] Confirmed state shows Hotel Booking reference, Hotel and Room Type names, check-in and check-out, nights, rooms, guests, per-night price, total amount, payment state, and next steps
- [ ] Failed or cancelled states answer what happened, whether payment is safe, and what to do next with Payment Reference retention and reassurance copy
- [ ] View booking, download or share confirmation, and contact Alphaa actions on the confirmation with account encouragement only after success
- [ ] Verification covers pending, confirmed, cancelled, and failed outcomes with retry plus Talk to Alphaa
