import { canonicalUrl, getSiteUrl } from "./seo.ts"
import { LISTING_IMAGE_FALLBACK, resolveListingImageUrl } from "./listings.ts"
import type {
  BlogFilters,
  BlogOrdering,
  BlogPostDetail,
  BlogPostList,
  BlogTocItem,
} from "./api/blog.ts"
import { BLOG_ORDERINGS } from "./api/blog.ts"

/**
 * Pure blog helpers (ADR-0006). All HTTP stays in `lib/api/blog.ts` — this
 * module never calls `fetch` and never throws on invalid input.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

/** Backend ordering vocabulary for `GET /api/blog/ ?ordering=`. */
export function parseBlogOrdering(
  value: string | string[] | undefined
): BlogOrdering | undefined {
  const raw = firstString(value)?.trim()
  if (!raw) return undefined
  return (BLOG_ORDERINGS as readonly string[]).includes(raw)
    ? (raw as BlogOrdering)
    : undefined
}

function parsePage(value: string | string[] | undefined): number | undefined {
  const raw = firstString(value)?.trim()
  if (!raw) return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return undefined
  return parsed
}

function parseFeaturedFlag(
  value: string | string[] | undefined
): boolean | undefined {
  const raw = firstString(value)
  if (typeof raw !== "string") return undefined
  // Backend contract: "Only featured posts when true". `featured=false` is
  // equivalent to omitting the filter, so it maps to undefined (mirrors
  // packages `parseFeatured`). There is no "only non-featured" query.
  return raw.trim().toLowerCase() === "true" ? true : undefined
}

/** Parse shareable `?search=&category=&tag=&featured=&ordering=&page=` (lenient). */
export function parseBlogSearchParams(input: RawSearchParams): BlogFilters {
  const filters: BlogFilters = {}
  const search = firstString(input.search)?.trim()
  if (search) filters.search = search.slice(0, 200)
  const category = firstString(input.category)?.trim()
  if (category) filters.category = category.slice(0, 140)
  const tag = firstString(input.tag)?.trim()
  if (tag) filters.tag = tag.slice(0, 100)
  const featured = parseFeaturedFlag(input.featured)
  if (featured !== undefined) filters.featured = featured
  const ordering = parseBlogOrdering(input.ordering)
  if (ordering !== undefined) filters.ordering = ordering
  const page = parsePage(input.page)
  if (page !== undefined) filters.page = page
  return filters
}

/** Serialize filters to a shareable query string (no leading `?`). */
export function buildBlogSearchParams(filters: BlogFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.category) params.set("category", filters.category)
  if (filters.tag) params.set("tag", filters.tag)
  if (filters.featured) params.set("featured", "true")
  if (filters.ordering) params.set("ordering", filters.ordering)
  if (filters.page !== undefined && filters.page > 1) {
    params.set("page", String(filters.page))
  }
  return params.toString()
}

