# 08 — SEO + Support Hatch + Hardening

**What to build:** Phase 2-wide `generateMetadata` (unique title/meta/canonical/OG), JSON-LD (TouristTrip/FAQPage/Organization), semantic H1/alt/links, no thin pages; global floating WhatsApp + terminal "Talk to Alphaa" from `company.ts` with page/slug context prefill + mobile sticky; analytics events (§22: package viewed/enquiry, visa viewed/started/paid, support click, confirmation viewed) with no passport/payment/token capture; responsive/a11y/loading/empty/error pass.

**Blocked by:** 03, 04, 05, 06, 07.

**Status:** done

- [ ] Every public page has purpose + CTA + escape hatch; contrast/focus/keyboard verified.
- [ ] Images lazy below fold, hero prioritized; skeletons everywhere async.
- [ ] No hardcoded contact numbers remain; `rg 2348000000000` returns zero.
- [ ] `pnpm typecheck` + `pnpm build` pass.
