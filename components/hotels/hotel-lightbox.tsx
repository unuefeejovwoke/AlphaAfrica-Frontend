"use client"

import Image from "next/image"
import { Dialog } from "@base-ui/react/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import type { HotelGalleryImage } from "@/lib/api/hotels"

/**
 * Full-screen photo viewer for the Hotel gallery (ticket 22).
 *
 * Interaction-only interface: mounted only while the lightbox is open and
 * loaded through `React.lazy` from `HotelGallery`, so its markup and the
 * Base UI Dialog code it needs are fetched on first open instead of
 * weighing down the Hotel detail's first paint. The largest-content hero
 * photo stays server-rendered by `HotelGallery` — this component never
 * renders the hero.
 *
 * Focus trapping, Escape, and backdrop dismissal come from Base UI Dialog.
 * Keyboard/ARIA contract mirrors the gallery: labelled close and navigation
 * buttons, sr-only title/description, and an `aria-live` caption.
 */
export function HotelLightbox({
  hotelName,
  images,
  index,
  onIndexChange,
  onClose,
}: {
  hotelName: string
  images: HotelGalleryImage[]
  index: number
  onIndexChange: (next: number) => void
  onClose: () => void
}) {
  const count = images.length
  const active = images[index]
  if (!active) return null

  const showPrevious = () => onIndexChange((index - 1 + count) % count)
  const showNext = () => onIndexChange((index + 1) % count)

  return (
    <Dialog.Root
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm" />
        <Dialog.Popup
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4 focus:outline-none sm:p-8"
          aria-label={`${hotelName} photo viewer`}
        >
          <Dialog.Title className="sr-only">
            {`${hotelName} photos, ${index + 1} of ${count}`}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {active.alt}
          </Dialog.Description>

          <Dialog.Close
            aria-label="Close photo viewer"
            className="absolute top-4 right-4 flex size-11 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              &times;
            </span>
          </Dialog.Close>

          <div className="relative flex max-h-[78dvh] w-full max-w-5xl items-center justify-center">
            {count > 1 ? (
              <button
                type="button"
                onClick={showPrevious}
                aria-label="Show previous photo"
                className="absolute top-1/2 -left-2 z-10 flex size-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none sm:-left-4"
              >
                <HugeiconsIcon
                  icon={ArrowLeft01Icon}
                  size={18}
                  aria-hidden="true"
                />
              </button>
            ) : null}

            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl">
              <Image
                key={active.src}
                src={active.src}
                alt={active.alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {count > 1 ? (
              <button
                type="button"
                onClick={showNext}
                aria-label="Show next photo"
                className="absolute top-1/2 -right-2 z-10 flex size-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none sm:-right-4"
              >
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={18}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>

          <p
            aria-live="polite"
            className="text-center text-sm font-medium text-white/80"
          >
            {active.caption.trim().length > 0
              ? active.caption
              : `Photo ${index + 1} of ${count}`}
          </p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
