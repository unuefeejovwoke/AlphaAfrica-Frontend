import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  getSiteUrl,
  canonicalUrl,
  organizationJsonLd,
  websiteJsonLd,
  faqPageJsonLd,
} from "../lib/seo.ts"
import { formatNaira } from "../lib/format.ts"
import type { FaqGroup } from "../lib/content/faqs.ts"
import { getHomepageFaqs } from "../lib/content/faqs.ts"
import { getFeaturedDestinations } from "../lib/api/destinations.ts"
import { getFeaturedPackages } from "../lib/api/packages.ts"

// --- lib/seo.ts (TDD seam: pure helpers) ---

test("Site URL resolves from env with a production fallback", () => {
  const url = getSiteUrl()
  assert.ok(url.startsWith("https://"), "Site URL must be absolute https")
  assert.doesNotMatch(url, /\/$/, "Site URL must not end with a slash")
})

test("Canonical URLs join the site root with page paths", () => {
  assert.equal(canonicalUrl("/about"), `${getSiteUrl()}/about`)
  assert.equal(canonicalUrl("/"), `${getSiteUrl()}/`)
})

test("Organization JSON-LD carries identity and contact points", () => {
  const jsonLd = organizationJsonLd()
  assert.equal(jsonLd["@context"], "https://schema.org")
  assert.equal(jsonLd["@type"], "TravelAgency")
  assert.ok(String(jsonLd.name).length > 0, "Organization must be named")
  assert.ok(
    Array.isArray(jsonLd.contactPoint) && jsonLd.contactPoint.length > 0,
    "Organization must expose contact points"
  )
  assert.ok(
    typeof jsonLd.address === "object",
    "Organization must carry a postal address"
  )
})

test("FAQPage JSON-LD mirrors every published question and answer", () => {
  const groups: FaqGroup[] = [
    {
      id: "payments",
      title: "Payments",
      description: "",
      faqs: [
        {
          id: "q1",
          question: "How do I pay?",
          answer: "Via Paystack.",
          source: "draft" as const,
        },
      ],
    },
  ]
  const jsonLd = faqPageJsonLd(groups)
  assert.equal(jsonLd["@type"], "FAQPage")
  assert.equal(jsonLd.mainEntity.length, 1)
  assert.equal(jsonLd.mainEntity[0].name, "How do I pay?")
  assert.match(jsonLd.mainEntity[0].acceptedAnswer.text, /Paystack/)
})

test("Naira prices format without fractions for card display", () => {
  assert.equal(formatNaira("250000"), "₦250,000")
  assert.equal(formatNaira("99999.99"), "₦100,000")
})

// --- Featured fetchers (TDD seam: mocked fetch boundary) ---

function stubFetch(payload: unknown, status = 200) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(payload), { status })) as typeof fetch
  return () => {
    globalThis.fetch = originalFetch
  }
}

test("Featured destinations prefer featured flags and fall back gracefully", async () => {
  const restore = stubFetch({
    count: 3,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        name: "A",
        slug: "a",
        country: "X",
        main_image: "i",
        package_count: 2,
        starting_price: "100",
        is_featured: false,
      },
      {
        id: 2,
        name: "B",
        slug: "b",
        country: "Y",
        main_image: "i",
        package_count: 1,
        starting_price: "200",
        is_featured: true,
      },
    ],
  })
  try {
    const featured = await getFeaturedDestinations(6)
    assert.equal(featured.length, 1, "Featured flags win when present")
    assert.equal(featured[0].slug, "b")
  } finally {
    restore()
  }

  const restore2 = stubFetch({
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        name: "A",
        slug: "a",
        country: "X",
        main_image: "i",
        package_count: 2,
        starting_price: "100",
      },
      {
        id: 2,
        name: "B",
        slug: "b",
        country: "Y",
        main_image: "i",
        package_count: 1,
        starting_price: "200",
      },
    ],
  })
  try {
    const fallback = await getFeaturedDestinations(6)
    assert.equal(
      fallback.length,
      2,
      "Falls back to latest when nothing is flagged"
    )
  } finally {
    restore2()
  }
})

