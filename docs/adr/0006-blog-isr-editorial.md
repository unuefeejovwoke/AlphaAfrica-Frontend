# ADR-0006: Blog as ISR Editorial Content

Public blog (`/blog`, `/blog/[slug]`) is stable editorial content backed by `GET /api/blog/`, `GET /api/blog/{slug}/`, `GET /api/blog/{slug}/related/`, `GET /api/blog/categories/`, `GET /api/blog/tags/`.

Render as React Server Components with `revalidate 3600` + `dynamicParams true` + `generateStaticParams` (first page slugs), matching ADR-0003/ADR-0005. Listing is server-filtered via shareable URL params (`search`, `category`, `tag`, `featured`, `ordering`, `page`) so every filtered view is crawlable and shareable; detail increments the backend view counter as a side effect of the GET and needs no extra call.

Considered Options: `force-dynamic` per request (always fresh but slow LCP, poor SEO cache) and client-side filtering (fast typing but not shareable/crawlable, duplicates backend logic).

API reality over `apidoc.yaml`: `table_of_contents` is an array `{id,text,level}`, `seo` is an object `{meta_title,meta_description,target_keyword,canonical_url,noindex,og_image}`, `post_count` is numeric, `featured_image` is nullable. Zod schemas tolerate both documented and live shapes and treat all backend HTML as untrusted (allowlist sanitization, no raw `javascript:` URLs, `rel noopener` on external links).

Consequences: single `lib/api/blog.ts` client + `lib/blog.ts` pure helpers (params round-trip, sanitizer, BlogPosting/ItemList JSON-LD); explicit loading/empty/error+retry states per PRD §12; backend `seo.noindex` respected; secondary nav placement keeps booking CTAs dominant.
