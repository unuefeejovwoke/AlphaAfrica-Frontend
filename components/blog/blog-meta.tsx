import { HugeiconsIcon } from "@hugeicons/react"
import { Clock01Icon, EyeIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

/**
 * Shared Post meta row (RSC): reading time + view count.
 * Single source for `BlogCard` and `/blog/[slug]` so the lockstep copy
 * ("X min read" / "Quick read", "N view(s)") can never drift.
 */
export function BlogMeta({
  readingTime,
  viewCount,
  className,
}: {
  readingTime: number
  viewCount: number
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-4", className)}>
      <span className="inline-flex items-center gap-1.5">
        <HugeiconsIcon icon={Clock01Icon} size={13} aria-hidden="true" />
        {readingTime > 0 ? `${readingTime} min read` : "Quick read"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <HugeiconsIcon icon={EyeIcon} size={13} aria-hidden="true" />
        {viewCount} {viewCount === 1 ? "view" : "views"}
      </span>
    </span>
  )
}
