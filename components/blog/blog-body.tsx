import { sanitizeBlogHtml } from "@/lib/blog"

/**
 * Sanitized article body (RSC). Backend HTML is untrusted — always passes
 * through the allowlist sanitizer before `dangerouslySetInnerHTML`.
 * Editorial typography uses Tailwind prose-like utilities (no extra dep).
 */
export function BlogBody({ html }: { html: string }) {
  const clean = sanitizeBlogHtml(html)
  if (clean.length === 0) return null
  return (
    <div
      className="blog-prose flex flex-col gap-5 text-[15px] leading-relaxed text-foreground/90 sm:text-base [&>a]:font-medium [&>a]:text-primary [&>a]:underline [&>a]:underline-offset-4 hover:[&>a]:text-primary/90 [&>blockquote]:rounded-2xl [&>blockquote]:border [&>blockquote]:border-border/70 [&>blockquote]:bg-muted/40 [&>blockquote]:px-5 [&>blockquote]:py-4 [&>blockquote]:text-foreground [&>h2]:scroll-mt-24 [&>h2]:pt-2 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:tracking-tight [&>h2]:text-foreground [&>h3]:scroll-mt-24 [&>h3]:pt-1 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-foreground [&>hr]:border-border/60 [&>li]:leading-relaxed [&>ol]:flex [&>ol]:list-decimal [&>ol]:flex-col [&>ol]:gap-2 [&>ol]:pl-6 [&>p]:text-pretty [&>ul]:flex [&>ul]:list-disc [&>ul]:flex-col [&>ul]:gap-2 [&>ul]:pl-6"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