test("Featured packages prefer featured flags and respect the limit", async () => {
  const restore = stubFetch({
    count: 4,
    next: null,
    previous: null,
    results: [1, 2, 3, 4].map((n) => ({
      id: n,
      title: `Trip ${n}`,
      slug: `trip-${n}`,
      destination_name: "Dubai",
      duration_days: 5,
      price: "1000",
      main_image: "i",
      is_featured: n > 2,
    })),
  })
  try {
    const featured = await getFeaturedPackages(6)
    assert.equal(featured.length, 2, "Only flagged packages are featured")
    const limited = await getFeaturedPackages(1)
    assert.equal(limited.length, 1, "Limit is respected")
  } finally {
    restore()
  }
})

// --- Route contracts (external behavior at the file seam) ---

function readRoute(relative: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relative), "utf-8")
}

test("Home is an ISR Server Component with parallel featured sections", () => {
  const content = readRoute("app/(public)/page.tsx")
  assert.doesNotMatch(
    content,
    /"use client"/,
    "Home must be a React Server Component"
  )
  assert.match(
    content,
    /export const revalidate = 3600/,
    "Home must revalidate every 3600s"
  )
  assert.match(content, /generateMetadata/, "Home must expose metadata for SEO")
  assert.match(
    content,
    /Suspense/,
    "Featured sections must stream inside Suspense"
  )
  assert.match(content, /FeaturedPackages/, "Home must render live packages")
  assert.match(content, /application\/ld\+json/, "Home must embed JSON-LD")
})

test("Featured sections cover empty and error states with a support hatch", () => {
  const shared = readRoute("components/home/featured-state.tsx")
  assert.match(
    shared,
    /No featured trips right now/,
    "Shared empty state must use the specced copy"
  )
  assert.match(shared, /ErrorState/, "Shared error state must reuse ErrorState")
  assert.match(shared, /RetryButton/, "Shared error state must offer retry")
  assert.match(
    shared,
    /Talk to Alphaa/,
    "Empty and error states must hatch to WhatsApp support"
  )
  for (const file of [
    "components/home/featured-destinations.tsx",
    "components/home/featured-packages.tsx",
  ]) {
    const section = readRoute(file)
    assert.match(
      section,
      /FeaturedEmpty/,
      `${file} must render the shared empty state`
    )
    assert.match(
      section,
      /FeaturedError/,
      `${file} must render the shared error state`
    )
  }
})

test("Future-phase search tabs hatch to support instead of 404ing", () => {
  const content = readRoute("components/home/home-search-switcher.tsx")
  assert.match(content, /role="tablist"/, "Tabs must use the tablist pattern")
  assert.match(content, /aria-selected/, "Active tab must be announced")
  assert.match(
    content,
    /ComingSoonHatch/,
    "Flights/Hotels/Cars must hatch to support"
  )
  assert.doesNotMatch(
    content,
    /href="\/flights"|href="\/hotels"|href="\/car-rentals"/,
    "No dead links to unbuilt routes"
  )
})

test("About establishes trust from lib/content in eight lean sections", () => {
  const content = readRoute("app/(public)/about/page.tsx")
  assert.doesNotMatch(
    content,
    /"use client"/,
    "About must be a React Server Component"
  )
  assert.match(
    content,
    /export const revalidate = 3600/,
    "About must revalidate every 3600s"
  )
  assert.match(
    content,
    /generateMetadata/,
    "About must expose metadata for SEO"
  )
  assert.match(
    content,
    /lib\/content\/company/,
    "About copy must come from company.ts"
  )
  assert.match(
    content,
    /application\/ld\+json/,
    "About must embed Organization JSON-LD"
  )
  for (const heading of [
    "Who Alphaa is",
    "What we help",
    "Services",
    "Why customers choose",
    "Human support",
    "Abuja office",
  ]) {
    assert.match(content, new RegExp(heading), `About must include: ${heading}`)
  }
})

