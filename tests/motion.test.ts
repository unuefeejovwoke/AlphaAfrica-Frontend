import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

/**
 * Motion layer guard (CSS-only entrance + scroll reveal).
 *
 * Three invariants, each of which has already broken once in the wild:
 *
 *   1. Only `transform` and `opacity` may be animated. Anything else (width,
 *      top, margin, font-size…) forces layout on every frame, which is what
 *      pushes CLS off 0 — a Core Web Vitals regression, not a taste call.
 *   2. `.reveal` must stay behind `@supports (animation-timeline: view())`.
 *      Firefox stable still ships scroll-driven animations behind
 *      `layout.css.scroll-driven-animations.enabled`, so an ungated `view()`
 *      animation leaves every revealed element stuck at `opacity: 0` —
 *      content invisible. Static is the correct Firefox resting state.
 *   3. Reduced motion must neutralise `.reveal` explicitly. The
 *      document-wide backstop collapses `animation-duration`, which a
 *      scroll-driven animation ignores entirely, so duration alone is not
 *      enough to stop it.
 */

const ROOT = process.cwd()

function read(relative: string): string {
  return fs.readFileSync(path.resolve(ROOT, relative), "utf-8")
}

const css = read("app/globals.css")

/** Layout-triggering properties: animating these costs a layout pass per frame. */
const LAYOUT_PROPERTIES = [
  "width",
  "height",
  "top",
  "right",
  "bottom",
  "left",
  "margin",
  "padding",
  "font-size",
  "gap",
  "inset",
]

function keyframeBlocks(source: string): string[] {
  return [...source.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?)\n\}/g)].map(
    (match) => match[1]
  )
}

test("Motion: every @keyframes in globals.css animates only transform/opacity", () => {
  const blocks = keyframeBlocks(css)
  // Guards the guard: if the block extractor ever stops matching the file's
  // formatting, it must fail loudly rather than scan zero blocks and pass.
  assert.equal(
    blocks.length,
    (css.match(/@keyframes/g) ?? []).length,
    "keyframe extraction must cover every @keyframes block in globals.css"
  )
  assert.ok(blocks.length > 0, "globals.css must declare the motion keyframes")

  for (const block of blocks) {
    for (const property of LAYOUT_PROPERTIES) {
      assert.doesNotMatch(
        block,
        new RegExp(`(^|[;{\\s])${property}\\s*:`),
        `@keyframes must not animate "${property}" — it forces layout every frame and moves CLS off 0`
      )
    }
  }
})

test("Motion: the brand easing lives in one token, not scattered arbitrary values", () => {
  assert.ok(
    /--ease-brand:\s*cubic-bezier\(0\.32,\s*0\.72,\s*0,\s*1\)/.test(css),
    "globals.css must define --ease-brand as the single house easing"
  )

  const offenders: string[] = []
  const walk = (dir: string) => {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      // A missing directory would make the scan cover zero files and report
      // green, so treat it as a failure rather than skipping quietly.
      assert.fail(`Scan directory ${path.relative(ROOT, dir)} is missing`)
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name)) {
        if (/cubic-bezier\(0\.32,\s*0\.72,\s*0,\s*1\)/.test(fs.readFileSync(full, "utf-8"))) {
          offenders.push(path.relative(ROOT, full))
        }
      }
    }
  }
  for (const dir of ["components", "app", "lib"]) {
    walk(path.resolve(ROOT, dir))
  }

  assert.deepEqual(
    offenders,
    [],
    "Use the ease-brand utility instead of re-inlining the curve in components"
  )
})

test("Motion: .reveal is gated behind @supports so Firefox keeps static content", () => {
  const utility = css.match(/@utility\s+reveal\s*\{([\s\S]*?)\n\}/)
  assert.ok(utility, "globals.css must register .reveal as a utility")

  assert.match(
    utility[1],
    /@supports\s*\(animation-timeline:\s*view\(\)\)/,
    ".reveal must opt in via @supports — Firefox would otherwise freeze content at opacity 0"
  )
  assert.match(
    utility[1],
    /animation-timeline:\s*view\(\)/,
    ".reveal must drive itself off the element's view progress"
  )

  // The `animation` shorthand resets every animation-* longhand back to its
  // initial value, so it must be declared BEFORE animation-timeline and
  // animation-range. Reversing these lines silently kills the whole effect
  // while every other assertion here still passes. Compare only the
  // declarations — the @supports condition above them repeats the property
  // name and would otherwise look like the first occurrence.
  const declarations = utility[1].slice(
    utility[1].indexOf("{", utility[1].indexOf("@supports")) + 1
  )
  const shorthandAt = declarations.indexOf("animation:")
  const timelineAt = declarations.indexOf("animation-timeline:")
  const rangeAt = declarations.indexOf("animation-range:")
  assert.ok(
    shorthandAt !== -1 && shorthandAt < timelineAt && shorthandAt < rangeAt,
    "the `animation` shorthand must come first — it resets animation-timeline and animation-range to auto/normal"
  )

  // `both` is what holds a below-the-fold card at its hidden `from` state
  // instead of flashing it visible before the range begins. Dropping it would
  // reintroduce a pop, so assert it is still there.
  assert.match(
    declarations,
    /animation:[^;]*\bboth\b/,
    ".reveal needs fill-mode `both` so off-screen cards rest at their `from` state"
  )
})

test("Motion: printing disables .reveal so off-screen cards are not blank", () => {
  const block = css.match(/@media\s+print\s*\{([\s\S]*?)\n\}/)
  assert.ok(block, "globals.css must keep its print stylesheet")

  assert.match(
    block[1],
    /\.reveal[^{]*\{[^}]*animation:\s*none\s*!important/,
    "Print must clear .reveal — a card below the fold never scrolled into view and would print at opacity 0"
  )
})

test("Motion: reduced motion explicitly disables .reveal", () => {
  const block = css.match(
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/
  )
  assert.ok(block, "globals.css must keep the reduced-motion backstop")

  assert.match(
    block[1],
    /\.reveal[^{]*\{[^}]*animation:\s*none\s*!important/,
    "Reduced motion must set animation: none on .reveal — animation-duration alone does not stop a scroll-driven animation"
  )
})