# Alphaa Africa

Travel booking and assisted-service platform for Africa — flights, hotels, tours/packages, visa assistance, and car rentals. This repo is the Next.js frontend; it talks to the Alphaa Africa backend API through same-origin `/api/*` proxy routes.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (theme in `app/globals.css`, no tailwind config file)
- UI primitives: **Base UI** (`@base-ui/react`), icons: **HugeIcons**, forms: **React Hook Form + Zod**, animation: **Motion** (`motion/react`)
- Package manager: **pnpm** only (`pnpm-lock.yaml`)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then adjust for your machine
pnpm dev                     # http://localhost:3000
```

## Environment

Local config lives in gitignored `.env.local`; `.env.example` documents every key. Never commit real values. Production values live in the Vercel dashboard.

| Key | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend host (default `https://api.alphaaafrica.com`) |
| `API_BASE_URL` | Server-only override; blank reuses the public key |
| `NEXT_PUBLIC_SITE_URL` / `SITE_URL` | Canonical site root for metadata, sitemaps, JSON-LD |
| `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_GA_ID` | Optional; blank disables analytics |
| `NEXT_PUBLIC_ERROR_REPORTER_ID` | Optional; blank keeps the reporter inert |

`NEXT_PUBLIC_*` values are inlined at build time — restart the dev server (and rebuild production) after changing them. App code reads env through `lib/env.ts`, never `process.env` directly.

## Commands

```bash
pnpm dev          # local dev server
pnpm build        # production build
pnpm start        # serve a production build
pnpm typecheck    # tsc --noEmit (primary verification)
pnpm lint         # eslint (currently broken on ESLint 10 plugin incompatibility; use typecheck + build)
pnpm format       # prettier
pnpm test         # node test runner over tests/
pnpm dlx shadcn@latest add <component>   # add a UI component
```

## Project structure

- `app/(public)/` — marketing, search, and listing pages (flights, hotels, cars, visa, packages, blog)
- `app/(checkout)/` — booking, verification, and payment flows
- `app/api/` — same-origin proxy routes to the backend (keeps tokens server-side)
- `components/` — feature components (`auth/`, `flights/`, `hotels/`, `cars/`, `visa/`, `orders/`, …) plus shared `ui/` and `motion/` primitives
- `lib/` — API clients, session handling, env, schemas, content
- `tests/` — `node:test` suites run with `pnpm test`

## Conventions

- Path alias `@/*` maps to the repo root.
- Next.js 16 route props (`params`, `searchParams`) are async — always `await` them.
- Auth uses server-owned HttpOnly sessions; guest booking paths stay usable without login.
- Backend contract: `apidoc.yaml` (OpenAPI spec) plus the frontend-integration guide at `https://api.alphaaafrica.com/api/guide/`; live Swagger/ReDoc at `/api/docs/` and `/api/redoc/` on the API host.
- Performance, SEO, and AI/GEO readiness (semantic HTML, JSON-LD, meta/OpenGraph, sitemaps) are requirements on every feature, not afterthoughts.
