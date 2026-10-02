# 16 — One guest booking form for Hotel and Car

**What to build:** A Customer filling in a Hotel Guest or a Vehicle guest form gets the same careful experience: one phase machine, one field set, one validation and error-handling path, with only the booking-specific creation, reuse and payload work differing.

**Blocked by:** 13 — Hotels migrate onto the shared modules. 14 — Cars migrate onto the shared modules.

**Status:** ready-for-human

- [x] One form owns the phases, the field map, validation, submission states and error copy; booking-specific creation, reuse and payload are supplied to it
- [x] The separate hotel and car forms are deleted, with no orphaned styling or state left behind
- [x] Both booking types still validate party composition, room or hour counts, and phone normalisation exactly as before
- [x] The guest-form and booking-payload suites pass, extended to cover the shared form for both booking types
- [x] The payment reassurance copy renders identically for Hotel and Car
- [x] The reassurance that nothing was charged on failure appears in both flows
## Comments

Verified 2026-10-02: implementation present in tree; typecheck green; targeted seam suites green.
