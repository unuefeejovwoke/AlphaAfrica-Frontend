# 07 — Pending Booking creation and Paystack redirect

**What to build:** A guest with a Confirmed Offer and valid Travellers can create a Pending Booking exactly once and continue safely to Paystack payment.

**Blocked by:** 05 — Fare confirmation step; 06 — Guided Traveller and Customer forms.

**Status:** ready-for-agent

- [ ] Valid submission creates one Pending Booking with submit and pay actions disabled while creation is in flight
- [ ] Retrying an identical Confirmed Offer plus party reuses the pending reference instead of creating a duplicate
- [ ] Success returns an authorization URL and Payment Reference with the reference persisted in both the return URL and session storage
- [ ] A persistent trip and price summary shows fare, total, and NGN currency before redirect
- [ ] Creation failures explain what happened with retry and support actions and no double charge
