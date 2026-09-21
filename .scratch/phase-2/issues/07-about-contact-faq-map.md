# 07 — About + Contact (No Form) + FAQ + Map

**What to build:** `/about` lean 8 sections from `company.ts` (who/what/services/why/support/office/CTA, no essay). `/contact` with NO form: channels (WhatsApp/phone/email/office/hours), emergency guidance, FAQ teaser, lazy Google Map iframe (`maps.google.com/maps?q=<address>&output=embed`, accessible title) from `company.ts` draft mapQuery. `/faq` grouped per §8.12 from `faqs.ts` + FAQPage JSON-LD.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] No fake contact POST; all copy from `lib/content/`.
- [ ] Map lazy-loads, no API key, responsive + keyboard accessible.
- [ ] About establishes trust quickly; FAQ answers are draft-marked until verified.
- [ ] `pnpm typecheck` + `pnpm build` pass.
