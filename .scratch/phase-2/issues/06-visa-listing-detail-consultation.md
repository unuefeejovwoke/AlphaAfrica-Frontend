# 06 — Visa Listing + Detail + Consultation + Verify

**What to build:** `/visa` country grid (flag/country/consultation_fee/processing_time/featured) + `/visa/[slug]` (overview/fee/processing/who-for/what-help/FAQ/support CTA) with inline Consultation form (country prefilled+locked, travel_purpose 7 values, num_applicants stepper min1, RHF+Zod) → POST apply → redirect Paystack `authorization_url` → `/visa/verify/[reference]` verifies → confirmation (reference/status/fee) or failure ("payment safe? contact support") + WhatsApp.

**Blocked by:** 01, 02.

**Status:** done

- [ ] Guest allowed; duplicate submits disabled while pending; human error mapping.
- [ ] Verify never assumes return-from-payment means success; fetches final order.
- [ ] `generateMetadata` + FAQPage JSON-LD where FAQs present.
- [ ] `pnpm typecheck` + `pnpm build` pass.
