# 01 — Retire the unbuilt Sign In entry points

**What to build:** Every public page stops offering an account entry point that cannot work. The desktop header, the mobile menu and the footer no longer render a Sign In control, and the header icon those controls used no longer ships. Guest Booking and the emailed order links remain the ways to reach a booking, and nothing in the interface implies an account exists. Removed rather than disabled: a control that cannot work is a dead end, not a disabled state.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] No Sign In control renders in the desktop header, the mobile menu, or the footer at any viewport
- [ ] No link anywhere in the shipped interface points at an account route that does not exist
- [ ] The icon import used only by those controls is removed and the build reports no unused import for it
- [ ] The primary booking call to action and the support entry point keep their current placement and emphasis in both headers
- [ ] No leftover gap, divider or alignment shift remains where the controls were removed
- [ ] Guest Booking, the emailed order link and the order history link by email are untouched
- [ ] The existing navigation and footer suites pass unchanged