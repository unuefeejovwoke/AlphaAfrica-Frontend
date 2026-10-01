/**
 * Reuse-identity digest (production hardening, 06).
 *
 * Pending-booking reuse keys are stored in browser sessionStorage, so they
 * must never carry readable traveller or guest payloads (names, passports,
 * dates of birth, emails, phones). {@link digestKey} reduces the canonical
 * key material to a short hex digest: identical attempts still hash
 * identically (so reuse keeps working), but nothing readable is persisted.
 *
 * cyrb53 is a non-cryptographic hash — it hides casual reads, it is not
 * encryption. That matches the threat model: sessionStorage is same-origin,
 * so the goal is keeping PII out of persisted browser state (shared devices,
 * devtools glances, stored snapshots), not defending against an attacker who
 * already runs code in the origin.
 */
export function digestKey(canonical: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < canonical.length; i++) {
    const ch = canonical.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0")
  )
}
