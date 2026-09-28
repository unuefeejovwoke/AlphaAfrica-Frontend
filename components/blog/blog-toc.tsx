import { HugeiconsIcon } from "@hugeicons/react"
import { ChevronDownIcon } from "@hugeicons/core-free-icons"
import type { BlogTocItem } from "@/lib/api/blog"

function TocList({ items }: { items: BlogTocItem[] }) {
  return (
    <ol className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.id} className={item.level >= 3 ? "pl-4" : ""}>
          <a
            href={`#${item.id}`}
            className="block rounded-lg px-2 py-1.5 text-[13px] leading-snug font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  )
}

/**
 * In-post navigation (RSC). Renders nothing when the Post carries no
 * anchors. Anchor ids come from the backend TOC or body-derived h2/h3 ids.
 *
 * Mobile (<lg): collapsed native disclosure above the article — a 13-item
 * list must never push the article down on a phone. Desktop: sticky sidebar.
 * Native <details> keeps it dependency-free, keyboard-accessible, and
 * working without JavaScript.
 */
export function BlogToc({ items }: { items: BlogTocItem[] }) {
  if (items.length === 0) return null
  return (
    <>
      <details className="group rounded-2xl border border-border/80 bg-card p-5 shadow-xs lg:hidden">
        <summary className="flex cursor-pointer touch-manipulation list-none items-center justify-between gap-3 text-xs font-bold tracking-wider text-muted-foreground uppercase focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <span>In this post</span>
          <HugeiconsIcon
            icon={ChevronDownIcon}
            size={16}
            aria-hidden="true"
            className="shrink-0 transition-transform duration-200 group-open:rotate-180"
          />
        </summary>
        <div className="mt-3 border-t border-border/50 pt-3">
          <TocList items={items} />
        </div>
      </details>

      <nav aria-label="In this post" className="hidden lg:sticky lg:top-24 lg:block">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
          <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            In this post
          </h2>
          <div className="mt-3">
            <TocList items={items} />
          </div>
        </div>
      </nav>
    </>
  )
}
