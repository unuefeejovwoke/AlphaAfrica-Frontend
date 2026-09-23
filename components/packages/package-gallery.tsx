"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Image01Icon,
  Cancel01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { resolveListingImageUrl } from "@/lib/listings"
import { cn } from "@/lib/utils"

export interface PackageGalleryItem {
  id: number | string
  image: string
  caption?: string
}

export interface PackageGalleryProps {
  title: string
  destinationName: string
  mainImage: string
  images: Array<{ id: number; image: string; caption?: string }>
}

export function PackageGallery({
  title,
  destinationName,
  mainImage,
  images = [],
}: PackageGalleryProps) {
  // Consolidate main image + secondary images into a clean list
  const allPhotos: PackageGalleryItem[] = React.useMemo(() => {
    const list: PackageGalleryItem[] = [
      {
        id: "main",
        image: mainImage,
        caption: `${title} — ${destinationName}`,
      },
    ]

    images.forEach((img) => {
      // Avoid duplicate main image if it exists in the images list
      if (img.image !== mainImage) {
        list.push({
          id: img.id,
          image: img.image,
          caption: img.caption || `${title} — ${destinationName}`,
        })
      }
    })

    return list
  }, [mainImage, images, title, destinationName])

  const [lightboxOpen, setLightboxOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(0)

  const openLightbox = (index: number) => {
    setActiveIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const nextPhoto = React.useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % allPhotos.length)
  }, [allPhotos.length])

  const prevPhoto = React.useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length)
  }, [allPhotos.length])

  // Keyboard navigation for lightbox
  React.useEffect(() => {
    if (!lightboxOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox()
      if (e.key === "ArrowRight") nextPhoto()
      if (e.key === "ArrowLeft") prevPhoto()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [lightboxOpen, nextPhoto, prevPhoto])

  // Lock body scroll when lightbox is open
  React.useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [lightboxOpen])

  const photoCount = allPhotos.length

  return (
    <>
      <section aria-label={`${title} photo showcase`} className="relative">
        {photoCount === 1 ? (
          // Single Image Cinematic Layout
          <div
            onClick={() => openLightbox(0)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && openLightbox(0)}
            className="group relative cursor-pointer overflow-hidden rounded-3xl border border-border/80 bg-muted shadow-sm transition-all duration-300 hover:border-foreground/20"
          >
            <img
              src={resolveListingImageUrl(allPhotos[0].image)}
              alt={allPhotos[0].caption || title}
              fetchPriority="high"
              decoding="async"
              className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] sm:aspect-[21/9]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
            <div className="absolute right-4 bottom-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-all group-hover:bg-black/80">
              <HugeiconsIcon icon={Image01Icon} size={15} aria-hidden="true" />
              <span>View full image</span>
            </div>
          </div>
        ) : photoCount <= 3 ? (
          // 2 or 3 Images Side-by-Side
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {allPhotos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => openLightbox(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openLightbox(index)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/80 bg-muted shadow-sm transition-all hover:border-foreground/20"
              >
                <img
                  src={resolveListingImageUrl(photo.image)}
                  alt={photo.caption || `${title} photo ${index + 1}`}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
              </div>
            ))}
          </div>
        ) : (
          // 4+ Images: Editorial Luxury Mosaic Grid
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-muted/20 p-1.5 shadow-sm">
            <div className="grid h-[340px] grid-cols-1 gap-2 sm:h-[420px] sm:grid-cols-4 sm:grid-rows-2 md:h-[460px]">
              {/* Primary Large Image */}
              <div
                onClick={() => openLightbox(0)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openLightbox(0)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl bg-muted sm:col-span-2 sm:row-span-2"
              >
                <img
                  src={resolveListingImageUrl(allPhotos[0].image)}
                  alt={allPhotos[0].caption || title}
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
              </div>

              {/* Secondary Images (up to 4) */}
              {allPhotos.slice(1, 5).map((photo, i) => {
                const actualIndex = i + 1
                const isLastSlot = i === 3 && photoCount > 5
                const remaining = photoCount - 5

                return (
                  <div
                    key={photo.id}
                    onClick={() => openLightbox(actualIndex)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && openLightbox(actualIndex)
                    }
                    className="group relative hidden cursor-pointer overflow-hidden rounded-2xl bg-muted sm:block"
                  >
                    <img
                      src={resolveListingImageUrl(photo.image)}
                      alt={photo.caption || `${title} photo ${actualIndex + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />

                    {isLastSlot && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-[2px] transition-colors group-hover:bg-black/70">
                        <span className="text-xl font-bold">+{remaining}</span>
                        <span className="text-xs font-medium text-white/90">
                          more photos
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* "View all photos" button */}
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className="absolute right-4 bottom-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <HugeiconsIcon icon={Image01Icon} size={15} aria-hidden="true" />
              <span>View all {photoCount} photos</span>
            </button>
          </div>
        )}
      </section>

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} image gallery`}
          className="fixed inset-0 z-50 flex animate-in flex-col justify-between bg-black/95 text-white backdrop-blur-md duration-200 fade-in"
        >
          {/* Top Bar */}
          <div className="z-20 flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-white/70">
                {activeIndex + 1} of {photoCount}
              </span>
              <span className="text-white/30">·</span>
              <span className="max-w-[200px] truncate text-xs font-medium text-white sm:max-w-md">
                {allPhotos[activeIndex].caption || title}
              </span>
            </div>
            <button
              type="button"
              onClick={closeLightbox}
              aria-label="Close photo gallery"
              className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Main Photo Area */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-8">
            <img
              src={resolveListingImageUrl(allPhotos[activeIndex].image)}
              alt={
                allPhotos[activeIndex].caption ||
                `${title} photo ${activeIndex + 1}`
              }
              className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-2xl transition-all sm:max-h-[78vh]"
            />

            {/* Prev Button */}
            {photoCount > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  prevPhoto()
                }}
                aria-label="Previous photo"
                className="absolute top-1/2 left-4 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <HugeiconsIcon
                  icon={ArrowLeft01Icon}
                  size={20}
                  aria-hidden="true"
                />
              </button>
            )}

            {/* Next Button */}
            {photoCount > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  nextPhoto()
                }}
                aria-label="Next photo"
                className="absolute top-1/2 right-4 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={20}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>

          {/* Thumbnail Strip */}
          {photoCount > 1 && (
            <div className="z-20 flex items-center justify-center gap-2 overflow-x-auto border-t border-white/10 px-4 py-4">
              {allPhotos.map((photo, i) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  className={cn(
                    "relative size-14 shrink-0 overflow-hidden rounded-lg border-2 opacity-60 transition-all hover:opacity-100",
                    i === activeIndex
                      ? "scale-105 border-primary opacity-100"
                      : "border-transparent"
                  )}
                >
                  <img
                    src={resolveListingImageUrl(photo.image)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
