import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { WhatsappIcon } from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import { RetryButton } from "@/components/home/retry-button"
import { BlogCard } from "@/components/blog/blog-card"
import { BlogFilters } from "@/components/blog/blog-filters"
import { TerminalCta } from "@/components/shared/terminal-cta"
import { getBlogCategories, getBlogPosts, getBlogTags } from "@/lib/api/blog"
import {
  blogListJsonLd,
  buildBlogSearchParams,
  hasBlogSearchParams,
  parseBlogSearchParams,
} from "@/lib/blog"
import { canonicalUrl, getSiteUrl, robotsForSearchParams } from "@/lib/seo"
import { serializeJsonLd } from "@/lib/structured-data"
import { getSupportWhatsAppUrl } from "@/lib/content/company"
import { CTA_BLOG_LISTING } from "@/lib/images"

export const revalidate = 3600

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<BlogListingSearchParams>
}): Promise<Metadata> {
  const params = await searchParams
  const hasSearch = hasBlogSearchParams(params)
  return {
    metadataBase: new URL(getSiteUrl()),
    title: "Travel Guides & Tips | Alphaa Africa Blog",
    description:
      "Practical travel guides for Nigerian travellers — visas, documents, flights, hotels, and trip planning. Clear advice with human help one tap away.",
    alternates: { canonical: canonicalUrl("/blog") },
    openGraph: {
      title: "Travel Guides & Tips | Alphaa Africa Blog",
      description:
        "Practical guides for Nigerian travellers — visas, documents, and trip planning without the stress.",
      url: canonicalUrl("/blog"),
      siteName: "Alphaa Africa",
      locale: "en_NG",
      type: "website",
    },
    robots: robotsForSearchParams(hasSearch),
  }
}

type BlogListingSearchParams = {
  search?: string | string[]
  category?: string | string[]
  tag?: string | string[]
  featured?: string | string[]
  ordering?: string | string[]
  page?: string | string[]
}

/**
 * `/blog` (RSC, ISR 3600): server-filtered editorial grid driven by URL
 * searchParams (`search`, `category`, `tag`, `featured`, `ordering`, `page`),
 * so every filtered view is shareable and crawlable. Covers loading, empty,
 * and error+retry (PRD §12). Filtered views are noindex (thin combinations).
 */
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<BlogListingSearchParams>
}) {
  const rawSearchParams = await searchParams
  const filters = parseBlogSearchParams(rawSearchParams)
  const hasSearch = hasBlogSearchParams(rawSearchParams)

  let posts: Awaited<ReturnType<typeof getBlogPosts>> | null = null
  let categories: Awaited<ReturnType<typeof getBlogCategories>> = []
  let tags: Awaited<ReturnType<typeof getBlogTags>> = []
  try {
    // Parallel independent fetches — no waterfalls.
    const [postPage, categoryList, tagList] = await Promise.all([
      getBlogPosts(filters),
      getBlogCategories().catch(() => []),
      getBlogTags().catch(() => []),
    ])
    posts = postPage
    categories = categoryList
    tags = tagList
  } catch (error) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load blog posts right now."
        />
        <RetryButton label="Retry loading posts" />
      </div>
    )
  }

  const results = posts?.results ?? []
  const total = posts?.count ?? 0
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.tag ? 1 : 0) +
    (filters.featured ? 1 : 0) +
    (filters.ordering && filters.ordering !== "-published_at" ? 1 : 0)
  const shareableQuery = buildBlogSearchParams(filters)
  const jsonLd = blogListJsonLd(results)

  // Pagination follows the backend cursors (`next`/`previous`), never local
  // page-size math: a partial last page must not inflate page counts or
  // break Prev/Next. Page links stay shareable via `?page=`.
  const currentPage = filters.page ?? 1
  const hasPrevious = posts?.previous !== null && posts?.previous !== undefined
  const hasNext = posts?.next !== null && posts?.next !== undefined
  const prevQuery = buildBlogSearchParams({ ...filters, page: currentPage - 1 })
  const nextQuery = buildBlogSearchParams({ ...filters, page: currentPage + 1 })

  return (
    <div className="flex flex-col gap-14 pb-20 sm:gap-18 sm:pb-28">
      {/* Structured data only on the indexable clean entry — filtered thin views stay uncited. */}
      {!hasSearch && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}

      {/* 1. Hero */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 md:pt-16 lg:px-8">
        <div className="flex max-w-3xl flex-col items-start gap-4">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
            Blog
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Travel clear, not stressed.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
            Practical posts for Nigerian travellers — documents, visas, flights,
            and trip planning. Written plainly, kept current, with a specialist
            one message away.
          </p>
        </div>
      </section>

      {/* 2. Filters (Commented out per user request)
      <section
        aria-label="Post filters"
        className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:px-8"
      >
        <BlogFilters initial={filters} categories={categories} tags={tags} />

        <div
          className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground"
          aria-live="polite"
        >
          <span className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-primary" />
            {total === 0
              ? "No posts match these filters yet."
              : `${total} ${total === 1 ? "post" : "posts"} available`}
          </span>
          {activeFilterCount > 0 && shareableQuery && (
            <Link
              href="/blog"
              scroll={false}
              className="font-semibold text-primary underline-offset-4 transition-colors hover:underline"
            >
              Reset all filters
            </Link>
          )}
        </div>
      </section>
      */}

      {/* 3. Grid / Empty */}
      <section
        aria-label="Available posts"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        {results.length === 0 ? (
          <div className="relative rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs sm:p-2">
            <div className="flex flex-col items-center gap-4 rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-10 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-14">
              <h2 className="text-xl font-semibold text-foreground">
                No posts match these filters
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Try a different keyword or clear the category filter. Or tell us
                what you are planning — a specialist will point you to the right
                post.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <ButtonLink
                  href="/blog"
                  scroll={false}
                  variant="outline"
                  size="sm"
                >
                  <span>Clear filters</span>
                </ButtonLink>
                <ButtonLink
                  href={getSupportWhatsAppUrl("finding the right blog post")}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  className="bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                >
                  <HugeiconsIcon
                    icon={WhatsappIcon}
                    size={16}
                    aria-hidden="true"
                  />
                  <span>Ask Alphaa</span>
                </ButtonLink>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>

            {(hasPrevious || hasNext) && (
              <nav
                aria-label="Post pages"
                className="mt-10 flex items-center justify-center gap-3"
              >
                {hasPrevious ? (
                  <ButtonLink
                    href={prevQuery ? `/blog?${prevQuery}` : "/blog"}
                    scroll={false}
                    variant="outline"
                    size="sm"
                  >
                    <span>Previous</span>
                  </ButtonLink>
                ) : null}
                <span
                  className="text-xs font-medium text-muted-foreground"
                  aria-live="polite"
                >
                  Page {currentPage}
                  {total > 0
                    ? ` · ${total} ${total === 1 ? "post" : "posts"}`
                    : ""}
                </span>
                {hasNext ? (
                  <ButtonLink
                    href={`/blog?${nextQuery}`}
                    scroll={false}
                    variant="outline"
                    size="sm"
                  >
                    <span>Next</span>
                  </ButtonLink>
                ) : null}
              </nav>
            )}
          </>
        )}
      </section>

      {/* 4. Human help CTA */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <TerminalCta
          title="Planning a trip the posts don't cover?"
          description="Tell us where you're going and what feels confusing — documents, visas, flights, or stays. A specialist will walk you through the next step."
          eyebrow="Human Help"
          backgroundImage={CTA_BLOG_LISTING}
          primaryHref="/contact"
          primaryLabel="Contact Us"
        />
      </section>
    </div>
  )
}
