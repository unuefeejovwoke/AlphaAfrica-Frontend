import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

// Legal-link placement.
//
// `/privacy` and `/terms` are reachable from the site footer on every page, but
// a footer link is weak notice on a long single-column form where the only
// thing a guest reads is the CTA. `lib/content/legal.ts` §2 promises each
// product's rules are "disclosed again before you pay", so every surface that
// collects personal data or takes money carries the notice at its own submit
// action.
//
// These tests hold that seam: the notice exists, points at both documents, and
// is actually wired into each form. If a form is added without one, or a link
// goes dead, this fails.

function read(relative: string): string {
  const file = path.resolve(process.cwd(), relative)
  assert.ok(fs.existsSync(file), `${relative} must exist`)
  return fs.readFileSync(file, "utf-8")
}

const NOTICE_PATH = "components/legal/legal-notice.tsx"

/** Forms that collect personal data and/or take money. */
const TRANSACTIONAL_FORMS: { file: string; what: string }[] = [
  {
    file: "components/shared/guest-booking-form.tsx",
    what: "Hotel and Car guest booking",
  },
  {
    file: "components/flights/traveller-details-form.tsx",
    what: "Flight checkout pay bar",
  },
  {
    file: "components/visa/visa-consultation-form.tsx",
    what: "Paid visa consultation",
  },
  {
    file: "components/packages/package-enquiry-form.tsx",
    what: "Package enquiry",
  },
]

test("Legal notice links both documents and states the agreement", () => {
  const notice = read(NOTICE_PATH)

  assert.match(
    notice,
    /href="\/terms"/,
    "Legal notice must link /terms"
  )
  assert.match(
    notice,
    /href="\/privacy"/,
    "Legal notice must link /privacy"
  )
  assert.match(
    notice,
    /By continuing you agree to our/,
    "Legal notice must say what agreeing means, not just list links"
  )
})

test("Legal notice is keyboard-visible, not colour-only", () => {
  const notice = read(NOTICE_PATH)

  // The notice sits on `text-muted-foreground` lines, so the links need their
  // own weight and underline plus a visible focus ring to stay legible and
  // reachable by keyboard.
  assert.match(
    notice,
    /underline/,
    "Legal notice links must be underlined, not colour-only"
  )
  assert.match(
    notice,
    /focus-visible:ring/,
    "Legal notice links need a visible focus ring"
  )
})

test("Every transactional form carries the legal notice at its submit action", () => {
  for (const { file, what } of TRANSACTIONAL_FORMS) {
    const content = read(file)
    assert.match(
      content,
      /LegalNotice/,
      `${what} (${file}) must render the legal notice beside its CTA`
    )
    assert.match(
      content,
      /from "@\/components\/legal\/legal-notice"/,
      `${what} (${file}) must import the shared notice, not restate the copy`
    )
  }
})

test("Footer, sitemap, and the legal pages keep their existing legal links", () => {
  const footer = read("components/navigation/public-footer.tsx")
  assert.match(footer, /href="\/privacy"/, "Footer must link /privacy")
  assert.match(footer, /href="\/terms"/, "Footer must link /terms")

  const sitemap = read("app/sitemap.ts")
  assert.match(
    sitemap,
    /path: "\/privacy"/,
    "Sitemap must list /privacy"
  )
  assert.match(sitemap, /path: "\/terms"/, "Sitemap must list /terms")

  // Each legal document cross-links the other so a reader arriving at one
  // document can reach the other. The href lives on the `related` descriptor,
  // not a literal JSX attribute, because the link is the other document.
  const article = read("components/legal/legal-article.tsx")
  assert.match(
    article,
    /href: "\/terms"/,
    "Legal article must cross-link /terms"
  )
  assert.match(
    article,
    /href: "\/privacy"/,
    "Legal article must cross-link /privacy"
  )
})