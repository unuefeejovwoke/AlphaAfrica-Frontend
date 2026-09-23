import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  ApiError,
  apiGet,
  buildApiUrl,
  getApiBaseUrl,
  getHumanErrorMessage,
  getPaymentSafetyCopy,
  API_REVALIDATE_SECONDS,
} from "../lib/api/client.ts"
import {
  normalizeNigerianPhone,
  nigerianPhoneSchema,
  futureDateStringSchema,
  optionalFutureDateStringSchema,
} from "../lib/api/validation.ts"
import { packageEnquirySchema } from "../lib/api/packages.ts"
import {
  visaConsultationSchema,
  TRAVEL_PURPOSE_LABELS,
} from "../lib/api/visa.ts"
import {
  company,
  getOfficeMapEmbedUrl,
  getSupportWhatsAppUrl,
} from "../lib/content/company.ts"
import { contact } from "../lib/content/contact.ts"
import { faqs } from "../lib/content/faqs.ts"
import { testimonials } from "../lib/content/testimonials.ts"
import { stats } from "../lib/content/stats.ts"

// --- lib/api/client ---

test("API client uses ISR revalidate 3600 and env-driven base URL", () => {
  assert.equal(
    API_REVALIDATE_SECONDS,
    3600,
    "Server GET must revalidate every 3600s"
  )
  const url = buildApiUrl("/api/packages/destinations/", { page: 2 })
  assert.match(url, /\/api\/packages\/destinations\/\?page=2/)
  assert.ok(getApiBaseUrl().length > 0, "Base URL must resolve")
  assert.doesNotMatch(
    getApiBaseUrl(),
    /\/$/,
    "Base URL must not end with a slash"
  )
})

test("ApiError maps to human copy and never leaks raw backend errors", () => {
  const network = new ApiError("fetch failed", {
    status: null,
    code: "network",
  })
  const message = getHumanErrorMessage(network)
  assert.doesNotMatch(
    message,
    /fetch failed/,
    "Must not surface raw error text"
  )
  assert.match(message, /travel service|connection/i)

  const rawBackend = new ApiError('{"email":["Enter a valid email"]}', {
    status: 400,
    code: "validation",
  })
  const human = getHumanErrorMessage(rawBackend)
  assert.doesNotMatch(
    human,
    /Enter a valid email/,
    "Must not surface raw backend payload"
  )
  assert.match(human, /details need attention/i)

  const generic = getHumanErrorMessage(new Error("Something went wrong"))
  assert.notStrictEqual(generic, "Something went wrong")
  assert.ok(
    getPaymentSafetyCopy().length > 20,
    "Payment safety copy must reassure"
  )
})

// --- Nigerian parity (PRD §10) ---

test("Nigerian phone numbers normalize before submission", () => {
  assert.equal(normalizeNigerianPhone("0803 123 4567"), "+2348031234567")
  assert.equal(normalizeNigerianPhone("+234 803 123 4567"), "+2348031234567")
  assert.equal(normalizeNigerianPhone("2348031234567"), "+2348031234567")

  const schema = nigerianPhoneSchema()
  assert.equal(schema.parse("08031234567"), "+2348031234567")
  assert.throws(() => schema.parse("abc123"), /valid/i, "Must reject letters")
  assert.throws(
    () => schema.parse("123"),
    /too short/i,
    "Must reject too-short numbers"
  )
})

test("Travel dates reject impossible and past dates", () => {
  const schema = futureDateStringSchema("Preferred date")
  assert.throws(
    () => schema.parse("2026-02-30"),
    /valid/i,
    "Must reject impossible dates"
  )
  assert.throws(
    () => schema.parse("2000-01-01"),
    /past/i,
    "Must reject past dates"
  )
  const future = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10)
  assert.equal(schema.parse(future), future, "Must accept future dates")
})

test("Optional preferred-date distinguishes invalid from past dates", () => {
  const schema = optionalFutureDateStringSchema()
  assert.equal(schema.parse(null), null, "Empty stays empty")
  assert.equal(schema.parse(""), null, "Blank stays empty")
  assert.throws(
    () => schema.parse("not-a-date"),
    /valid/i,
    "Malformed input reports validity"
  )
  assert.throws(
    () => schema.parse("2000-01-01"),
    /past/i,
    "Past dates report recency"
  )
})

test("Package Enquiry accepts RHF payload with counter parity", () => {
  const future = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10)
  const parsed = packageEnquirySchema.parse({
    full_name: "Adaeze Obi",
    email: "adaeze@example.com",
    phone: "08031234567",
    preferred_date: future,
    num_adults: 2,
    num_children: 1,
    message: "Honeymoon planning",
  })
  assert.equal(parsed.phone, "+2348031234567", "Phone must normalize")
  assert.throws(
    () =>
      packageEnquirySchema.parse({
        full_name: "A",
        email: "not-an-email",
        phone: "08031234567",
        num_adults: 0,
        num_children: -1,
      }),
    /./,
    "Must reject zero adults and negative children"
  )
})

