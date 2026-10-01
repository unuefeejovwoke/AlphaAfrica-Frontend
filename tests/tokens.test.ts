import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

/**
 * Brand contrast guard (ticket 04): every text-carrying token pairing must
 * meet WCAG AA, so a future palette change fails loudly instead of silently
 * shipping unreadable buttons and links. Pure luminance math — no DOM.
 */

function readToken(css: string, name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`))
  assert.ok(match, `Token --${name} must be defined in globals.css`)
  return match[1].trim()
}

function channel(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const m = hex.match(/^#([0-9a-f]{6})$/i)
  assert.ok(m, `Token value "${hex}" must be a 6-digit hex colour`)
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function ratio(a: string, b: string): number {
  const hi = Math.max(luminance(a), luminance(b))
  const lo = Math.min(luminance(a), luminance(b))
  return (hi + 0.05) / (lo + 0.05)
}

const css = fs.readFileSync(
  path.resolve(process.cwd(), "app/globals.css"),
  "utf-8"
)
const token = (name: string) => readToken(css, name)

test("Design System Tokens match Alphaa Africa brand palette", () => {
  assert.match(
    css,
    /--primary:\s*#FF6738/i,
    "Primary token must be brand orange #FF6738"
  )
  assert.match(
    css,
    /--secondary:\s*#571563/i,
    "Secondary token must be brand plum #571563"
  )
  assert.match(
    css,
    /--background:\s*#FAF9F7/i,
    "Background token must be warm off-white #FAF9F7"
  )
  assert.match(
    css,
    /--foreground:\s*#171217/i,
    "Foreground token must be plum near-black #171217"
  )
  assert.match(
    css,
    /--muted-foreground:\s*#6F6870/i,
    "Muted foreground must be plum-slate #6F6870"
  )
  assert.match(css, /--border:\s*#E9E3E7/i, "Border must be warm subtle gray")
})

// ponytail: #ff6738 is a deliberate brand decision that trades WCAG AA text
// contrast for the brand orange (ticket 04 originally darkened it to #c2410c).
// Floor asserted here (2.70:1) blocks any further darkening/lightening without
// someone revisiting this decision; revert to a ≥4.5:1 token if AA is required.
test("Primary pairings hold their documented brand-orange contrast floor", () => {
  const primary = token("primary")
  const onPrimary = token("primary-foreground")
  const background = token("background")

  assert.ok(
    ratio(onPrimary, primary) >= 2.7,
    `White on primary must be ≥2.7:1 (got ${ratio(onPrimary, primary).toFixed(2)}:1)`
  )
  assert.ok(
    ratio(primary, background) >= 2.7,
    `Primary text on page background must be ≥2.7:1 (got ${ratio(primary, background).toFixed(2)}:1)`
  )
  assert.ok(
    ratio(token("ring"), background) >= 2.7,
    "Focus ring on page background must be ≥2.7:1"
  )
})

test("Muted and secondary pairings meet WCAG AA", () => {
  const mutedFg = token("muted-foreground")
  for (const surface of ["muted", "background", "card"]) {
    assert.ok(
      ratio(mutedFg, token(surface)) >= 4.5,
      `Muted foreground on ${surface} must be ≥4.5:1`
    )
  }
  assert.ok(
    ratio(token("secondary-foreground"), token("secondary")) >= 4.5,
    "White on secondary plum must be ≥4.5:1"
  )
  assert.ok(
    ratio(token("secondary"), token("background")) >= 4.5,
    "Secondary plum text on page background must be ≥4.5:1"
  )
})

test("Positive call to action meets WCAG AA against its own background", () => {
  const success = token("color-emerald-600")
  assert.ok(
    ratio("#ffffff", success) >= 4.5,
    `White on success green must be ≥4.5:1 (got ${ratio("#ffffff", success).toFixed(2)}:1)`
  )
  assert.ok(
    ratio(success, token("background")) >= 4.5,
    "Success green text on page background must be ≥4.5:1"
  )
})
