# 02 — Production Content Modules

**What to build:** `lib/content/company.ts, contact.ts, faqs.ts, testimonials.ts, stats.ts` with typed `source: 'draft' | 'verified'` + `updatedAt`, SEO-included, no experimental naming. Company holds office/address/mapQuery/lat-lng/phone/WhatsApp/email/socials/positioning; contact holds channels/hours/emergency; faqs grouped per §8.12; testimonials `{ quote max 3 lines, name, role, company?, source }`; stats stays empty until verified numbers supplied.

**Blocked by:** None — can start immediately (parallel with 01).

**Status:** ready-for-agent

- [ ] Five typed modules with Draft|Verified, no `placeholders.ts`, no TODO-badge UI.
- [ ] WhatsApp/phone read only from `company.ts` (remove hardcodes).
- [ ] FAQs cover Flights/Hotels/Packages/Visa/Cars/Payments/Changes/Cancellation/Account/General with draft entries owner replaces later.
- [ ] `pnpm typecheck` passes.