/** True when the query carries any blog search state (drives noindex + status). */
export function hasBlogSearchParams(input: RawSearchParams): boolean {
  for (const key of [
    "search",
    "category",
    "tag",
    "featured",
    "ordering",
    "page",
  ] as const) {
    const value = firstString(input[key])
    if (typeof value === "string" && value.trim() !== "") return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Sanitized HTML body — backend is untrusted input (PRD §9).
// Allowlist renderer: keeps editorial tags, drops scripts/forms/iframes,
// strips event handlers + inline styles + javascript: URLs, forces safe
// link/image attributes. No external dependency; deterministic server-side.
// ---------------------------------------------------------------------------

const ALLOWED_TAGS = new Set([
  "p",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "a",
  "blockquote",
  "br",
  "hr",
])

function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim()
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return true
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true
  if (trimmed.startsWith("#")) return true
  return false
}

function sanitizeAttributes(tag: string, attrs: string): string {
  const out: string[] = []
  const attrPattern =
    /([a-zA-Z:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  let match: RegExpExecArray | null
  while ((match = attrPattern.exec(attrs)) !== null) {
    const name = match[1].toLowerCase()
    const value = match[2] ?? match[3] ?? match[4] ?? ""
    if (name.startsWith("on") || name === "style" || name === "class") continue
    if (tag === "a" && name === "href") {
      if (!isSafeHttpUrl(value)) continue
      const escaped = value.replace(/"/g, "&quot;")
      out.push(`href="${escaped}"`)
      continue
    }
    if (tag === "a" && (name === "title" || name === "id")) {
      if (/^[a-zA-Z0-9\-_:. ]{1,200}$/.test(value)) {
        out.push(`${name}="${value.replace(/"/g, "&quot;")}"`)
      }
      continue
    }
    if ((tag === "h2" || tag === "h3" || tag === "h4") && name === "id") {
      if (/^[a-zA-Z0-9\-_]{1,200}$/.test(value)) out.push(`id="${value}"`)
      continue
    }
  }
  if (tag === "a") out.push('rel="noopener noreferrer"')
  return out.length > 0 ? ` ${out.join(" ")}` : ""
}

/**
 * Allowlist-sanitize backend HTML. Unknown tags are unwrapped (inner text
 * kept); dangerous attributes and URLs are dropped. Never throws — invalid
 * input yields an empty string.
 */
export function sanitizeBlogHtml(html: string | null | undefined): string {
  if (!html || typeof html !== "string") return ""
  let clean = html
  // Drop entire dangerous elements with their content.
  clean = clean.replace(
    /<(script|style|iframe|object|embed|form|input|button|select|textarea|noscript|template)[^>]*>[\s\S]*?<\/\1\s*>/gi,
    ""
  )
  clean = clean.replace(
    /<(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi,
    ""
  )
  // Unwrap disallowed tags but keep inner text.
  clean = clean.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
    (full, tagName: string, attrs: string) => {
      const tag = tagName.toLowerCase()
      const isClosing = full.startsWith("</")
      if (!ALLOWED_TAGS.has(tag)) return ""
      if (isClosing) return `</${tag}>`
      if (tag === "br" || tag === "hr") return `<${tag}>`
      return `<${tag}${sanitizeAttributes(tag, attrs ?? "")}>`
    }
  )
  return clean.trim()
}

/** Fallback TOC: derive h2/h3 anchors from sanitized-adjacent body when API TOC is empty. */
export function deriveTocFromBody(body: string): BlogTocItem[] {
  const items: BlogTocItem[] = []
  const pattern = /<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1\s*>/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(body)) !== null) {
    const level = Number(match[1])
    const id = match[2].trim()
    const text = match[3]
      .replace(/<[^>]+>/g, "")
      .trim()
      .slice(0, 160)
    if (id && text) items.push({ id, text, level })
    if (items.length >= 20) break
  }
  return items
}

/** API TOC first, body-derived anchors as fallback. */
export function resolveBlogToc(post: BlogPostDetail): BlogTocItem[] {
  if (post.table_of_contents.length > 0) return post.table_of_contents
  return deriveTocFromBody(post.body)
}

/**
 * Which Table of Contents entry a reader is currently in, given each heading's
 * offset from the top of the viewport.
 *
 * The active entry is the LAST heading at or above the reading line, so the
 * highlight lags the heading by a screen of prose — which is what "you are
 * reading this section" means. Returns null only when there is nothing to
 * highlight (no headings, or the reader is above the first one).
 *
 * Offsets must be in document order and ascending. Kept here, away from the
 * DOM, so the rule is testable without a browser.
 */
export function resolveActiveTocId(
  ids: readonly string[],
  headingTops: readonly number[],
  readingLine: number
): string | null {
  let active: string | null = null
  for (let i = 0; i < ids.length; i += 1) {
    if (headingTops[i] === undefined || headingTops[i] > readingLine) break
    active = ids[i]
  }
  return active
}

// ---------------------------------------------------------------------------
// Display + SEO
// ---------------------------------------------------------------------------

export function formatBlogDate(
  value: string | null | undefined
): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

export function blogImageSrc(
  src: string | null | undefined,
  fallback: string = LISTING_IMAGE_FALLBACK
): string {
  if (!src || src.trim().length === 0) return fallback
  return resolveListingImageUrl(src)
}

export function blogExcerpt(
  excerpt: string | null | undefined,
  fallbackLength = 155
): string {
  const text = (excerpt ?? "").trim()
  if (text.length === 0) return ""
  return text.length > fallbackLength
    ? `${text.slice(0, fallbackLength).trim()}…`
    : text
}

/** ItemList graph for `/blog` — one node per card, no thin pages. */
export function blogListJsonLd(items: BlogPostList[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: canonicalUrl(`/blog/${item.slug}`),
      item: {
        "@type": "BlogPosting",
        headline: item.title,
        url: canonicalUrl(`/blog/${item.slug}`),
        image: blogImageSrc(item.featured_image),
      },
    })),
  }
}

/** BlogPosting graph for `/blog/[slug]` (GEO/AI-SEO): backend facts only. */
export function blogDetailJsonLd(post: BlogPostDetail) {
  const url = canonicalUrl(`/blog/${post.slug}`)
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: blogExcerpt(post.excerpt) || post.title,
    image: blogImageSrc(post.featured_image),
    url,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: post.author, url: getSiteUrl() },
    publisher: {
      "@type": "Organization",
      name: "Alphaa Africa",
      url: getSiteUrl(),
    },
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    ...(post.updated_at ? { dateModified: post.updated_at } : {}),
  }
}
