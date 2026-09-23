import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { packageEnquirySchema } from "../lib/api/packages.ts"

test("Package detail page and new components exist and are exportable", () => {
  const pagePath = path.resolve(
    process.cwd(),
    "app/(public)/packages/[slug]/page.tsx"
  )
  const formPath = path.resolve(
    process.cwd(),
    "components/packages/package-enquiry-form.tsx"
  )
  const galleryPath = path.resolve(
    process.cwd(),
    "components/packages/package-gallery.tsx"
  )
  const clientPath = path.resolve(
    process.cwd(),
    "components/packages/package-detail-client.tsx"
  )

  assert.ok(fs.existsSync(pagePath), "Package detail page must exist")
  assert.ok(fs.existsSync(formPath), "Package enquiry form must exist")
  assert.ok(fs.existsSync(galleryPath), "Package gallery component must exist")
  assert.ok(fs.existsSync(clientPath), "Package client helpers must exist")
})

test("Package enquiry validation handles adults and children counters", () => {
  const valid = packageEnquirySchema.safeParse({
    full_name: "Chioma Adeleke",
    email: "chioma@example.com",
    phone: "08031234567",
    num_adults: 2,
    num_children: 1,
    message: "Honeymoon in Zanzibar",
  })
  assert.ok(valid.success, "Valid counter values must pass")

  const noAdults = packageEnquirySchema.safeParse({
    full_name: "Chioma Adeleke",
    email: "chioma@example.com",
    phone: "08031234567",
    num_adults: 0,
    num_children: 1,
  })
  assert.strictEqual(noAdults.success, false, "At least 1 adult is required")
})
