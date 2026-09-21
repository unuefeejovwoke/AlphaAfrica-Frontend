# 01 — Centralized API Client

**What to build:** Single `lib/api/` typed client for Phase 2: base URL from env, server GET (`destinations`, `destination detail`, `packages`, `package detail`, `visa countries`, `visa country detail`) with `revalidate 3600`, client POST (`package enquire`, `visa apply`, `visa verify`), paginated types from `apidoc.yaml`, raw backend errors mapped to human copy (never raw errors per §10), Nigerian phone/date/counter parity.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `lib/api/client.ts` + `destinations.ts`, `packages.ts`, `visa.ts` with request/response Zod or TS types matching apidoc (package_count/starting_price, price/inclusions, consultation_fee/processing_time, travel_purpose enum).
- [ ] Server fetch uses `next: { revalidate: 3600 }`, throws typed `ApiError` consumed by error+retry states.
- [ ] Client mutations accept RHF-validated payloads, return `reference` + `authorization_url` where applicable.
- [ ] `pnpm typecheck` passes.
