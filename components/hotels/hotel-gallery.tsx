"use client"

import * as React from "react"
import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import { Maximize01Icon } from "@hugeicons/core-free-icons"
import type { HotelGalleryImage } from "@/lib/api/hotels"
import { cn } from "@/lib/utils"

// Interaction-only interface (ticket 22): the lightbox loads on first open.
// The largest-content hero below stays in this statically-imported component,
// so layout and the preload hint are unaffected.
const HotelLightbox = React.lazy(() =>
  import("@/components/hotels/hotel-lightbox").then((m) => ({
    default: m.HotelLightbox,
  }))
)

/** next/image cannot optimize `data:` URLs — render those with a plain img. */
function isDataUrl(src: string): boolean {
  return src.trim().toLowerCase().startsWith("data:")
}

/**
 * Hotel photography.
 *
 * Most Hotels ship a single photo, so the default render is a single clean
 * hero with no counter and no thumbnail strip: a "Photo 1 of 1" badge is
 * noise. When a Hotel does carry several images the strip and counter appear,
 * and the hero opens a keyboard-navigable lightbox.
 *
 * Every image carries descriptive alt text from `toHotelDetailDisplay`
 * (Hotel name plus caption or position), so the Hotel reads as real before
 * payment. The hero loads eagerly as the LCP element; thumbs and lightbox
 * slides lazy-load. The hero is a real button, so the affordance is never
 * hover-only, and the lightbox traps focus and closes on Escape via Base UI.
 */
export function HotelGallery({
  hotelName,
  images,
}: {
  hotelName: string
  images: HotelGalleryImage[]
}) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)

  const safeIndex = Math.min(activeIndex, Math.max(images.length - 1, 0))
  const active = images[safeIndex]
  const isSingle = images.length < 2

  if (!active) return null

  return (
    <section aria-label={`${hotelName} photos`} className="flex flex-col gap-3">
      {/* Double-bezel: outer tray, inner plate, concentric radii. */}
      <div className="rounded-2xl bg-muted/70 p-1.5 shadow-xs ring-1 ring-border/70">
        {isSingle ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-[calc(1rem-1px)] bg-muted sm:aspect-[16/10] lg:aspect-[21/9]">
            <HotelImage image={active} sizes={HERO_SIZES} priority />
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={`Open photo ${safeIndex + 1} of ${images.length} full screen: ${active.alt}`}
              className="group relative block aspect-[4/3] w-full touch-manipulation overflow-hidden rounded-[calc(1rem-1px)] bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:aspect-[16/10] lg:aspect-[21/9]"
            >
              <HotelImage image={active} sizes={HERO_SIZES} priority />
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10"
              >
                <span className="text-xs font-semibold text-white tabular-nums">
                  {safeIndex + 1} of {images.length}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-transform duration-300 ease-brand group-hover:scale-105">
                  <HugeiconsIcon
                    icon={Maximize01Icon}
                    size={13}
                    aria-hidden="true"
                  />
                  <span>View photos</span>
                </span>
              </span>
            </button>

            <div
              role="group"
              aria-label={`Choose a photo of ${hotelName}`}
              className="mt-1.5 grid grid-cols-5 gap-1.5 sm:grid-cols-6"
            >
              {images.map((image, index) => (
                <button
                  key={`${image.src}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-pressed={index === safeIndex}
                  aria-label={`Show photo ${index + 1} of ${images.length}: ${image.alt}`}
                  className={cn(
                    "relative aspect-[4/3] min-h-11 touch-manipulation overflow-hidden rounded-lg bg-muted transition-[opacity,box-shadow] duration-300 ease-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    index === safeIndex
                      ? "opacity-100 ring-2 ring-primary ring-offset-1 ring-offset-background"
                      : "opacity-60 hover:opacity-100"
                  )}
                >
                  {isDataUrl(image.src) ? (
                    <img
                      src={image.src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={image.src}
                      alt=""
                      fill
                      loading="lazy"
                      sizes="140px"
                      className="object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {isSingle ? null : lightboxOpen ? (
        <React.Suspense fallback={null}>
          <HotelLightbox
            hotelName={hotelName}
            images={images}
            index={safeIndex}
            onIndexChange={setActiveIndex}
            onClose={() => setLightboxOpen(false)}
          />
        </React.Suspense>
      ) : null}
    </section>
  )
}

/**
 * Hero sizes. The hero is the sole occupant of the grid's first column: the
 * page width minus the 400px stay rail and its 48px gap once `lg` applies, so
 * ~768px inside a 1216px content box. Keeping this accurate lets the browser
 * pick the right preload candidate for the LCP image instead of fetching one
 * and then requesting another.
 */
const HERO_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 768px"

/**
 * One gallery image. The hero is the page LCP element and loads eagerly; the
 * `data:` fallback renders through a plain `<img>` because next/image cannot
 * optimize inline sources.
 */
function HotelImage({
  image,
  sizes,
  priority,
}: {
  image: HotelGalleryImage
  sizes: string
  priority?: boolean
}) {
  if (isDataUrl(image.src)) {
    return (
      <img
        src={image.src}
        alt={image.alt}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }
  return (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      priority={priority}
      fetchPriority={priority ? "high" : "auto"}
      sizes={sizes}
      className="object-cover"
    />
  )
}
