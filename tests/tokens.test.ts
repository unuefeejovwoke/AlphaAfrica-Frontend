import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("Design System Tokens match Alphaa Africa brand palette", () => {
  const cssPath = path.resolve(process.cwd(), "app/globals.css")
  const cssContent = fs.readFileSync(cssPath, "utf-8")

  // Verify core brand hex values are defined in root variables
  assert.match(
    cssContent,
    /--primary:\s*#FF6738/i,
    "Primary token must be brand orange #FF6738"
  )
  assert.match(
    cssContent,
    /--secondary:\s*#571563/i,
    "Secondary token must be brand plum #571563"
  )
  assert.match(
    cssContent,
    /--background:\s*#FAF9F7/i,
    "Background token must be warm off-white #FAF9F7"
  )
  assert.match(
    cssContent,
    /--foreground:\s*#171217/i,
    "Foreground token must be plum near-black #171217"
  )
  assert.match(
    cssContent,
    /--muted-foreground:\s*#6F6870/i,
    "Muted foreground must be plum-slate #6F6870"
  )
  assert.match(
    cssContent,
    /--border:\s*#E9E3E7/i,
    "Border must be warm subtle gray #E9E3E7"
  )
})
