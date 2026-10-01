import test from "node:test"
import assert from "node:assert/strict"
import { serializeJsonLd } from "../lib/structured-data.ts"
import { destinationDetailJsonLd } from "../lib/listings.ts"

// ---------------------------------------------------------------------------
// lib/structured-data.ts — the single JSON-LD renderer (ticket 03).
// A closing script tag (any casing) or an HTML comment opener inside a
// backend-supplied string must render as literal text, never as markup.
// Ordinary punctuation and non-ASCII characters must pass through untouched.
// ---------------------------------------------------------------------------

test("Structured data: a closing script tag renders as literal text, not markup", () => {
  const payload = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: 'Nice post</script><script>alert("xss")</script>',
    description: "Uppercase break: </ScRiPt> plus opener <!-- and closer -->",
  }
  const out = serializeJsonLd(payload)
  assert.doesNotMatch(out, /<\/script/i, "No script terminator may survive")
  assert.doesNotMatch(out, /<!--/, "No comment opener may survive")
  assert.match(out, /\\u003c\/script/i, "The bracket is escaped, not dropped")
  assert.deepEqual(
    JSON.parse(out),
    payload,
    "Escaping must round-trip back to the input for crawlers"
  )
})

test("Structured data: ordinary punctuation and non-ASCII pass through unescaped", () => {
  const payload = {
    name: "Café Alphaa — “Lagos” & 'Abuja' / best 🎉",
    price: "₦25,000",
  }
  const out = serializeJsonLd(payload)
  for (const literal of ["Café", "—", "&", "₦", "🎉", "Lagos"]) {
    assert.ok(
      out.includes(literal),
      `Must not double-escape ordinary text: ${literal}`
    )
  }
  assert.deepEqual(JSON.parse(out), payload)
})

test("Structured data: existing graphs render unchanged — one value, no double-escaping", () => {
  const graph = destinationDetailJsonLd({
    name: "Cape Coast",
    slug: "cape-coast",
    country: "Ghana",
    description: "Forts, canopy walkways & sandy beaches — café stops included.",
    main_image: "/media/cape.jpg",
    packages: [{ title: "Weekend Escape", slug: "weekend-escape" }],
  })
  const out = serializeJsonLd(graph)
  assert.deepEqual(
    JSON.parse(out),
    graph,
    "One context, one script element per graph — same payload crawlers already read"
  )
  assert.ok(out.includes("café"), "Non-ASCII stays literal (no \\u00XX noise)")
  assert.ok(out.includes("&"), "Ampersands stay literal")
})

test("Structured data: unserializable input degrades to null, never to undefined", () => {
  assert.equal(serializeJsonLd(undefined), "null")
})
