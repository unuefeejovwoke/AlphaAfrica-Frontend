# 23 — Debt sweep: dead code and shared small helpers

**What to build:** The small things that add reading cost without adding capability are gone, and the formatting helpers that exist in several copies exist once.

**Blocked by:** 15 — Contract: delete the duplicated Hotel and Car helpers.

**Status:** ready-for-agent

- [ ] The empty hooks directory is either used for hooks or removed, and hooks live in one predictable place
- [ ] The type-parameter escape hatch in the traveller schema is replaced with a real type
- [ ] The tautological expression and the duplicated phone rules are collapsed
- [ ] The delegating accessor is removed and call sites import the module they actually need
- [ ] The dead prop on the terminal call to action is removed with its imports
- [ ] Local-today and date-offset helpers, Naira parsing and star-rating presentation each have one implementation
- [ ] Star-rating styling and the cabin-option vocabulary are no longer re-declared at call sites
- [ ] The full suite passes and the build reports no dead code
- [ ] The icon-package dependency is retained: the stylesheet imports from it, so it is not dead weight