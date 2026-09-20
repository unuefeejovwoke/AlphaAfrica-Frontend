# 02 — Public Navigation Header and Editorial Brand Footer

**What to build:** An end-to-end responsive public layout shell. A traveller can discover all Alphaa services (Flights, Hotels, Packages, Visa Assistance, Car Rentals, Destinations) on desktop navigation, toggle a smooth mobile navigation drawer on smaller screens, trigger a prominent "Book a Trip" primary action, and view an editorial brand footer with verified Abuja headquarters address, telephone/WhatsApp contact links, social channels, and payment reassurance.

**Blocked by:** 01 — Brand Theme Tokens and Typography System

**Status:** resolved

- [x] Desktop navigation header renders Alphaa Africa brand emblem, core service links (Flights, Hotels, Packages, Visa Assistance, Car Rentals, Destinations), "Log in" trigger, and "Book a Trip" primary action.
- [x] Mobile navigation drawer opens smoothly on mobile viewports via Base UI sheet/drawer primitive and allows navigating between services.
- [x] Editorial brand footer displays service directories, Abuja office location details, contact info, payment partner trust badges, and copyright notice.
- [x] Header and footer integrate into an App Router `(public)` layout shell wrapping public pages.
- [x] Interactive component tests verify navigation rendering, drawer toggle behavior, and footer information presence.
- [x] TypeScript check (`pnpm typecheck`) passes with zero errors.
