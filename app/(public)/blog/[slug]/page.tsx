import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserIcon, Calendar01Icon } from "@hugeicons/core-free-icons"
import { ErrorState } from "@/components/feedback/error-state"
import { RetryButton } from "@/components/home/retry-button"
import { BlogBody } from "@/components/blog/blog-body"
import { BlogCard } from "@/components/blog/blog-card"
import { BlogMeta } from "@/components/blog/blog-meta"
import { BlogToc } from "@/components/blog/blog-toc"
import { BlogReadingProgress } from "@/components/blog/blog-reading-progress"
import { BlogShareButton } from "@/components/blog/blog-share-button"
import { ViewTracker } from "@/components/analytics/view-tracker"
import { TerminalCta } from "@/components/shared/terminal-cta"
import {
  getBlogPostDetail,
  getRelatedBlogPosts,
  listBlogSlugs,
} from "@/lib/api/blog"
import { ApiError } from "@/lib/api/client"
import {
  blogDetailJsonLd,
  blogExcerpt,
  blogImageSrc,
  formatBlogDate,
  resolveBlogToc,
} from "@/lib/blog"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"
import { serializeJsonLd } from "@/lib/structured-data"
import { humanizeSlug } from "@/lib/listings"
import { getSupportWhatsAppUrl } from "@/lib/content/company"
import { CTA_BLOG_POST } from "@/lib/images"

export const revalidate = 3600
export const dynamicParams = true

type DetailParams = { slug: string }

export async function generateStaticParams(): Promise<DetailParams[]> {
  const slugs = await listBlogSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<DetailParams>
}): Promise<Metadata> {
  const { slug } = await params
  const url = canonicalUrl(`/blog/${slug}`)
  try {
    const post = await getBlogPostDetail(slug)
    const seoTitle = post.seo?.meta_title?.trim()
    const seoDescription = post.seo?.meta_description?.trim()
    const title =
      seoTitle && seoTitle.length > 0
        ? seoTitle
        : `${post.title} | Alphaa Africa`
    const description =
      seoDescription && seoDescription.length > 0
        ? seoDescription
        : blogExcerpt(post.excerpt) ||
          `A practical Alphaa Africa blog post: ${post.title}.`
    const canonical = post.seo?.canonical_url?.trim() || url
    const noindex = post.seo?.noindex === true
    return {
      metadataBase: new URL(getSiteUrl()),
      title,
      description,
      alternates: { canonical },
      robots: noindex
        ? { index: false, follow: false }
        : { index: true, follow: true },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "article",
      },
    }
  } catch {
    return {
      title: `${humanizeSlug(slug)} | Alphaa Africa`,
      description: "A practical blog post from Alphaa Africa.",
      alternates: { canonical: url },
    }
  }
}

/**
 * `/blog/[slug]` (RSC, ISR 3600): editorial detail with breadcrumb, hero
 * meta, featured image, reading-progress hairline, sticky TOC + sanitized
 * body, Related Posts, and a human-help CTA. Viewing increments the backend
 * view counter (no extra call). Motion is scoped to the two interactive
 * leaves the page mounts (`BlogReadingProgress`, `BlogToc`) — the article
 * body, hero, and related posts stay server-rendered.
 */
export default async function BlogDetailPage({
  params,
}: {
  params: Promise<DetailParams>
}) {
  const { slug } = await params

  // Start both reads before the first await — no waterfalls. Detail is
  // required (404 on miss); related is best-effort and resolves to [].
  const detailPromise = getBlogPostDetail(slug)
  const relatedPromise = getRelatedBlogPosts(slug).catch(() => [])

  let post: Awaited<typeof detailPromise>
  try {
    post = await detailPromise
  } catch (error) {
    if (error instanceof ApiError && error.code === "not-found") notFound()
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load this post right now."
        />
        <RetryButton label="Retry loading post" />
      </div>
    )
  }

  const related = await relatedPromise

  const toc = resolveBlogToc(post)
  const jsonLd = blogDetailJsonLd(post)
  const date = formatBlogDate(post.published_at)
  const heroSrc = blogImageSrc(post.featured_image)
  const heroAlt =
    post.featured_image_alt?.trim() || `${post.title} — Alphaa Africa blog post`

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 pb-24 sm:gap-14 sm:px-6 sm:pb-32 md:py-12 lg:px-8">
      <BlogReadingProgress />
      <ViewTracker
        event="blog_viewed"
        props={{ slug: post.slug, category: post.category.slug }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* 1. Breadcrumb + share */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Link href="/" className="transition-colors hover:text-primary">
            Home
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">
            /
          </span>
          <Link href="/blog" className="transition-colors hover:text-primary">
            Blog
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">
            /
          </span>
          <span
            aria-current="page"
            className="max-w-[200px] truncate font-semibold text-foreground sm:max-w-xs"
          >
            {post.title}
          </span>
        </nav>
        <BlogShareButton />
      </div>

      {/* 2. Hero */}
      <section aria-labelledby="blog-title" className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/blog?category=${encodeURIComponent(post.category.slug)}`}
              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              {post.category.name}
            </Link>
            {post.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag.slug}
                href={`/blog?tag=${encodeURIComponent(tag.slug)}`}
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                #{tag.name}
              </Link>
            ))}
          </div>

          <h1
            id="blog-title"
            className="text-3xl leading-[1.15] font-extrabold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl"
          >
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="max-w-3xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              {post.excerpt}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <HugeiconsIcon icon={UserIcon} size={14} aria-hidden="true" />
              {post.author}
            </span>
            {date && (
              <span className="inline-flex items-center gap-1.5">
                <HugeiconsIcon
                  icon={Calendar01Icon}
                  size={14}
                  aria-hidden="true"
                />
                <time dateTime={post.published_at ?? undefined}>{date}</time>
              </span>
            )}
            <BlogMeta
              readingTime={post.reading_time}
              viewCount={post.view_count}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border/80 bg-muted">
          {/* Plain img: backend media host varies by env, so next/image remotePatterns cannot cover it. */}
          <img
            src={heroSrc}
            alt={heroAlt}
            loading="eager"
            decoding="async"
            className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]"
          />
        </div>
      </section>

      {/* 3. Body + TOC: TOC disclosure sits above the article on mobile
          (collapsed) and docks as a sticky sidebar on desktop. */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <aside aria-label="Post navigation" className="min-w-0 lg:order-2">
          <BlogToc items={toc} />
        </aside>
        <article aria-label="Post content" className="min-w-0 lg:order-1">
          <BlogBody html={post.body} />
        </article>
      </div>

      {/* 4. Related */}
      {related.length > 0 && (
        <section
          aria-labelledby="blog-related-heading"
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-primary uppercase">
              Keep reading
            </span>
            <h2
              id="blog-related-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Related Posts
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.slice(0, 3).map((item) => (
              <BlogCard key={item.slug} post={item} />
            ))}
          </div>
        </section>
      )}

      {/* 5. Human help */}
      <section className="mx-auto w-full">
        <TerminalCta
          title="Need help with this trip?"
          description={`Reading about "${post.title}" is a strong start. Tell us your dates and destination — a specialist will help with documents, visas, flights, and stays.`}
          eyebrow="Talk to Alphaa"
          backgroundImage={CTA_BLOG_POST}
          primaryHref={getSupportWhatsAppUrl(`help with: ${post.title}`)}
          primaryLabel="Chat on WhatsApp"
        />
      </section>
    </div>
  )
}
