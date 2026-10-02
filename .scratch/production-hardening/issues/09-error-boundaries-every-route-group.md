# 09 — Every route group has an error boundary

**What to build:** A failure anywhere in a search or booking flow ends the Customer on an Alphaa screen with a diagnosis, a retry, and a route to a specialist — never a framework error page.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] Every route group has an error boundary, and a global boundary covers failures outside a route
- [x] A forced render failure in any group renders the existing error-state component: what went wrong, what to try, and the support escalation path
- [x] Boundaries never render raw backend messages, field dumps or stack traces
- [x] Retry re-runs the failed segment rather than resetting all page state where that is possible
- [x] Boundaries reset when the Customer navigates between sections, so a stale failure screen does not persist
- [x] The error state's own accessibility — live region and focus handling — is preserved in the boundary context
- [x] A test asserts the boundary renders the error state and never the raw framework message
## Comments

Verified 2026-10-02: implementation present in tree; typecheck green; targeted seam suites green.
