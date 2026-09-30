"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Tailwind `lg` breakpoint. Below this the stay panel is not sticky, so the
 *  quick bar is the only always-reachable way back to it. */
const DESKTOP_QUERY = "(min-width: 1024px)"

/**
 * Thumb-first booking bar for the Hotel detail.
 *
 * Owns an `IntersectionObserver` over a sentinel element the caller renders
 * (via `sentinelRef`) at the top of the stay panel. Once that sentinel scrolls
 * above the sticky header the bar appears. An observer does the work, so this
 * costs nothing per scroll frame and cannot jank on mobile. On desktop the
 * panel is sticky and a `matchMedia` guard keeps the bar out of the way.
 *
 * The detail container reserves bottom space, so the bar never covers closing
 * content.
 */
export function HotelMobileBar({
  priceLabel,
  roomLabel,
  sentinelRef,
}: {
  /** Per-night copy for the chosen Room Type, or the Hotel from-price. */
  priceLabel: string | null
  /** Chosen Room Type name, or null before the guest chooses. */
  roomLabel: string | null
  /** Ref for the sentinel the caller renders at the top of the stay panel. */
  sentinelRef: React.RefObject<HTMLDivElement | null>
}) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const desktop = window.matchMedia(DESKTOP_QUERY)
    if (desktop.matches) {
      setVisible(false)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      // 72px clears the sticky site header so the bar never overlaps it.
      { rootMargin: "-72px 0px 0px 0px" }
    )
    observer.observe(sentinel)

    // The panel stops being sticky at `lg`. Follow the breakpoint so a
    // desktop resize never leaves the bar stuck open, and re-read the sentinel
    // position when returning to mobile since the observer does not re-fire.
    const handleBreakpoint = (event: MediaQueryListEvent) => {
      setVisible(!event.matches && sentinel.getBoundingClientRect().top < 72)
    }
    desktop.addEventListener("change", handleBreakpoint)

    return () => {
      observer.disconnect()
      desktop.removeEventListener("change", handleBreakpoint)
    }
  }, [sentinelRef])

  return (
    <aside
      aria-label="Quick booking bar"
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-4 py-3 shadow-[0_-4px_20px_rgba(23,18,23,0.06)] backdrop-blur-md transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden",
        "motion-reduce:transition-none",
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      )}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {roomLabel ? "Your room" : "From"}
          </span>
          <span className="truncate text-[15px] font-bold text-foreground">
            {priceLabel ?? "Prices confirmed at booking"}
          </span>
        </div>

        <ButtonLink
          href="#stay-panel"
          aria-label={
            roomLabel
              ? `Return to your stay dates and total for ${roomLabel}`
              : "Return to your stay dates and total"
          }
          size="sm"
          tabIndex={visible ? 0 : -1}
          className="h-10 shrink-0 gap-1.5 px-4"
        >
          <span>Set dates</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} aria-hidden="true" />
        </ButtonLink>
      </div>
    </aside>
  )
}
