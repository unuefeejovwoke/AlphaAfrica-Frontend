# 01 — Brand Theme Tokens and Typography System

**What to build:** Establish the Alphaa Africa warm boutique visual identity across CSS tokens and typography. A user visiting the site sees warm off-white surfaces (`#FAF9F7`), deep plum text (`#171217`), brand orange action buttons (`#FF6738`), and deep plum accents (`#571563`) with high-contrast, scannable modern sans-serif typography on buttons and text hierarchy.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Core semantic tokens in `app/globals.css` map to Alphaa brand palette (`--primary`: `#FF6738`, `--background`: `#FAF9F7`, `--foreground`: `#171217`, `--border`: `#E9E3E7`, and secondary/accent plum tokens) with Tailwind CSS v4 `@theme inline`.
- [x] Font variables and typography hierarchy deliver crisp, legible modern sans-serif headings and body text.
- [x] Base UI `Button` primitive renders default brand orange, outline, secondary plum, ghost, and link variants with active focus rings and accessible contrast.
- [x] TypeScript check (`pnpm typecheck`) passes with zero errors.
