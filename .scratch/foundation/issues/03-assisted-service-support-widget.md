# 03 — Assisted Service Support Widget and Contact Drawer

**What to build:** A persistent floating Assisted Service support CTA anchored on public pages. A customer who prefers human assistance can tap the widget at any time to open a multi-channel support drawer offering one-tap WhatsApp chat (pre-populated with contextual route/service intent), direct telephone dialling to the Abuja desk, and a quick consultation enquiry form.

**Blocked by:** 02 — Public Navigation Header and Editorial Brand Footer

**Status:** resolved

- [x] Floating action widget renders fixed in the bottom-right corner across public pages with clear "Need Help? / WhatsApp" visual affordance.
- [x] Tapping the trigger opens an accessible drawer/sheet without obstructing main page readability.
- [x] Direct WhatsApp trigger formats a message containing the current route/intent and opens WhatsApp in a new tab.
- [x] Direct phone dialling button connects to the Abuja customer support phone number.
- [x] Quick consultation form captures basic customer details (name, email/phone, request) for assisted enquiry callback.
- [x] Component tests verify drawer trigger, channel options, and contextual WhatsApp URL generation.
- [x] TypeScript check (`pnpm typecheck`) passes with zero errors.
