# 02 — Patch the Next.js advisory

**What to build:** The platform ships a framework release with no known critical advisory, achieved with the smallest change that clears it — a version bump to the advisory's patched floor, nothing wider.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The pinned framework version is at or above the advisory's patched floor
- [ ] The production dependency audit reports no critical or high advisory
- [ ] The production build succeeds and the route inventory keeps the same shape: same routes, same static and dynamic split
- [ ] Typecheck and the full test suite pass
- [ ] The lockfile is updated consistently with the manifest
- [ ] The version bump is committed on its own, with no incidental code changes