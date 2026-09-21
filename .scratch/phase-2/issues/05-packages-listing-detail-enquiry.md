# 05 — Packages Listing + Detail + Enquiry

**What to build:** `/packages` with URL searchParams filters (`destination`, `max_price`, `featured`) → server fetch, controls update URL via `startTransition`, grid + custom-trip CTA. `/packages/[slug]` with 11 PRD sections + inline Enquiry form (RHF+Zod: full_name/email/phone/preferred_date/num_adults min1/num_children/message, onBlur+submit) → success panel (reference/package_title/total_travelers + team-follows-up + WhatsApp) + "Need something different?" CTA.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- [ ] Server-filtered listing is shareable/crawlable; mobile-friendly controls.
- [ ] Enquiry validates parity with apidoc, prevents duplicates, maps errors to human copy.
- [ ] `generateMetadata` + TouristTrip JSON-LD per package.
- [ ] `pnpm typecheck` + `pnpm build` pass.
