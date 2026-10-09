"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChevronDownIcon } from "@hugeicons/core-free-icons"
import type { BlogTocItem } from "@/lib/api/blog"
import { resolveActiveTocId } from "@/lib/blog"
import { ActiveIndicator } from "@/components/motion/active-indicator"
import { cn } from "@/lib/utils"

/**
 * One list, one layoutId. The mobile disclosure and the desktop sidebar are
 * separate elements sharing the same active id — two nodes on one layoutId
 * would fight over the sliding pill, and only one of them is ever visible.
 */
function TocList({
  items,
  activeId,
  layoutId,
}: {
  items: BlogTocItem[]
  activeId: string | null
  layoutId: string
}) {
  return (
    <ol className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <li key={item.id} className={item.level >= 3 ? "pl-4" : ""}>
            <a
              href={`#${item.id}`}
              aria-current={active ? "location" : undefined}
              className={cn(
                "relative block rounded-lg px-2 py-1.5 text-[13px] leading-snug font-medium transition-colors hover:bg-muted hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active ? "font-semibold text-primary" : "text-foreground/80"
              )}
            >
              {active ? (
                <ActiveIndicator
                  layoutId={layoutId}
                  className="rounded-lg bg-primary/10 ring-0"
                />
              ) : null}
              <span className="relative z-10">{item.text}</span>
            </a>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * In-post navigation (client leaf — the surrounding page stays an RSC).
 * Renders nothing when the Post carries no anchors. Anchor ids come from the
 * backend TOC or body-derived h2/h3 ids.
 *
 * Mobile (<lg): collapsed native disclosure above the article — a 13-item
 * list must never push the article down on a phone. Desktop: sticky sidebar.
 * Native <details> keeps it dependency-free and keyboard-accessible, and the
 * glide to a heading is the document's own `scroll-smooth`, which the
 * reduced-motion backstop in globals.css already collapses to `auto`.
 *
 * The active heading tracks the reader's position from a rAF-throttled scroll
 * read against the cached heading elements, so an idle article costs nothing
 * and a long prose section still updates correctly.
 */
export function BlogToc({ items }: { items: BlogTocItem[] }) {
  const [activeId, setActiveId] = React.useState<string | null>(
    items[0]?.id ?? null
  )

  React.useEffect(() => {
    if (items.length === 0) return
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((heading): heading is HTMLElement => heading !== null)
    if (headings.length === 0) return

    // ponytail: a rAF-throttled scroll read, not an IntersectionObserver.
    // An observer needs a root rect big enough to catch a heading, and prose
    // sections leave that rect empty for most of a scroll — the highlight then
    // silently sticks to the first item forever. Reading ≤20 cached elements
    // per frame is cheap and always agrees with what the reader sees. The
    // selection rule itself lives in `resolveActiveTocId` so it is testable.
    const READER_LINE_PX = 128
    const ids = headings.map((heading) => heading.id)
    let frame = 0

    const sync = () => {
      frame = 0
      setActiveId(
        resolveActiveTocId(
          ids,
          headings.map((heading) => heading.getBoundingClientRect().top),
          READER_LINE_PX
        )
      )
    }

    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(sync)
    }

    sync()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [items])

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
          <TocList
            items={items}
            activeId={activeId}
            layoutId="blog-toc-mobile-pill"
          />
        </div>
      </details>

      <nav
        aria-label="In this post"
        className="hidden lg:sticky lg:top-24 lg:block"
      >
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
          <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            In this post
          </h2>
          <div className="mt-3">
            <TocList
              items={items}
              activeId={activeId}
              layoutId="blog-toc-desktop-pill"
            />
          </div>
        </div>
      </nav>
    </>
  )
}
