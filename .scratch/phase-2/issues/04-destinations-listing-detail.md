# 04 — Destinations Listing + Detail

**What to build:** `/destinations` server grid (image/destination/country/count/starting-price/CTA, featured first) + `/destinations/[slug]` (hero, intro, featured packages, other packages, inspiration, CTA) with `generateStaticParams` + ISR 3600 + `dynamicParams true`, `params: Promise<{slug}>`, `generateMetadata` + TouristTrip/ItemList JSON-LD, crawlable links.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- [ ] Listing + detail fetch from `lib/api`, loading/empty/error+retry, no thin pages.
- [ ] Unique title/meta/canonical/OG/H1/alt per slug.
- [ ] Terminal CTA + support hatch with destination context.
- [ ] `pnpm typecheck` + `pnpm build` pass.
