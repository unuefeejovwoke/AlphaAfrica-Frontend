# 20 — Chrome and form semantics sweep

**What to build:** The navigation, footer, support widget and forms are semantically correct, comfortable on a phone, and behave like real controls to assistive technology and to browser autofill.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] The services menu is a disclosure or a menu with correct expanded and controls state, and its tab order follows what it presents
- [x] The mobile menu trigger and its panel share the same relationship
- [x] Footer landmark labelling and heading levels are correct
- [x] Interactive hit targets on phones meet the minimum size, including steppers and filter chips
- [x] Combobox and phone fields declare autofill behaviour; date inputs are named
- [x] Animations use animatable properties rather than layout-triggering ones, and respect reduced motion
- [x] The page declares its theme colour, matching the page background
- [x] Changes are limited to semantics, sizing and focus: no visual redesign
## Comments

Verified 2026-10-02: implementation present in tree; typecheck green; targeted seam suites green.
