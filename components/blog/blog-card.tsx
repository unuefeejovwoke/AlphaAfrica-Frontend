import type { BlogPostList } from "@/lib/api/blog"
import { blogExcerpt, blogImageSrc, formatBlogDate } from "@/lib/blog"
import { ListingCardShell } from "@/components/shared/listing-card"
import { BlogMeta } from "@/components/blog/blog-meta"

/**
 * Blog card (RSC): category, title, excerpt, meta (date/reading time/views),
 * and CTA. Links are crawlable by construction. Images fall back to the
 * local brand asset so cards never render broken imagery.
 * CONTEXT.md vocabulary: the sellable unit is a Post; "Travel guides" is
 * display copy for the /blog listing only.
 */
export function BlogCard({ post }: { post: BlogPostList }) {
  const date = formatBlogDate(post.published_at)
  const excerpt = blogExcerpt(post.excerpt, 140)
  return (
    <ListingCardShell
      href={`/blog/${post.slug}`}
      imageSrc={blogImageSrc(post.featured_image)}
      imageAlt={post.featured_image_alt?.trim() || `${post.title} — Alphaa Africa blog post`}
      isFeatured={post.is_featured}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-primary uppercase">
          {post.category.name}
        </span>
        {date && (
          <time
            dateTime={post.published_at ?? undefined}
            className="text-[11px] font-medium text-muted-foreground"
          >
            {date}
          </time>
        )}
      </div>

      <h3 className="text-lg font-semibold tracking-tight text-balance text-foreground transition-colors group-hover:text-primary">
        {post.title}
      </h3>

      {excerpt && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {excerpt}
        </p>
      )}

      <div className="mt-auto flex items-center gap-4 border-t border-border/60 pt-4 text-[11px] font-medium text-muted-foreground">
        <BlogMeta readingTime={post.reading_time} viewCount={post.view_count} />
        <span className="ml-auto font-semibold text-primary">Read post</span>
      </div>
    </ListingCardShell>
  )
}
