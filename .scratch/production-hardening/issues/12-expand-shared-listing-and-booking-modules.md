# 12 — Expand: shared listing, booking-session and pagination modules

**What to build:** The parameter parsing, query building, pending-booking storage, envelope normalisation, verification-state resolution and pagination logic that Hotel and Car each carry a copy of exists once, in shared modules, beside the existing code. Nothing is deleted and no behaviour changes in this ticket — it makes the change easy so the easy change can land safely.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Shared modules exist with Hotel and Car call sites still pointing at their current code
- [ ] Shared modules cover bounded integers, price ceilings, ordering vocabularies, featured selection, slug listing, pagination windows and last-page ranges
- [ ] A single session-record helper covers stable serialise, save, read and clear
- [ ] Both the Hotel and Car suites pass unchanged, proving the expand is behaviour-preserving
- [ ] The storage helper stores digests, consistent with the passport-data decision
- [ ] No production component imports the new modules yet