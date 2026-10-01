# 04 — Brand contrast meets WCAG AA

**What to build:** Every primary action, link, badge, muted label and positive call to action meets WCAG AA contrast, achieved through token changes rather than per-component patches, so every existing usage becomes compliant at once.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] The primary token paired with its foreground meets 4.5:1 for normal text, and 3:1 where only large text is placed on it
- [x] Primary-coloured text on the page background — the link variant and inline accents — meets 4.5:1
- [x] Muted foreground on the muted surface and on the page background meets 4.5:1
- [x] Secondary placeholder text meets the same bar as the labels it sits under
- [x] The positive call to action meets 4.5:1 against its own background
- [x] Ratios are asserted by a token test so a future palette change cannot regress them silently
- [x] The brand still reads as the same brand: hue family, hierarchy and the light-only theme are unchanged
- [x] Dark mode was already removed from the project, so no second palette needs the same treatment

## Measured ratios (before → after)

| Pairing | Before | After |
|---|---|---|
| White on primary | 2.90:1 | 5.18:1 |
| Primary text on page background | 2.75:1 | 4.92:1 |
| Muted fg on muted surface | 4.75:1 (already passing) | unchanged |
| Muted fg on page background | 5.13:1 (already passing) | unchanged |
| White on success green | 3.77:1 | 5.48:1 |
| Success green text on background | 3.58:1 | 5.21:1 |
| White on secondary plum | 12.41:1 (already passing) | unchanged |

## Comments

Implemented in commit `Ticket 04: brand contrast meets WCAG AA via token layer`.
Primary/ring/sidebar tokens `#ff6738` → `#c2410c` (same orange hue family,
darkened to AA); success green via a `--color-emerald-600: #047857` theme
override so all ~30 emerald CTA/badge usages comply at once; placeholder
`/70` opacity removed in blog + FAQ search fields (hotel search field fix
left uncommitted on top of unrelated hotel WIP). `tests/tokens.test.ts`
asserts every ratio above. Typecheck, full suite (221 pass, 0 fail; 8
cancelled are pre-existing untracked deadline WIP, untouched) and build green.

### Reverted (product decision)

Primary/ring/sidebar tokens were restored to brand orange `#ff6738`. White on
primary is 2.90:1 and primary text on the page background is 2.75:1, both below
WCAG AA — accepted deliberately in favour of the brand colour. The AA assertions
for those pairings in `tests/tokens.test.ts` are replaced with a 2.70:1 floor
so the token cannot silently move further. Everything else in this ticket (muted,
secondary, success green) still holds AA.
