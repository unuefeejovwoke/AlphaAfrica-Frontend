# 08 — Verification, confirmation, and recovery

**What to build:** A guest returning from Paystack sees idempotent verification resolve into either a certain Booking with PNR or a safe, actionable failure with the Payment Reference retained.

**Blocked by:** 07 — Pending Booking creation and Paystack redirect.

**Status:** ready-for-agent

- [ ] Return shows a confirming-payment state that never assumes return means success and never serves a cached pending snapshot
- [ ] Verification resolves idempotently with the PNR shown only when the airline order exists
- [ ] Success renders Booking reference, PNR where available, route, dates, Traveller summary, amount, payment state, next steps, plus view, download or share, and contact actions
- [ ] Failure answers what happened, whether payment is safe, and what to do next with reference retention and support actions
- [ ] No tokens, passports, payment data, or passwords are logged or exposed in URLs beyond the non-sensitive reference
