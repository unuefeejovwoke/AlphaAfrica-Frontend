import { z } from "zod"
import { ApiError, apiGet, type PaginatedResponse } from "./client.ts"

/**
 * Blog domain (ADR-0006).
 *
 * CONTEXT.md vocabulary: Post = published editorial article; Category = named
 * grouping with post count; Tag = lightweight label; Table of Contents =
 * API-built anchor list; Related Posts = up to 3 same-category fallbacks.
 *
 * API reality (verified 2026-09-28 against live backend) differs from
 * `apidoc.yaml`:
 * - `table_of_contents` is an array `{id,text,level}`, not a string.
 * - `seo` is an object `{meta_title,meta_description,target_keyword,
 *   canonical_url,noindex,og_image}`, not a string.
 * - `post_count` is numeric, not a string.
 * - `featured_image` is nullable.
 * Schemas below tolerate both shapes so a docs-only drift can never 500 a page.
 */

export const BLOG_ORDERINGS = [
  "-published_at",
  "published_at",
  "-view_count",
  "title",
] as const

export type BlogOrdering = (typeof BLOG_ORDERINGS)[number]

export const blogCategorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional().default(""),
  // apidoc says string, live API sends number — accept both.
  post_count: z.union([z.string(), z.number()]).optional().default(0),
})

export type BlogCategory = z.infer<typeof blogCategorySchema>

export const blogTagSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
})

export type BlogTag = z.infer<typeof blogTagSchema>

export const blogPostListSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable().optional().default(""),
  category: blogCategorySchema,
  tags: z.array(blogTagSchema).optional().default([]),
  author: z.string().optional().default("Alphaa Africa"),
  featured_image: z.string().nullable().optional().default(null),
  featured_image_alt: z.string().nullable().optional().default(""),
  target_keyword: z.string().nullable().optional().default(""),
  is_featured: z.boolean().optional().default(false),
  reading_time: z.number().int().min(0).optional().default(0),
  view_count: z.number().int().min(0).optional().default(0),
  published_at: z.string().nullable().optional().default(null),
})

export type BlogPostList = z.infer<typeof blogPostListSchema>

export const paginatedBlogPostListSchema = z.object({
  count: z.number().int().min(0),
  next: z.string().nullable().default(null),
  previous: z.string().nullable().default(null),
  results: z.array(blogPostListSchema),
})

export type PaginatedBlogPosts = PaginatedResponse<BlogPostList>

export const blogTocItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  level: z.number().int().min(1).max(6),
})

export type BlogTocItem = z.infer<typeof blogTocItemSchema>

export const blogSeoSchema = z
  .object({
    meta_title: z.string().nullable().optional().default(null),
    meta_description: z.string().nullable().optional().default(null),
    target_keyword: z.string().nullable().optional().default(null),
    canonical_url: z.string().nullable().optional().default(null),
    noindex: z.boolean().optional().default(false),
    og_image: z.string().nullable().optional().default(null),
  })
  .nullable()
  .optional()
  .default(null)

export type BlogSeo = z.infer<typeof blogSeoSchema>

export const blogPostImageSchema = z.object({
  id: z.number().int(),
  image: z.string(),
  caption: z.string().nullable().optional().default(""),
})

export type BlogPostImage = z.infer<typeof blogPostImageSchema>

// apidoc claims body/table_of_contents/seo are strings; live API sends
// HTML body string, TOC array, SEO object. Accept both, normalize to the
// live shape so renderers never branch on wire format.
const tocArraySchema = z.array(blogTocItemSchema).optional().default([])

export const blogPostDetailSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable().optional().default(""),
  body: z.string().optional().default(""),
  table_of_contents: z
    .union([tocArraySchema, z.string()])
    .optional()
    .default([]),
  category: blogCategorySchema,
  tags: z.array(blogTagSchema).optional().default([]),
  author: z.string().optional().default("Alphaa Africa"),
  featured_image: z.string().nullable().optional().default(null),
  featured_image_alt: z.string().nullable().optional().default(""),
  images: z.array(blogPostImageSchema).optional().default([]),
  reading_time: z.number().int().min(0).optional().default(0),
  view_count: z.number().int().min(0).optional().default(0),
  published_at: z.string().nullable().optional().default(null),
  updated_at: z.string().nullable().optional().default(null),
  seo: z.union([blogSeoSchema, z.string()]).nullable().optional().default(null),
})

export type BlogPostDetailRaw = z.infer<typeof blogPostDetailSchema>

export interface BlogPostDetail extends Omit<BlogPostDetailRaw, "table_of_contents" | "seo"> {
  table_of_contents: BlogTocItem[]
  seo: Exclude<BlogSeo, null> | null
}

function normalizeDetail(raw: BlogPostDetailRaw): BlogPostDetail {
  const toc = Array.isArray(raw.table_of_contents) ? raw.table_of_contents : []
  const seo =
    raw.seo !== null && typeof raw.seo === "object" ? raw.seo : null
  return { ...raw, table_of_contents: toc, seo }
}

export interface BlogFilters {
  category?: string
  featured?: boolean
  ordering?: BlogOrdering
  search?: string
  tag?: string
  page?: number
}

export async function getBlogPosts(
  filters: BlogFilters = {}
): Promise<PaginatedBlogPosts> {
  const raw = await apiGet<unknown>("/api/blog/", {
    query: {
      category: filters.category,
      featured: filters.featured,
      ordering: filters.ordering,
      search: filters.search,
      tag: filters.tag,
      page: filters.page,
    },
    tags: ["blog"],
  })
  const parsed = paginatedBlogPostListSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("Invalid response from the blog service.", {
      status: 200,
      code: "server",
    })
  }
  return parsed.data
}

export async function getBlogPostDetail(slug: string): Promise<BlogPostDetail> {
  // Viewing a post increments its view counter backend-side — no extra call.
  const raw = await apiGet<unknown>(
    `/api/blog/${encodeURIComponent(slug)}/`,
    { tags: ["blog", `blog:${slug}`] }
  )
  const parsed = blogPostDetailSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("Invalid response from the blog service.", {
      status: 200,
      code: "server",
    })
  }
  return normalizeDetail(parsed.data)
}

export async function getRelatedBlogPosts(slug: string): Promise<BlogPostList[]> {
  const raw = await apiGet<unknown>(
    `/api/blog/${encodeURIComponent(slug)}/related/`,
    { tags: ["blog", `blog:${slug}:related`] }
  )
  const parsed = z.array(blogPostListSchema).safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("Invalid response from the blog service.", {
      status: 200,
      code: "server",
    })
  }
  return parsed.data
}

export async function getBlogCategories(): Promise<BlogCategory[]> {
  const raw = await apiGet<unknown>("/api/blog/categories/", {
    tags: ["blog-categories"],
  })
  const parsed = z.array(blogCategorySchema).safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("Invalid response from the blog service.", {
      status: 200,
      code: "server",
    })
  }
  return parsed.data
}

export async function getBlogTags(): Promise<BlogTag[]> {
  const raw = await apiGet<unknown>("/api/blog/tags/", {
    tags: ["blog-tags"],
  })
  const parsed = z.array(blogTagSchema).safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("Invalid response from the blog service.", {
      status: 200,
      code: "server",
    })
  }
  return parsed.data
}

/** Best-effort slugs for `generateStaticParams` (first page; on-demand fallback). */
export async function listBlogSlugs(): Promise<string[]> {
  try {
    const page = await getBlogPosts({ page: 1 })
    return page.results.map((post) => post.slug)
  } catch {
    return []
  }
}