test("Visa Consultation validates purpose, applicants, and phone", () => {
  const future = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10)
  const parsed = visaConsultationSchema.parse({
    country_id: 3,
    full_name: "Ibrahim Musa",
    email: "ibrahim@example.com",
    phone: "+2348031234567",
    travel_purpose: "study",
    preferred_date: future,
    num_applicants: 1,
    message: "",
  })
  assert.equal(parsed.travel_purpose, "study")
  assert.equal(TRAVEL_PURPOSE_LABELS.study, "Study")
  assert.throws(
    () =>
      visaConsultationSchema.parse({
        country_id: 0,
        full_name: "x",
        email: "bad",
        phone: "1",
        num_applicants: 0,
      }),
    /./,
    "Must reject zero applicants and invalid contact details"
  )
})

// --- lib/content ---

test("Verification reads never use the ISR cache (PRD §13)", async () => {
  const seen: { url: string; init: RequestInit }[] = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen.push({ url, init })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }) as typeof fetch
  try {
    await apiGet<{ ok: boolean }>("/api/visa/verify/ABC123/", { noStore: true })
  } finally {
    globalThis.fetch = originalFetch
  }
  assert.equal(seen.length, 1)
  assert.equal(
    seen[0].init.cache,
    "no-store",
    "Verification must bypass the Data Cache"
  )
  assert.ok(
    !("next" in (seen[0].init as object)),
    "Verification must not set revalidate tags"
  )
})

test("Optional preferred-date distinguishes invalid from past dates", () => {
  const schema = optionalFutureDateStringSchema()
  assert.equal(schema.parse(null), null, "Empty stays empty")
  assert.equal(schema.parse(""), null, "Blank stays empty")
  assert.throws(
    () => schema.parse("not-a-date"),
    /valid/i,
    "Malformed input reports validity"
  )
  assert.throws(
    () => schema.parse("2000-01-01"),
    /past/i,
    "Past dates report recency"
  )
})

test("Company module is the single source for contact details", () => {
  assert.equal(company.source, "draft")
  assert.match(
    company.whatsapp.number,
    /^\d+$/,
    "WhatsApp number must be digits only"
  )
  assert.match(company.phone.e164, /^\+234\d+$/)
  assert.match(
    getSupportWhatsAppUrl("holiday packages"),
    /wa\.me.*holiday%20packages|wa\.me.*holiday/i
  )
  assert.match(getOfficeMapEmbedUrl(), /maps\.google\.com.*output=embed/)
  assert.ok(
    company.seo.title.length > 10 && company.seo.description.length > 20
  )
})

test("Contact module defers numbers to company.ts with hours and emergency", () => {
  const whatsapp = contact.channels.find((c) => c.id === "whatsapp")
  assert.ok(
    whatsapp?.href.includes(company.whatsapp.number),
    "WhatsApp must use company number"
  )
  const phone = contact.channels.find((c) => c.id === "phone")
  assert.equal(phone?.href, company.phone.href)
  assert.match(contact.hours.label, /Monday.*Saturday/i)
  assert.match(contact.emergency.description, /reconcile/i)
})

test("FAQs cover all PRD §8.12 groups with draft entries", () => {
  const ids = faqs.groups.map((g) => g.id).sort()
  assert.deepEqual(
    ids,
    [
      "account",
      "cancellation",
      "cars",
      "changes",
      "flights",
      "general",
      "hotels",
      "packages",
      "payments",
      "visa",
    ].sort(),
    "Must cover all 10 FAQ groups"
  )
  for (const group of faqs.groups) {
    assert.ok(group.faqs.length >= 2, `${group.id} must have draft entries`)
    for (const faq of group.faqs) {
      assert.equal(faq.source, "draft", "FAQ entries stay draft until verified")
    }
  }
})

test("Testimonials and stats stay empty until verified numbers are supplied", () => {
  assert.equal(
    testimonials.testimonials.length,
    0,
    "No fabricated testimonials"
  )
  assert.equal(stats.stats.length, 0, "No invented statistics")
})

test("No hardcoded support numbers outside lib/content/company.ts", () => {
  const roots = ["app", "components"]
  const offenders: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (/\.tsx?$/.test(entry.name)) {
        const content = fs.readFileSync(full, "utf-8")
        if (
          /2348000000000|234 800 000 0000|support@alphaaafrica\.com/.test(
            content
          )
        ) {
          offenders.push(path.relative(process.cwd(), full))
        }
      }
    }
  }
  for (const root of roots) {
    walk(path.resolve(process.cwd(), root))
  }
  assert.deepEqual(
    offenders,
    [],
    `Hardcoded contact details found: ${offenders.join(", ")}`
  )

  // Every surface that renders a support number must import it from company.ts.
  const consumers = [
    "components/support/assisted-support-widget.tsx",
    "components/feedback/error-state.tsx",
    "components/navigation/public-footer.tsx",
    "app/(checkout)/layout.tsx",
    "app/(public)/page.tsx",
    "app/(public)/foundation/page.tsx",
  ]
  for (const relative of consumers) {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), relative),
      "utf-8"
    )
    assert.match(
      content,
      /lib\/content\/company/,
      `${relative} must read contact details from lib/content/company.ts`
    )
  }
})
