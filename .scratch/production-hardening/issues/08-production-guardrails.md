# 08 — Production guardrails

**What to build:** A production deployment cannot silently talk to the wrong place, advertise localhost, or serve without the headers a payment site needs.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The site sends a referrer policy that does not leak emailed order tokens, plus standard transport, content-type and framing protections
- [ ] Image optimisation never accepts localhost or loopback hosts in production; they work in development only
- [ ] A malformed or localhost site URL or backend URL fails loudly, or is loudly reported, instead of silently falling back to the production default
- [ ] Long-running search and streaming handlers declare a duration budget covering their own client waits plus a margin
- [ ] Proxy responses carry the content-type protection header and do not buffer unbounded request bodies
- [ ] Each guard has a test covering both its trigger and its non-trigger case
- [ ] A production build emits no configuration warning about unresolved social metadata