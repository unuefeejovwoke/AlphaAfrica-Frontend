# 22 — Request and bundle hygiene

**What to build:** Rapid filtering and browsing stop spending server calls on answers nobody sees, and the booking critical path stops shipping interface the Customer has not opened yet.

**Blocked by:** 21 — Hotel and Car listings exist in server HTML.

**Status:** ready-for-human

- [x] Superseded Hotel and Car searches are aborted, and unmounting cancels in-flight work
- [x] Interaction-only interface — fare confirmation and photo lightboxes — loads when first opened rather than on first paint
- [x] The largest-content image stays server-rendered so the layout and preload hint are unaffected
- [x] The icon package's barrel import is optimised at the framework level, and unused icon and font imports are removed
- [x] Long result grids skip off-screen rendering work, consistent with how the Hotel and Car grids already behave
- [x] The build shows reduced client work with no behaviour or layout change
## Comments

Verified 2026-10-02: implementation present in tree; typecheck green; targeted seam suites green.
