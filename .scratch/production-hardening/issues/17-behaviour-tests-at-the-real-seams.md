# 17 — Behaviour tests at the real seams

**What to build:** The parts of the platform where money and truth live are verified by behaviour, so a refactor cannot pass while the behaviour is broken.

**Blocked by:** 05 — Every backend call has a deadline and an honest timeout. 07 — Same-origin seam for Hotel, Car, Visa and package browser calls. 11 — One payment verification seam for every booking type.

**Status:** ready-for-agent

- [ ] Tests exercise the backend boundary — request shape, same-origin versus absolute, deadline, error mapping, un-cached reads, abort — rather than asserting on source text
- [ ] Tests exercise booking persistence and booking verification through their module interfaces
- [ ] The source-text assertions that stood in for these tests are removed where behaviour is now covered
- [ ] Every test runs in the project's existing zero-dependency test command; no new test dependency is added
- [ ] A failure in any new test points at a behaviour, not at a source string
- [ ] The three seams are the only new test surfaces this work introduces