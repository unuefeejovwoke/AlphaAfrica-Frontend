import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { getTestimonials, testimonials } from "../lib/content/testimonials.ts"

test("Testimonials content module provides realistic Nigerian travel reviews", () => {
  const list = getTestimonials()
  assert.ok(Array.isArray(list), "Must return an array")
  assert.ok(list.length >= 3, "Must have at least 3 realistic testimonials for slider")
  assert.equal(testimonials.source, "verified", "Source must be verified")

  for (const item of list) {
    assert.ok(item.quote.trim().length > 20, "Quote must be substantive")
    assert.ok(item.quote.trim().length < 240, "Quote must stay ~3 lines for card calm")
    assert.ok(item.name.trim().length > 0, "Name required")
    assert.ok(item.role.trim().length > 0, "Role required")
    assert.ok(item.source === "verified" || item.source === "draft", "Source must be valid ContentSource")
  }

  // Authentic Nigerian locations and scenarios
  const combined = list.map((t) => `${t.name} ${t.location ?? ""} ${t.trip ?? ""} ${t.quote}`).join(" ")
  assert.match(combined, /Lagos/i, "Must cover Lagos travel context")
  assert.match(combined, /Abuja/i, "Must cover Abuja travel context")
})

test("Home page renders HomeTestimonials before TerminalCta", () => {
  const homePath = path.resolve(process.cwd(), "app/(public)/page.tsx")
  assert.ok(fs.existsSync(homePath), "page.tsx must exist")
  const content = fs.readFileSync(homePath, "utf-8")

  assert.match(content, /HomeTestimonials/, "Home page must import and use HomeTestimonials")
  assert.match(
    content,
    /<FeaturedPackages[\s\S]*<HomeTestimonials[\s\S]*<TerminalCta/,
    "HomeTestimonials must be placed after FeaturedPackages and before TerminalCta"
  )
})

test("HomeTestimonials component provides accessible slider structure with auto-slide", () => {
  const componentPath = path.resolve(
    process.cwd(),
    "components/home/home-testimonials.tsx"
  )
  assert.ok(fs.existsSync(componentPath), "home-testimonials.tsx must exist")
  const content = fs.readFileSync(componentPath, "utf-8")

  assert.match(content, /carousel/i, "Slider must have carousel ARIA role")
  assert.match(content, /Previous testimonial/i, "Must have previous button label")
  assert.match(content, /Next testimonial/i, "Must have next button label")
  assert.match(content, /snap-x/i, "Must utilize native CSS scroll-snap")
  assert.match(
    content,
    /What our customers are saying/,
    "Must feature customer reviews headline"
  )
  assert.match(content, /setInterval/, "Must include auto-sliding interval")
  assert.match(content, /onMouseEnter/, "Must pause auto-slide on hover")
  assert.match(content, /prefers-reduced-motion/, "Must respect reduced-motion")
})
