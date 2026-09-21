<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Alphaa Africa Platform

Travel booking and assisted-service platform (flights, hotels, tours, visa assistance, car rentals).

## Production-Ready Code Mandate

**This is a production system, NOT an experiment or side project.**

Every line of code must be:
- **Production-ready**: battle-tested patterns, proper error handling, comprehensive validation
- **Debt-free**: no shortcuts, no TODOs, no workarounds that compromise quality
- **Well-documented**: clear, maintainable code that future developers can understand and extend
- **Thoroughly tested**: comprehensive test coverage for all critical paths
- **Accessible**: WCAG compliance, semantic HTML, keyboard navigation
- **Performant**: optimized for real-world usage patterns and scale

No exceptions. No excuses.

## Performance & Discovery Mandate

**Speed, SEO, AI SEO, and GEO are core requirements, not afterthoughts.**

Every feature must be built with:
- **Speed**: Core Web Vitals (LCP, FID, CLS) must meet or exceed Google's "good" thresholds
- **SEO**: Semantic HTML, structured data (JSON-LD), meta tags, OpenGraph, canonical URLs, XML sitemaps
- **AI SEO**: Content structured for AI crawlers and LLMs; schema markup for rich snippets and knowledge panels
- **GEO (Generative Engine Optimization)**: Optimized for AI-powered search (Google SGE, Perplexity, ChatGPT); clear entity relationships, factual content, authoritative sources
- **Performance**: Lazy loading, code splitting, image optimization, efficient caching, minimal JavaScript bundles

## Documentation & Dependencies (Context7)
- **Always query Context7 MCP** when working with external packages, APIs, or modern framework features (Next.js 16, React 19, Tailwind v4, Base UI, etc.) before writing code or assuming APIs. Do not guess versions or syntax.
- Use Context7 to fetch current documentation for any library or framework before implementing features.

## References & Specs
- `prd.md`: Product requirements, user flows, personas, and feature specifications.
- `apidoc.yaml`: OpenAPI 3.0.3 backend specifications (flights, hotels, bookings, auth).
- `node_modules/next/dist/docs/01-app/`: Bundled version-matched Next.js 16 docs.

## Developer Commands
- **Dev**: `pnpm dev`
- **Build**: `pnpm build`
- **Typecheck**: `pnpm typecheck` (`tsc --noEmit`)
- **Format**: `pnpm format`
- **Add UI Component**: `pnpm dlx shadcn@latest add <component>`
- **Lint**: `pnpm lint` (Note: currently fails on ESLint 10 / eslint-plugin-react incompatibility; rely on `pnpm typecheck` and `pnpm build` for verification).

## Architectural & Stack Conventions
- **Package Manager**: `pnpm` only (`pnpm-lock.yaml`). Never use `npm` or `yarn`.
- **Next.js 16 & React 19**:
  - Turbopack is active by default for both dev and build.
  - Page and layout dynamic props (`params`, `searchParams`) are asynchronous (`Promise<...>`) and must be awaited.
- **Tailwind CSS v4**:
  - No `tailwind.config.js/ts`. Configuration and theme variables live in `app/globals.css` via `@theme inline` and CSS variables.
- **UI & Primitives**:
  - Components use `@base-ui/react` primitives (shadcn `base-maia` style), **not** Radix UI.
  - Icons use `@hugeicons/react`, **not** Lucide.
  - Styling utility is `@/lib/utils` which exports `cn` directly from the `cn` package.
- **Path Aliases**: `@/*` maps to `./*`.

## Agent Skills Usage

**Always load and follow the relevant skill for each task.** Skills contain specialized workflows, best practices, and quality standards that ensure production-ready outcomes.

### Key Skills for This Project
- **Context7 MCP**: Use for all external library/framework documentation
- **Design Skills**: `design-taste-frontend`, `high-end-visual-design`, `redesign-existing-projects` for UI work
- **Implementation Skills**: `implement`, `tdd` for feature development
- **Quality Skills**: `code-review`, `web-design-guidelines` for validation
- **Architecture Skills**: `vercel-react-best-practices`, `supabase` for technical decisions
- **Planning Skills**: `wayfinder`, `to-spec`, `to-tickets` for complex features

**Never skip skill loading.** Each skill provides production-grade standards and workflows.

## Agent skills

### Issue tracker

Local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical role labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` and `docs/adr/` at repo root). See `docs/agents/domain.md`.
