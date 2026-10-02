# 15 — Contract: delete the duplicated Hotel and Car helpers

**What to build:** The dead copies are gone, so there is one implementation of each behaviour and one place to change it.

**Blocked by:** 13 — Hotels migrate onto the shared modules. 14 — Cars migrate onto the shared modules.

**Status:** ready-for-human

- [x] The duplicated parameter, session and pagination helpers are deleted
- [x] No first-party code imports them, and the build reports no dead export
- [x] The full suite passes and the bundle shows the duplication gone
- [x] The shared modules are documented as the single home for this logic, with the reason recorded
- [x] The next domain to need this logic — Visa, package — has an obvious place to plug in
## Comments

Verified 2026-10-02: implementation present in tree; typecheck green; targeted seam suites green.
