# 05 — Travel Feedback States and Toast System

**What to build:** Empathetic, travel-aware feedback mechanisms. When a customer waits for search results, they see an explanatory `LoadingState` describing the background search process. When a service times out or errors, an `ErrorState` provides clear diagnosis, a retry button, and a one-tap WhatsApp fallback escalation (never a generic "something went wrong"). Success and warning events trigger non-intrusive, styled Sonner toast notifications.

**Blocked by:** 01 — Brand Theme Tokens and Typography System

**Status:** resolved

- [x] `LoadingState` component renders with spinner/pulse animation and travel-aware preset messages (flight search, hotel availability, price confirmation, payment verification).
- [x] `ErrorState` component renders with problem description, retry action button, and direct WhatsApp support escalation link, strictly honoring the PRD UX rule.
- [x] Skeleton loaders provide placeholder animations for cards, tables, and input fields during data fetching.
- [x] Sonner toast provider configured with Alphaa brand styling (warm background, custom borders, accessible colors) and supporting success, error, and action buttons.
- [x] Component tests verify LoadingState copy, ErrorState retry and WhatsApp callback triggers, and Toast emissions.
- [x] TypeScript check (`pnpm typecheck`) passes with zero errors.
