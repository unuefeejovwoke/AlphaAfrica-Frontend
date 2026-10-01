# 03 — One structured-data renderer that cannot be broken out of

**What to build:** Backend-supplied strings — Post titles and excerpts, Hotel and Package names, Destination and Country names, Vehicle names, descriptions — can never execute in a visitor's browser, whatever they contain. Every page that emits structured data goes through one sanctioned renderer that escapes anything capable of terminating a script context, so the escaping rule is enforced once rather than at each call site.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] No page injects a raw serialised object into the document; all structured data goes through the single renderer
- [ ] A string containing a closing script tag renders as literal text, not as markup, asserted at the renderer's seam
- [ ] Rendering is unchanged for existing payloads: one context, one script element per graph, no double-escaping of ordinary punctuation or non-ASCII characters
- [ ] Every existing structured-data call site migrates, including the listing, detail, legal, contact and home pages
- [ ] The existing structured-data suites keep passing, including the tests that forbid fabricated facts
- [ ] The renderer's escaping behaviour is asserted by tests rather than only by inspection