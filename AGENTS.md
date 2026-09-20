<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Alphaa Africa Platform

Travel booking and assisted-service platform (flights, hotels, tours, visa assistance, car rentals).

## Documentation & Dependencies (Context7)
- **Always query Context7 MCP** when working with external packages, APIs, or modern framework features (Next.js 16, React 19, Tailwind v4, Base UI, etc.) before writing code or assuming APIs. Do not guess versions or syntax.

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

## Agent skills

### Issue tracker

Local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical role labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` and `docs/adr/` at repo root). See `docs/agents/domain.md`.
