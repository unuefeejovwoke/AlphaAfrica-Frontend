import { getBlogPostDetail } from "@/lib/api/blog.ts"
import { blogImageSrc } from "@/lib/blog.ts"
import { brandOgCard, ogCardImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card"

export const alt = "Alphaa Africa blog post"
export const size = { ...OG_SIZE }
export const contentType = OG_CONTENT_TYPE

/** Per-post share card: title + category/read-time over the entity photo. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  try {
    const { slug } = await params
    const post = await getBlogPostDetail(slug)
    const photo = post.featured_image
      ? blogImageSrc(post.featured_image)
      : null
    const meta = [
      post.category.name,
      post.reading_time > 0 ? `${post.reading_time} min read` : null,
    ]
      .filter(Boolean)
      .join(" · ")
    return ogCardImage({
      kicker: "Travel Blog",
      title: post.title,
      subtitle: meta || undefined,
      photoUrl: photo?.startsWith("http") ? photo : undefined,
    })
  } catch {
    return brandOgCard({
      kicker: "Travel Blog",
      title: "Guides, checklists & travel news",
    })
  }
}
