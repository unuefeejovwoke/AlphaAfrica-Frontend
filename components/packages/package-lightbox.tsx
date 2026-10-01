"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import {
  describeGalleryPhoto,
  clampGalleryIndex,
  nextPhotoIndex,
  prevPhotoIndex,
  resolveListingImageUrl,
  type GalleryPhoto,
} from "@/lib/listings"
import { cn } from "@/lib/utils"

export interface PackageLightboxProps {
  title: string
  photos: GalleryPhoto[]
  index: number
  open: boolean
  onIndexChange: (index: number) => void
  onOpenChange: (open: boolean) => void
  /** The opener button that launched the dialog — focus returns here. */
  returnRef: React.RefObject<HTMLButtonElement | null>
}

/**
 * Package photo lightbox on the project's dialog primitive (ticket 19).
 * Focus is trapped while open and restored to the opener on close; the
 * background is inert and Escape closes — all from the primitive, so this
 * component carries no focus or scroll logic of its own. Arrow keys move
 * between photos.
 */
export function PackageLightbox({
  title,
  photos,
  index,
  open,
  onIndexChange,
  onOpenChange,
  returnRef,
}: PackageLightboxProps) {
  const count = photos.length
  const safeIndex = clampGalleryIndex(index, count)
  const active = photos[safeIndex] ?? null

  const next = React.useCallback(() => {
    onIndexChange(nextPhotoIndex(safeIndex, count))
  }, [safeIndex, count, onIndexChange])
  const prev = React.useCallback(() => {
    onIndexChange(prevPhotoIndex(safeIndex, count))
  }, [safeIndex, count, onIndexChange])

  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next()
      if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, next, prev])

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onOpenChange(false)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Popup
          finalFocus={returnRef}
          aria-label={`${title} image gallery`}
          className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 text-white focus:outline-none"
        >
          {/* Top Bar */}
          <div className="z-20 flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-8">
            <div
              className="flex min-w-0 items-center gap-3"
              aria-live="polite"
            >
              <span className="shrink-0 text-xs font-medium text-white/70">
                {index + 1} of {count}
              </span>
              <span aria-hidden="true" className="text-white/30">
                ·
              </span>
              <DialogPrimitive.Title className="max-w-[200px] truncate text-xs font-medium text-white sm:max-w-md">
                {active
                  ? describeGalleryPhoto(title, active.caption, index, count)
                  : title}
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close
              aria-label="Close photo gallery"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* Main Photo Area */}
          {active ? (
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 sm:p-8">
              <img
                key={active.image}
                src={resolveListingImageUrl(active.image)}
                alt={describeGalleryPhoto(title, active.caption, index, count)}
                className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-2xl sm:max-h-[78vh]"
              />

              {count > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Previous photo"
                    className="absolute top-1/2 left-4 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  >
                    <HugeiconsIcon
                      icon={ArrowLeft01Icon}
                      size={20}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Next photo"
                    className="absolute top-1/2 right-4 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  >
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={20}
                      aria-hidden="true"
                    />
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {/* Thumbnail Strip */}
          {count > 1 ? (
            <div className="z-20 flex items-center justify-center gap-2 overflow-x-auto border-t border-white/10 px-4 py-4">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onIndexChange(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  aria-current={i === index ? true : undefined}
                  className={cn(
                    "relative size-14 shrink-0 overflow-hidden rounded-lg border-2 opacity-60 transition-all hover:opacity-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
                    i === index
                      ? "scale-105 border-white opacity-100"
                      : "border-transparent"
                  )}
                >
                  <img
                    src={resolveListingImageUrl(photo.image)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
