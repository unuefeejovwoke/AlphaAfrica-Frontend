# ISR for Phase 2 Marketing Content

Phase 2 destinations, packages, and visa listings/details are stable marketing content that must feel fast and index well for SEO, but still pick up new slugs and price changes without redeploys. We render them as React Server Components with `generateStaticParams` + ISR `revalidate 3600` + `dynamicParams true`, and parallel-fetch featured sections on Home.

Considered Options: `force-dynamic` on every request (always fresh but slow LCP and poor SEO cache) and `force-static` with no revalidation (fast but stale prices and 404s on new slugs).
Consequences: Requires a single `lib/api/` client with base URL from env, `params` awaited as `Promise<{slug}>`, and explicit loading/empty/error+retry states so cached pages never show empty containers.
