"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Image01Icon } from "@hugeicons/core-free-icons"
import type { HotelGalleryImage } from "@/lib/api/hotels"
import { cn } from "@/lib/utils"

/**
 * Hotel photo gallery (Phase 4, ticket 03).
 *
 * Main photo with a thumbnail strip: every image carries descriptive alt
 * text from `toHotelDetailDisplay` (Hotel name plus caption or position), so
 * the Hotel feels real before payment. The hero loads eagerly; every
 * other photo lazy-loads below the fold. Thumbnails are real buttons with
 * pressed state and an announced photo count — no hover-only interaction.
 */
export function HotelGallery({
  hotelName,
  images,
}: {
  hotelName: string
  images: HotelGalleryImage[]
}) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const safeIndex = Math.min(activeIndex, images.length - 1)
  const active = images[safeIndex]

  if (!active) return null

  return (
    <section
      aria-label={`${hotelName} photos`}
      className="flex flex-col gap-3"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-muted shadow-xs sm:rounded-3xl">
        <img
          key={active.src}
          src={active.src}
          alt={active.alt}
          fetchPriority="high"
          decoding="async"
          className="aspect-[16/10] w-full object-cover sm:aspect-[21/9]"
        />
        <p
          aria-live="polite"
          className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
        >
          <HugeiconsIcon icon={Image01Icon} size={14} aria-hidden="true" />
          <span>
            Photo {safeIndex + 1} of {images.length}
          </span>
        </p>
      </div>

      {images.length > 1 ? (
        <div
          role="group"
          aria-label={`Choose a photo of ${hotelName}`}
          className="grid grid-cols-4 gap-2 sm:grid-cols-6"
        >
          {images.map((image, index) => (
            <button
              key={`${image.src}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-pressed={index === safeIndex}
              aria-label={`Show photo ${index + 1} of ${images.length}: ${image.alt}`}
              className={cn(
                "min-h-11 touch-manipulation overflow-hidden rounded-xl border-2 bg-muted transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                index === safeIndex
                  ? "border-primary"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <img
                src={image.src}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
