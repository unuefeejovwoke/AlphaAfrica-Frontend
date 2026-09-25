# 05 — Hotel Guest form with creation and Paystack redirect

**What to build:** A Hotel Guest can enter stay and contact details once, pass guided validation, create the Hotel Booking exactly once even on double-tap, and continue to Paystack to pay.

**Blocked by:** 04 — Room Type choice with capacity and price preview.

**Status:** done

- [ ] Single full-name field plus email plus phone with Nigerian and international formats accepted then normalized, validated on blur, on submit, and before payment creation with human-readable errors
- [ ] Stay inputs (Room Type, check-in and check-out, rooms, guests) revalidated against the capacity rule and date rules before any payment step
- [ ] Single-flight creation guard with disabled submit and pay actions and persisted Payment Reference so retries never create duplicates
- [ ] Success redirects to the returned Paystack authorization URL; failures map to customer-safe copy with field errors shown inline and never raw
- [ ] No account required, no tokens or payment data in URLs or analytics, and Talk to Alphaa available throughout
