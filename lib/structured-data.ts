/**
 * Single sanctioned structured-data renderer (production hardening, 03).
 *
 * Every page that emits JSON-LD goes through {@link serializeJsonLd} — no
 * call site carries escaping logic of its own, and no page injects a raw
 * `JSON.stringify` result into the document. Backend-supplied strings (Post
 * titles, Hotel names, descriptions, …) can never terminate the surrounding
 * `<script type="application/ld+json">` element, whatever they contain.
 *
 * Escaping rule: every `<` becomes `\u003c`. That single replacement covers
 * every script-terminating sequence (`</script>`, `<!--`) in any casing,
 * while leaving ordinary punctuation (`&`, quotes) and non-ASCII characters
 * (`é`, `—`, emoji) untouched — so rendering is byte-identical for existing
 * payloads and `JSON.parse` round-trips back to the input.
 */
export function serializeJsonLd(value: unknown): string {
  const serialized = JSON.stringify(value) ?? "null"
  return serialized.replace(/</g, "\\u003c")
}
