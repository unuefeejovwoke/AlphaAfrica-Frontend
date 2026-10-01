"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getPageItems } from "@/lib/api/shared"

/**
 * Numbered hotel pagination — Prev/Next plus a compact page window with
 * ellipsis, `Showing A–B of N`, and `aria-current="page"` on the active
 * page. Page changes travel in the URL; the owner scrolls + moves focus.
 * Mirrors the cars listing pagination so both catalogues paginate alike.
 */
export function HotelPagination({
  page,
  totalPages,
  start,
  end,
  totalCount,
  isPending,
  onPageChange,
}: {
  page: number
  totalPages: number
  start: number
  end: number
  totalCount: number
  isPending?: boolean
  onPageChange: (nextPage: number) => void
}) {
  if (totalPages <= 1) {
    return (
      <p
        className="text-center text-xs font-medium text-muted-foreground"
        aria-live="polite"
      >
        Showing {totalCount} {totalCount === 1 ? "Hotel" : "Hotels"} on this
        page
      </p>
    )
  }

  const items = getPageItems(page, totalPages)

  return (
    <nav aria-label="Hotel pages" className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isPending}
          aria-label="Go to previous Hotels page"
          className="touch-manipulation"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} aria-hidden="true" />
          <span>Previous</span>
        </Button>
        <div className="hidden items-center gap-1.5 sm:flex" role="list">
          {items.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="px-1 text-xs font-medium text-muted-foreground"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                role="listitem"
                onClick={() => onPageChange(item)}
                disabled={isPending}
                aria-label={`Go to Hotels page ${item}`}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  "flex size-9 touch-manipulation items-center justify-center rounded-lg text-sm font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                  item === page
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{item}</span>
              </button>
            )
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isPending}
          aria-label="Go to next Hotels page"
          className="touch-manipulation"
        >
          <span>Next</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} aria-hidden="true" />
        </Button>
      </div>
      <p
        className="text-xs font-medium text-muted-foreground"
        aria-live="polite"
      >
        Showing {start}–{end} of {totalCount}{" "}
        {totalCount === 1 ? "Hotel" : "Hotels"} · Page {page} of {totalPages}
        {isPending ? " · Updating…" : ""}
      </p>
      <div className="flex items-center gap-1.5 sm:hidden" role="list">
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`m-ellipsis-${index}`}
              aria-hidden="true"
              className="px-1 text-xs font-medium text-muted-foreground"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              role="listitem"
              onClick={() => onPageChange(item)}
              disabled={isPending}
              aria-label={`Go to Hotels page ${item}`}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "flex size-9 touch-manipulation items-center justify-center rounded-lg text-sm font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                item === page
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{item}</span>
            </button>
          )
        )}
      </div>
    </nav>
  )
}
