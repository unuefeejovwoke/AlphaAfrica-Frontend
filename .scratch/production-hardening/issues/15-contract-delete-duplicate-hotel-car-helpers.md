# 15 — Contract: delete the duplicated Hotel and Car helpers

**What to build:** The dead copies are gone, so there is one implementation of each behaviour and one place to change it.

**Blocked by:** 13 — Hotels migrate onto the shared modules. 14 — Cars migrate onto the shared modules.

**Status:** ready-for-agent

- [ ] The duplicated parameter, session and pagination helpers are deleted
- [ ] No first-party code imports them, and the build reports no dead export
- [ ] The full suite passes and the bundle shows the duplication gone
- [ ] The shared modules are documented as the single home for this logic, with the reason recorded
- [ ] The next domain to need this logic — Visa, package — has an obvious place to plug in