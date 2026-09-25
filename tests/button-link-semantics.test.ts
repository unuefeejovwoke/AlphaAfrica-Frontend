import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

/**
 * Base UI's Button defaults to `nativeButton`, so it must own the element it
 * renders. Passing `render={<Link />}` (or any anchor) produces a non-<button>
 * while Base UI still expects one, which:
 *
 *   1. logs `Base UI: A component that acts as a button expected a native
 *      <button>...` on every page in dev, and
 *   2. means Base UI merges `type="button"` onto a navigation link.
 *
 * Base UI's own guidance for this case is to style the anchor directly, which
 * is what `ButtonLink` does. This test locks that convention down.
 */

const SCAN_DIRS = ["components", "app"]

function collectTsxFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith(".tsx")) out.push(full)
    }
  }
  for (const dir of SCAN_DIRS) walk(path.resolve(process.cwd(), dir))
  return out
}

/**
 * Returns the source of the open tag starting at `start`, i.e. `<Button …>`.
 * Brace depth keeps `>` characters inside `render={<Link href="/" />}` from
 * terminating the scan early.
 */
function readOpenTag(source: string, start: number): string {
  let depth = 0
  for (let i = start; i < source.length; i += 1) {
    const char = source[i]
    if (char === "{") depth += 1
    else if (char === "}") depth -= 1
    else if (depth === 0 && char === ">") return source.slice(start, i + 1)
  }
  return ""
}

/** The value passed to a `render={…}` prop, outer braces stripped. */
function readRenderValue(tag: string): string {
  const marker = "render={"
  const at = tag.indexOf(marker)
  if (at === -1) return ""
  let depth = 1
  for (let i = at + marker.length; i < tag.length; i += 1) {
    if (tag[i] === "{") depth += 1
    else if (tag[i] === "}") {
      depth -= 1
      if (depth === 0) return tag.slice(at + marker.length, i)
    }
  }
  return ""
}

/** True when the render value is (or returns) a link/anchor element. */
function rendersALink(renderValue: string): boolean {
  const value = renderValue.trim()
  return /^<\/?(Link|a)\b/.test(value) || /=>\s*<\/?(Link|a)\b/.test(value)
}

test("Button never renders a link/anchor through Base UI's render prop", () => {
  const violations: string[] = []

  for (const file of collectTsxFiles()) {
    const source = fs.readFileSync(file, "utf8")
    const relative = path.relative(process.cwd(), file)
    const openTag = /<Button(?=[\s/>])/g

    let match: RegExpExecArray | null
    while ((match = openTag.exec(source)) !== null) {
      const tag = readOpenTag(source, match.index)
      if (!rendersALink(readRenderValue(tag))) continue
      const line = source.slice(0, match.index).split("\n").length
      violations.push(`${relative}:${line}`)
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Base UI forbids links in Button's render prop — use ButtonLink instead.\n` +
      `Offenders:\n  ${violations.join("\n  ")}`
  )
})

test("button primitives export ButtonLink for anchor-styled buttons", () => {
  const buttonPath = path.resolve(process.cwd(), "components/ui/button.tsx")
  assert.ok(fs.existsSync(buttonPath), "components/ui/button.tsx must exist")
  const source = fs.readFileSync(buttonPath, "utf8")

  assert.match(source, /\bButtonLink\b/, "button.tsx must export ButtonLink")
  assert.match(
    source,
    /from ["']next\/link["']/,
    "ButtonLink must render a real next/link anchor"
  )
})

test("ButtonLink is imported from the shared button module where used", () => {
  const missing: string[] = []

  for (const file of collectTsxFiles()) {
    const source = fs.readFileSync(file, "utf8")
    if (!/<ButtonLink(?=[\s/>])/.test(source)) continue
    if (
      /import\s*\{[^}]*\bButtonLink\b[^}]*\}\s*from\s*["']@\/components\/ui\/button["']/.test(
        source
      )
    ) {
      continue
    }
    missing.push(path.relative(process.cwd(), file))
  }

  assert.deepEqual(
    missing,
    [],
    `ButtonLink must be imported from @/components/ui/button.\n  ${missing.join("\n  ")}`
  )
})
