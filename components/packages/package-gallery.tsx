"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { HugeiconsIcon } from "@hugeicons/react"
import { Image01Icon } from "@hugeicons/core-free-icons"
import {
  buildGalleryPhotos,
  describeGalleryPhoto,
  galleryOpenerLabel,
  resolveListingImageUrl,
  type GalleryPhotoInput,
} from "@/lib/listings"

// Interaction-only: the lightbox chunk never rides the first paint — it
// loads on first open (ticket 19).
const PackageLightbox = dynamic(
  () =>
    import("@/components/packages/package-lightbox").then(
      (m) => m.PackageLightbox
    ),
  { ssr: false }
)

export interface PackageGalleryProps {
  title: string
  destinationName: string
  mainImage: string
  images: GalleryPhotoInput[]
}

export function PackageGallery({
  title,
  destinationName,
  mainImage,
  images = [],
}: PackageGalleryProps) {
  const allPhotos = React.useMemo(
    () => buildGalleryPhotos(title, destinationName, mainImage, images),
    [title, destinationName, mainImage, images]
  )

  const [lightboxOpen, setLightboxOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(0)
  // Stays mounted after first open so the lightbox close exit can play;
  // the chunk still loads lazily on first open (ticket 19).
  const [lightboxMounted, setLightboxMounted] = React.useState(false)
  // The opener that launched the dialog — focus returns here on close.
  const openerRef = React.useRef<HTMLButtonElement | null>(null)

  const openLightbox = (index: number, opener: HTMLButtonElement | null) => {
    openerRef.current = opener
    setActiveIndex(index)
    setLightboxMounted(true)
    setLightboxOpen(true)
  }

  const openerButton = (
    index: number,
    className: string,
    imgClassName: string,
    eager: boolean
  ) => {
    const photo = allPhotos[index]
    return (
      <button
        key={photo.id}
        type="button"
        onClick={(e) => openLightbox(index, e.currentTarget)}
        aria-label={galleryOpenerLabel(photo.caption, index, allPhotos.length)}
        className={className}
      >
        <img
          src={resolveListingImageUrl(photo.image)}
          alt={describeGalleryPhoto(
            title,
            photo.caption,
            index,
            allPhotos.length
          )}
          loading={eager ? "eager" : "lazy"}
          {...(eager ? { fetchPriority: "high" as const } : {})}
          decoding="async"
          className={imgClassName}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0"
        />
      </button>
    )
  }

  const photoCount = allPhotos.length

  return (
    <>
      <section aria-label={`${title} photo showcase`} className="relative">
        {photoCount === 1 ? (
          // Single Image Cinematic Layout
          <div className="group relative overflow-hidden rounded-3xl border border-border/80 bg-muted shadow-sm transition-all duration-300 hover:border-foreground/20">
            {openerButton(
              0,
              "group relative block w-full cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              "aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] sm:aspect-[21/9]",
              true
            )}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-80"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-4 bottom-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-all group-hover:bg-black/80"
            >
              <HugeiconsIcon icon={Image01Icon} size={15} aria-hidden="true" />
              <span>View full image</span>
            </div>
          </div>
        ) : photoCount <= 3 ? (
          // 2 or 3 Images Side-by-Side
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {allPhotos.map((_, index) =>
              openerButton(
                index,
                "group relative block cursor-pointer overflow-hidden rounded-2xl border border-border/80 bg-muted text-left shadow-sm transition-all hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                "aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105",
                index === 0
              )
            )}
          </div>
        ) : (
          // 4+ Images: Editorial Luxury Mosaic Grid
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-muted/20 p-1.5 shadow-sm">
            <div className="grid h-[340px] grid-cols-1 gap-2 sm:h-[420px] sm:grid-cols-4 sm:grid-rows-2 md:h-[460px]">
              {/* Primary Large Image */}
              {openerButton(
                0,
                "group relative block cursor-pointer overflow-hidden rounded-2xl bg-muted text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:col-span-2 sm:row-span-2",
                "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]",
                true
              )}

              {/* Secondary Images (up to 4) */}
              {allPhotos.slice(1, 5).map((photo, i) => {
                const actualIndex = i + 1
                const isLastSlot = i === 3 && photoCount > 5
                const remaining = photoCount - 5

                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={(e) => openLightbox(actualIndex, e.currentTarget)}
                    aria-label={galleryOpenerLabel(
                      photo.caption,
                      actualIndex,
                      photoCount
                    )}
                    className="group relative hidden cursor-pointer overflow-hidden rounded-2xl bg-muted text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:block"
                  >
                    <img
                      src={resolveListingImageUrl(photo.image)}
                      alt={describeGalleryPhoto(
                        title,
                        photo.caption,
                        actualIndex,
                        photoCount
                      )}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0"
                    />

                    {isLastSlot && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-[2px] transition-colors group-hover:bg-black/70"
                      >
                        <span className="text-xl font-bold">+{remaining}</span>
                        <span className="text-xs font-medium text-white/90">
                          more photos
                        </span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* "View all photos" button */}
            <button
              type="button"
              onClick={(e) => openLightbox(0, e.currentTarget)}
              className="absolute right-4 bottom-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <HugeiconsIcon icon={Image01Icon} size={15} aria-hidden="true" />
              <span>View all {photoCount} photos</span>
            </button>
          </div>
        )}
      </section>

      {lightboxMounted ? (
        <PackageLightbox
          title={title}
          photos={allPhotos}
          index={activeIndex}
          open={lightboxOpen}
          onIndexChange={setActiveIndex}
          onOpenChange={setLightboxOpen}
          returnRef={openerRef}
        />
      ) : null}
    </>
  )
}
