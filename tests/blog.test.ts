import test from "node:test"
import assert from "node:assert/strict"

import {
  blogPostDetailSchema,
  blogPostListSchema,
  paginatedBlogPostListSchema,
} from "../lib/api/blog.ts"
import {
  blogDetailJsonLd,
  blogListJsonLd,
  buildBlogSearchParams,
  deriveTocFromBody,
  formatBlogDate,
  hasBlogSearchParams,
  parseBlogOrdering,
  parseBlogSearchParams,
  sanitizeBlogHtml,
} from "../lib/blog.ts"

test("Blog searchParams parse search, category, tag, featured, ordering, page", () => {
  const parsed = parseBlogSearchParams({
    search: "visa",
    category: "visa-and-documents",
    tag: "documents",
    featured: "true",
    ordering: "-view_count",
    page: "2",
  })
  assert.equal(parsed.search, "visa")
  assert.equal(parsed.category, "visa-and-documents")
  assert.equal(parsed.tag, "documents")
  assert.equal(parsed.featured, true)
  assert.equal(parsed.ordering, "-view_count")
  assert.equal(parsed.page, 2)
})

test("Blog searchParams drop invalid values instead of throwing", () => {
  const parsed = parseBlogSearchParams({
    search: "   ",
    ordering: "not-a-field",
    page: "-3",
    featured: "yes",
  })
  assert.equal(parsed.search, undefined)
  assert.equal(parsed.ordering, undefined)
  assert.equal(parsed.page, undefined)
  assert.equal(parsed.featured, undefined)
})

test("Blog searchParams round-trip preserves a shareable URL", () => {
  const params = buildBlogSearchParams({
    search: "passport",
    category: "visa-and-documents",
    ordering: "-published_at",
    page: 2,
  })
  assert.match(params, /search=passport/)
  assert.match(params, /category=visa-and-documents/)
  const reparsed = parseBlogSearchParams(
    Object.fromEntries(new URLSearchParams(params))
  )
  assert.equal(reparsed.search, "passport")
  assert.equal(reparsed.category, "visa-and-documents")
  assert.equal(reparsed.page, 2)
})

test("Blog featured follows the backend contract: only true narrows", () => {
  assert.equal(parseBlogSearchParams({ featured: "true" }).featured, true)
  // "Only featured posts when true" — false/absent both mean unfiltered.
  assert.equal(parseBlogSearchParams({ featured: "false" }).featured, undefined)
  assert.equal(parseBlogSearchParams({}).featured, undefined)
})

test("Blog ordering accepts only the backend vocabulary", () => {
  assert.equal(parseBlogOrdering("-view_count"), "-view_count")
  assert.equal(parseBlogOrdering("not-a-field"), undefined)
  assert.equal(parseBlogOrdering(undefined), undefined)
})

test("Blog search state detection drives noindex decisions", () => {
  assert.equal(hasBlogSearchParams({}), false)
  assert.equal(hasBlogSearchParams({ category: "visa-and-documents" }), true)
  assert.equal(hasBlogSearchParams({ search: "passport" }), true)
})

test("Blog sanitizer keeps editorial tags and drops scripts + handlers", () => {
  const clean = sanitizeBlogHtml(
    `<p>Hello</p><script>alert(1)</script><h2 id="why">Why</h2><a href="javascript:alert(1)">x</a><a href="https://example.com" onclick="evil()">y</a>`
  )
  assert.match(clean, /<p>Hello<\/p>/)
  assert.match(clean, /<h2 id="why">Why<\/h2>/)
  assert.ok(!clean.includes("<script"))
  assert.ok(!clean.includes("javascript:"))
  assert.ok(!clean.includes("onclick"))
  assert.match(clean, /rel="noopener noreferrer"/)
})

test("Blog TOC falls back to body h2/h3 anchors when API TOC is empty", () => {
  const toc = deriveTocFromBody(
    `<h2 id="a-one">First</h2><p>x</p><h3 id="a-two">Second</h3>`
  )
  assert.equal(toc.length, 2)
  assert.equal(toc[0].id, "a-one")
  assert.equal(toc[1].level, 3)
})

test("Blog dates format to en-GB long dates, invalid stays null", () => {
  assert.equal(formatBlogDate("2026-09-25T17:26:47.220196Z"), "25 September 2026")
  assert.equal(formatBlogDate(null), null)
  assert.equal(formatBlogDate("not-a-date"), null)
})

test("Blog list schema tolerates nullable featured_image and empty tags", () => {
  const parsed = blogPostListSchema.safeParse({
    id: 1,
    title: "T",
    slug: "t",
    excerpt: "E",
    category: { id: 1, name: "C", slug: "c", post_count: 1 },
    tags: [],
    author: "Alphaa Africa",
    featured_image: null,
    reading_time: 7,
    view_count: 0,
    published_at: "2026-09-25T17:26:47.220196Z",
  })
  assert.equal(parsed.success, true)
})

test("Blog detail schema normalizes live TOC array + SEO object", () => {
  const parsed = blogPostDetailSchema.safeParse({
    id: 1,
    title: "T",
    slug: "t",
    excerpt: "E",
    body: "<p>Hi</p>",
    table_of_contents: [{ id: "a", text: "A", level: 2 }],
    category: { id: 1, name: "C", slug: "c", post_count: 1 },
    tags: [],
    author: "Alphaa Africa",
    featured_image: null,
    images: [],
    reading_time: 7,
    view_count: 2,
    published_at: "2026-09-25T17:26:47.220196Z",
    updated_at: "2026-09-25T17:26:47.224061Z",
    seo: {
      meta_title: "T | Alphaa",
      meta_description: "D",
      target_keyword: "K",
      canonical_url: null,
      noindex: false,
      og_image: null,
    },
  })
  assert.equal(parsed.success, true)
})

test("Paginated blog envelope validates", () => {
  const parsed = paginatedBlogPostListSchema.safeParse({
    count: 1,
    next: null,
    previous: null,
    results: [],
  })
  assert.equal(parsed.success, true)
})

test("Blog JSON-LD stays factual: ItemList + BlogPosting", () => {
  const list = blogListJsonLd([])
  assert.equal(list["@type"], "ItemList")
  const detail = blogDetailJsonLd({
    id: 1,
    title: "T",
    slug: "t",
    excerpt: "E",
    body: "<p>Hi</p>",
    table_of_contents: [],
    category: { id: 1, name: "C", slug: "c", description: "", post_count: 1 },
    tags: [],
    author: "Alphaa Africa",
    featured_image: null,
    featured_image_alt: "",
    images: [],
    reading_time: 7,
    view_count: 0,
    published_at: "2026-09-25T17:26:47.220196Z",
    updated_at: null,
    seo: null,
  })
  assert.equal(detail["@type"], "BlogPosting")
})
