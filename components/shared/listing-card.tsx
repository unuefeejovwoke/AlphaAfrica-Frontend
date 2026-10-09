import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { StarIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Amber-filled star glyph — the one star-rating presentation shared by
 * listing badges and rating rows (production hardening, 23).
 */
export function StarGlyph({
  size,
  className,
}: {
  size: number
  className?: string
}) {
  return (
    <HugeiconsIcon
      icon={StarIcon}
      size={size}
      className={cn("fill-amber-400 text-amber-400", className)}
      aria-hidden="true"
    />
  )
}

/** Shared "Featured" pill for listing cards (destinations + packages). */
export function FeaturedBadge() {
  return (
    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-semibold text-white shadow-xs backdrop-blur-md">
      <StarGlyph size={12} />
      Featured
    </span>
  )
}

/** Shared card footer CTA row ("Explore destination" / "View package"). */
export function CardCta({ label }: { label: string }) {
  return (
    <span className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-semibold text-primary transition-colors group-hover:text-primary/90">
      <span>{label}</span>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        size={14}
        className="transition-transform duration-300 group-hover:translate-x-1"
        aria-hidden="true"
      />
    </span>
  )
}

const cardLinkClassName =
  "group reveal relative flex flex-col rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs transition-[transform,box-shadow,border-color] duration-300 ease-brand hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

/**
 * Shared crawlable card shell: image with alt + body. Keeps destination
 * and package cards visually consistent without duplicating markup.
 * Optional `badge` overlays the image top-left (e.g. vehicle type).
 */
export function ListingCardShell({
  href,
  imageSrc,
  imageAlt,
  isFeatured,
  badge,
  children,
}: {
  href: string
  imageSrc: string
  imageAlt: string
  isFeatured?: boolean
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <Link href={href} className={cn(cardLinkClassName)}>
      <div className="flex flex-1 flex-col overflow-hidden rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {/* Plain img: backend media host varies by env, so next/image remotePatterns cannot cover it. */}
          <img
            src={imageSrc}
            alt={imageAlt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 ease-brand group-hover:scale-[1.04]"
          />
          {badge}
          {isFeatured === true && <FeaturedBadge />}
        </div>
        <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-6">
          {children}
        </div>
      </div>
    </Link>
  )
}
