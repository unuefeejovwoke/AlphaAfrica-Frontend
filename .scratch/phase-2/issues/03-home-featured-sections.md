# 03 — Home Live Featured Sections

**What to build:** Wire `app/(public)/page.tsx` featured destinations + featured packages to API in parallel (RSC `Promise.all`, revalidate 3600) with skeleton → cards (destination/country/count/starting-price/CTA; title/duration/inclusions/price) → empty ("No featured trips right now, talk to Alphaa") + error+retry. Search switcher keeps Flights/Hotels/Cars tabs but routes to coming-soon support hatch until Phases 3–5.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- [ ] Parallel featured fetch, no waterfalls, skeletons match card shape.
- [ ] Empty/error/retry per §12, WhatsApp escape hatch on each.
- [ ] Future-phase tabs do not 404; premium editorial hierarchy preserved.
- [ ] `pnpm typecheck` + `pnpm build` pass.
