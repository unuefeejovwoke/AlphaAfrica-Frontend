# 23 — Debt sweep: dead code and shared small helpers

**What to build:** The small things that add reading cost without adding capability are gone, and the formatting helpers that exist in several copies exist once.

**Blocked by:** 15 — Contract: delete the duplicated Hotel and Car helpers.

**Status:** ready-for-human

- [x] The empty hooks directory is either used for hooks or removed, and hooks live in one predictable place
- [x] The type-parameter escape hatch in the traveller schema is replaced with a real type
- [x] The tautological expression and the duplicated phone rules are collapsed
- [x] The delegating accessor is removed and call sites import the module they actually need
- [x] The dead prop on the terminal call to action is removed with its imports
- [x] Local-today and date-offset helpers, Naira parsing and star-rating presentation each have one implementation
- [x] Star-rating styling and the cabin-option vocabulary are no longer re-declared at call sites
- [x] The full suite passes and the build reports no dead code
- [x] The icon-package dependency is retained: the stylesheet imports from it, so it is not dead weight
## Comments

Verified 2026-10-02: implementation present in tree; typecheck green; targeted seam suites green.
