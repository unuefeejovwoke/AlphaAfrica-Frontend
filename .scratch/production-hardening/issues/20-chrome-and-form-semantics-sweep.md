# 20 — Chrome and form semantics sweep

**What to build:** The navigation, footer, support widget and forms are semantically correct, comfortable on a phone, and behave like real controls to assistive technology and to browser autofill.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The services menu is a disclosure or a menu with correct expanded and controls state, and its tab order follows what it presents
- [ ] The mobile menu trigger and its panel share the same relationship
- [ ] Footer landmark labelling and heading levels are correct
- [ ] Interactive hit targets on phones meet the minimum size, including steppers and filter chips
- [ ] Combobox and phone fields declare autofill behaviour; date inputs are named
- [ ] Animations use animatable properties rather than layout-triggering ones, and respect reduced motion
- [ ] The page declares its theme colour, matching the page background
- [ ] Changes are limited to semantics, sizing and focus: no visual redesign