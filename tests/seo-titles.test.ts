import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import { company } from "../lib/content/company.ts"
import {
  CARS_LANDING_TITLE,
  FLIGHTS_LANDING_TITLE,
  HOTELS_LANDING_TITLE,
} from "../lib/seo.ts"
import { contact } from "../lib/content/contact.ts"
import { faqs } from "../lib/content/faqs.ts"
import { privacyPolicy, termsConditions } from "../lib/content/legal.ts"

// Title composition.
//
// `app/layout.tsx` deliberately declares NO `title.template`. Every route ships
// an absolute `<title>` that already ends with the brand, so a template would
// render "… | Alphaa Africa | Alphaa Africa" — Next applies templates to
// child-segment string titles, and the homepage included. These tests hold
// both halves of that contract: the template stays gone, and the titles that
// replace it keep naming the brand exactly once.

const BRAND = company.brandName
const BRAND_SUFFIX = `| ${BRAND}`

function read(relative: string): string {
  const file = path.resolve(process.cwd(), relative)
  assert.ok(fs.existsSync(file), `${relative} must exist`)
  return fs.readFileSync(file, "utf-8")
}

function walk(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else if (/\.tsx?$/.test(entry.name)) files.push(full)
  }
  return files
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

test("The root layout declares no title template", () => {
  const layout = read("app/layout.tsx")
  assert.ok(
    !/template\s*:/.test(layout),
    "app/layout.tsx must not declare a title template — page titles already " +
      `end with "${BRAND_SUFFIX.trim()}", so a template duplicates the brand`
  )
})

test("Shared title constants name the brand exactly once", () => {
  const titles: Record<string, string> = {
    FLIGHTS_LANDING_TITLE,
    HOTELS_LANDING_TITLE,
    CARS_LANDING_TITLE,
    "contact.seo.title": contact.seo.title,
    "faqs.seo.title": faqs.seo.title,
    "privacyPolicy.seo.title": privacyPolicy.seo.title,
    "termsConditions.seo.title": termsConditions.seo.title,
    "company.seo.title": company.seo.title,
  }
  for (const [name, title] of Object.entries(titles)) {
    assert.ok(
      title.includes(BRAND),
      `${name} must name the brand: ${JSON.stringify(title)}`
    )
    assert.equal(
      occurrences(title.toLowerCase(), BRAND.toLowerCase()),
      1,
      `${name} must name the brand exactly once: ${JSON.stringify(title)}`
    )
  }
})

test("No source file repeats the brand inside a title", () => {
  const offenders: string[] = []
  for (const root of ["app", "lib", "components"]) {
    for (const full of walk(path.resolve(process.cwd(), root))) {
      const relative = path.relative(process.cwd(), full)
      fs.readFileSync(full, "utf-8")
        .split("\n")
        .forEach((line, index) => {
          if (
            line.includes(BRAND_SUFFIX) &&
            occurrences(line, BRAND_SUFFIX) > 1
          ) {
            offenders.push(`${relative}:${index + 1}`)
          }
        })
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `brand suffix repeated on the same line (renders "…${BRAND} ${BRAND}"): ${offenders.join(", ")}`
  )
})

test("OG cards do not reuse SERP descriptions as card copy", () => {
  // A share card is read in a feed in under a second: it has room for one
  // human line. Meta descriptions are keyword-loaded and get truncated
  // mid-word by the card's `slice()`.
  const offenders: string[] = []
  const dir = path.resolve(process.cwd(), "app")
  for (const full of walk(dir)) {
    if (!full.endsWith("opengraph-image.tsx")) continue
    const relative = path.relative(process.cwd(), full)
    if (/DESCRIPTION|_LANDING_/.test(fs.readFileSync(full, "utf-8"))) {
      offenders.push(relative)
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `OG card copy must be human lines, not SERP descriptions: ${offenders.join(", ")}`
  )
})
