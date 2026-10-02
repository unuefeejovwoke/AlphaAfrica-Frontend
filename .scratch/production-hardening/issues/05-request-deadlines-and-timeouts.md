# 05 — Every backend call has a deadline and an honest timeout

**What to build:** No request can hang. A slow or unresponsive travel service produces the honest timeout message — no booking was made and no payment was taken — instead of an indefinite spinner, while a call the Customer cancels still cancels silently.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] Every read and write through the backend boundary applies its own deadline, sized per operation: search and streaming longer than booking and verification reads
- [x] A fired deadline surfaces the timeout copy, and the timeout classification is reachable in tests
- [x] A caller-supplied cancellation still propagates as a cancellation and is never converted into a retryable network failure
- [x] The same-origin handler forwards the deadline upstream, and an aborted upstream request still answers 499
- [x] Streaming domestic search keeps its existing long budget and still falls back to the blocking search on timeout or stream error
- [x] Existing run-guard behaviour — stale responses never commit — is preserved and asserted
- [x] Deadline, abort and error mapping are covered at the backend boundary seam
## Comments

Verified 2026-10-02: implementation present in tree; typecheck green; targeted seam suites green.
