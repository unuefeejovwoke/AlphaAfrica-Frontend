import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("Public Navigation component provides all required service links and CTA", () => {
  const navPath = path.resolve(
    process.cwd(),
    "components/navigation/public-nav.tsx"
  )
  assert.ok(fs.existsSync(navPath), "public-nav.tsx must exist")
  const content = fs.readFileSync(navPath, "utf-8")

  assert.match(content, /Flights/i, "Nav must have Flights link")
  assert.match(content, /Hotels/i, "Nav must have Hotels link")
  assert.match(content, /Packages/i, "Nav must have Packages link")
  assert.match(content, /Visa/i, "Nav must have Visa link")
  assert.match(content, /Car/i, "Nav must have Car Rentals link")
  assert.match(content, /Destinations/i, "Nav must have Destinations link")
  assert.match(
    content,
    /Plan a Trip/i,
    "Nav must have 'Plan a Trip' primary CTA"
  )
})

test("Public Footer component provides Abuja office details and WhatsApp contact", () => {
  const footerPath = path.resolve(
    process.cwd(),
    "components/navigation/public-footer.tsx"
  )
  assert.ok(fs.existsSync(footerPath), "public-footer.tsx must exist")
  const content = fs.readFileSync(footerPath, "utf-8")

  assert.match(content, /Abuja/i, "Footer must mention Abuja headquarters")
  assert.match(content, /WhatsApp/i, "Footer must link to WhatsApp support")
})
