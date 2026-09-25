"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

/**
 * Thumb-first booking bar for the Hotel detail (Phase 4, ticket 07).
 *
 * Appears after scrolling past the gallery on small screens only: locked
 * from-price-per-night copy plus one obvious action that jumps to the Room
 * Type choice. The detail container already reserves bottom space, so the
 * bar never covers closing content.
 */
export function HotelMobileBar({
  fromPriceLabel,
  hotelName,
}: {
  fromPriceLabel: string | null
  hotelName: string
}) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 350)
    }
    // Initial check covers deep links (#room-types) and restored scroll.
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (!visible) return null

  return (
    <aside
      aria-label={`Quick booking bar for ${hotelName}`}
      className="fixed inset-x-0 bottom-0 z-40 animate-in border-t border-border/80 bg-background/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md duration-200 slide-in-from-bottom lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            From
          </span>
          <span className="truncate text-base font-bold text-foreground">
            {fromPriceLabel ?? "Prices confirmed at booking"}
          </span>
        </div>

        <Button
          render={
            <a
              href="#room-types"
              aria-label={`See Room Types and prices at ${hotelName}`}
            />
          }
          size="sm"
          className="shrink-0 gap-1.5 shadow-md"
        >
          <span>See Room Types</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} aria-hidden="true" />
        </Button>
      </div>
    </aside>
  )
}