test("Contact has no form, lazy map embed, and emergency guidance", () => {
  const content = readRoute("app/(public)/contact/page.tsx")
  assert.doesNotMatch(
    content,
    /"use client"/,
    "Contact must be a React Server Component"
  )
  assert.match(
    content,
    /export const revalidate = 3600/,
    "Contact must revalidate every 3600s"
  )
  assert.match(
    content,
    /generateMetadata/,
    "Contact must expose metadata for SEO"
  )
  assert.doesNotMatch(content, /<form/, "Contact must not post a fake form")
  assert.doesNotMatch(
    content,
    /useForm|react-hook-form/,
    "Contact must not wire form validation"
  )
  assert.match(content, /<iframe/, "Contact must embed the office map")
  assert.match(content, /loading="lazy"/, "Map must lazy-load")
  assert.match(content, /title="/, "Map iframe must have an accessible title")
  assert.match(
    content,
    /maps\.google\.com\/maps\?q=|getOfficeMapEmbedUrl/,
    "Map must use the no-key embed from company.ts"
  )
  assert.match(
    content,
    /lib\/content\/contact/,
    "Channels must come from contact.ts"
  )
  assert.match(content, /href="\/faq"/, "Contact must tease the FAQ page")
})

test("FAQ renders crawlable groups with FAQPage JSON-LD and draft marking", () => {
  const content = readRoute("app/(public)/faq/page.tsx")
  assert.doesNotMatch(
    content,
    /"use client"/,
    "FAQ must be a React Server Component"
  )
  assert.match(
    content,
    /export const revalidate = 3600/,
    "FAQ must revalidate every 3600s"
  )
  assert.match(content, /generateMetadata/, "FAQ must expose metadata for SEO")
  assert.match(
    content,
    /lib\/content\/faqs/,
    "FAQ content must come from faqs.ts"
  )
  assert.match(content, /faqPageJsonLd/, "FAQ must embed FAQPage JSON-LD")
  assert.match(content, /id=\{`faq-/, "FAQ groups must be anchor-addressable")
  assert.match(
    content,
    /raft/,
    "FAQ answers must be draft-marked until verified"
  )
})

test("Home FAQ section pulls 5 distinct FAQs from lib/content/faqs and renders after TerminalCta", () => {
  const homeContent = readRoute("app/(public)/page.tsx")
  assert.match(
    homeContent,
    /<TerminalCta[\s\S]*<HomeFaq/,
    "FAQ section must appear after the CTA"
  )

  const faqs = getHomepageFaqs()
  assert.equal(
    faqs.length,
    5,
    "Homepage FAQ section must have exactly 5 questions"
  )
  const uniqueIds = new Set(faqs.map((f) => f.id))
  assert.equal(uniqueIds.size, 5, "Homepage FAQs must be 5 distinct questions")

  for (const faq of faqs) {
    assert.ok(
      faq.question.length > 0,
      "Each FAQ must have a non-empty question"
    )
    assert.ok(faq.answer.length > 0, "Each FAQ must have a non-empty answer")
    assert.ok(
      faq.category.length > 0,
      "Each FAQ must have an identified category"
    )
  }

  const faqComponent = readRoute("components/home/home-faq.tsx")
  assert.match(
    faqComponent,
    /"use client"/,
    "HomeFaq must be an interactive Client Component"
  )
  assert.match(
    faqComponent,
    /@base-ui\/react\/accordion/,
    "HomeFaq must use Base UI Accordion"
  )
  assert.doesNotMatch(
    faqComponent,
    /<Accordion\.Root[^>]*\bmultiple\b/,
    "HomeFaq must not enable the multiple prop"
  )
})
