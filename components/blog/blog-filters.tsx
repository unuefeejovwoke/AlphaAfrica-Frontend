"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { buildBlogSearchParams, parseBlogOrdering } from "@/lib/blog"
import type { BlogFilters } from "@/lib/api/blog"
import { BLOG_ORDERINGS } from "@/lib/api/blog"
import type { BlogCategory, BlogTag } from "@/lib/api/blog"
import { track } from "@/lib/analytics"

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input/80 bg-background/80 px-3.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-foreground/20 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"

const inputClassName =
  "flex h-11 w-full rounded-xl border border-input/80 bg-background/80 px-3.5 text-sm font-medium text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/70 hover:border-foreground/20 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"

const ORDERING_LABELS: Record<string, string> = {
  "-published_at": "Newest first",
  published_at: "Oldest first",
  "-view_count": "Most viewed",
  title: "Title A–Z",
}

/**
 * Blog listing controls (client): search, category, tag, ordering, and
 * featured update the URL via `startTransition` + `router.replace`, so the
 * server-filtered grid stays shareable and crawlable. The native GET form
 * keeps filtering working without JavaScript.
 */
export function BlogFilters({
  initial,
  categories,
  tags,
}: {
  initial: BlogFilters
  categories: BlogCategory[]
  tags: BlogTag[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = React.useTransition()
  const [search, setSearch] = React.useState(initial.search ?? "")
  const [category, setCategory] = React.useState(initial.category ?? "")
  const [tag, setTag] = React.useState(initial.tag ?? "")
  const [ordering, setOrdering] = React.useState<string>(initial.ordering ?? "-published_at")
  const [featured, setFeatured] = React.useState(initial.featured === true)

  React.useEffect(() => {
    setSearch(initial.search ?? "")
    setCategory(initial.category ?? "")
    setTag(initial.tag ?? "")
    setOrdering(initial.ordering ?? "-published_at")
    setFeatured(initial.featured === true)
  }, [initial.search, initial.category, initial.tag, initial.ordering, initial.featured])

  const apply = React.useCallback(
    (next: { search: string; category: string; tag: string; ordering: string; featured: boolean }) => {
      const query = buildBlogSearchParams({
        search: next.search.trim() || undefined,
        category: next.category || undefined,
        tag: next.tag || undefined,
        ordering: parseBlogOrdering(next.ordering),
        featured: next.featured || undefined,
      })
      // Interaction handler (not an effect): fire-and-forget funnel event.
      // Props are coarse flags only — never PII, slugs, or raw query text.
      try {
        track("blog_search", {
          has_search: next.search.trim().length > 0,
          has_category: next.category.length > 0,
          has_tag: next.tag.length > 0,
        })
      } catch {
        // Analytics is best-effort; filtering must never fail on tracking.
      }
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
      })
    },
    [pathname, router]
  )

  const hasActive =
    search.trim() !== "" || category !== "" || tag !== "" || featured || ordering !== "-published_at"

  return (
    <div className="relative rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs sm:p-2">
      <form
        method="get"
        action="/blog"
        aria-label="Filter blog posts"
        aria-busy={isPending || undefined}
        onSubmit={(event) => {
          event.preventDefault()
          apply({ search, category, tag, ordering, featured })
        }}
        className="flex flex-col gap-5 rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
            <label
              htmlFor="blog-filter-search"
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              Search posts
            </label>
            <input
              id="blog-filter-search"
              name="search"
              type="search"
              value={search}
              disabled={isPending}
              placeholder="Visas, documents, packing…"
              autoComplete="off"
              onChange={(event) => {
                const next = event.target.value
                setSearch(next)
              }}
              onBlur={() => apply({ search, category, tag, ordering, featured })}
              className={inputClassName}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="blog-filter-category"
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              Category
            </label>
            <select
              id="blog-filter-category"
              name="category"
              value={category}
              disabled={isPending}
              onChange={(event) => {
                const next = event.target.value
                setCategory(next)
                apply({ search, category: next, tag, ordering, featured })
              }}
              className={selectClassName}
            >
              <option value="">All categories</option>
              {categories.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="blog-filter-tag"
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              Tag
            </label>
            <select
              id="blog-filter-tag"
              name="tag"
              value={tag}
              disabled={isPending}
              onChange={(event) => {
                const next = event.target.value
                setTag(next)
                apply({ search, category, tag: next, ordering, featured })
              }}
              className={selectClassName}
            >
              <option value="">All tags</option>
              {tags.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="blog-filter-ordering"
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              Sort by
            </label>
            <select
              id="blog-filter-ordering"
              name="ordering"
              value={ordering}
              disabled={isPending}
              onChange={(event) => {
                const next = event.target.value
                setOrdering(next)
                apply({ search, category, tag, ordering: next, featured })
              }}
              className={selectClassName}
            >
              {BLOG_ORDERINGS.map((value) => (
                <option key={value} value={value}>
                  {ORDERING_LABELS[value] ?? value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label
            htmlFor="blog-filter-featured"
            className={cn(
              "inline-flex cursor-pointer touch-manipulation items-center gap-3 text-sm font-medium text-foreground"
            )}
          >
            <input
              id="blog-filter-featured"
              name="featured"
              type="checkbox"
              value="true"
              checked={featured}
              disabled={isPending}
              onChange={(event) => {
                const next = event.target.checked
                setFeatured(next)
                apply({ search, category, tag, ordering, featured: next })
              }}
              className="size-4 shrink-0 rounded border-input accent-primary"
            />
            <span className="select-none">Featured posts only</span>
          </label>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isPending} className="h-10 font-semibold">
              <span>{isPending ? "Updating…" : "Apply filters"}</span>
            </Button>
            {hasActive && (
              <Button
                render={<Link href="/blog" scroll={false} />}
                variant="outline"
                className="h-10 font-medium"
              >
                <span>Clear</span>
              </Button>
            )}
          </div>
        </div>

        <div
          className="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "size-1.5 rounded-full transition-colors",
                isPending ? "animate-ping bg-amber-500" : hasActive ? "bg-primary" : "bg-muted-foreground/40"
              )}
            />
            {isPending
              ? "Updating posts…"
              : hasActive
                ? "Filters applied. URL updated for sharing."
                : "Filters update the address bar for shareable and bookmarkable posts."}
          </span>
        </div>
      </form>
    </div>
  )
}
