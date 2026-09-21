# 04 — Accessible Form Controls and Traveller Stepper

**What to build:** A cohesive suite of accessible form controls and a travel-specific multi-traveller Stepper. A traveller configuring search criteria or personal details encounters high-contrast Text Input, Textarea, Select / Dropdown, Checkbox, Radio, Switch, Date Picker, and a Traveller Stepper (Adults, Children, Infants) with real-time Zod schema validation and clear, immediate field-level error messages.

**Blocked by:** 01 — Brand Theme Tokens and Typography System

**Status:** resolved

- [x] Accessible Base UI form controls (Input, Textarea, Select, Checkbox, Radio Group, Switch, Calendar / Date Picker) built and styled with Alphaa brand tokens.
- [x] Traveller Counter / Stepper supports independently selecting adults (min 1, max 9), children (max 9), and infants (max = number of adults) with accessible increment/decrement buttons.
- [x] Form controls integrate seamlessly with React Hook Form and Zod schemas, displaying clear field-level validation messages when data is invalid.
- [x] Component tests verify traveller boundary constraints (e.g. infant count cannot exceed adult count) and validation message rendering.
- [x] TypeScript check (`pnpm typecheck`) passes with zero errors.
