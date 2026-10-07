"use client"

import * as React from "react"
import Image from "next/image"
import { motion } from "motion/react"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  BedDoubleIcon,
  StarIcon,
} from "@hugeicons/core-free-icons"
import {
  formatRoomTypeCapacity,
  hasSubstantiveRoomDescription,
  type RoomType,
} from "@/lib/api/hotels"
import { parsePriceAmount, resolveListingImageUrl } from "@/lib/listings"
import { formatNaira } from "@/lib/format"
import { MOTION_SPRINGS } from "@/lib/motion/springs"
import { cn } from "@/lib/utils"

/** next/image cannot optimize `data:` URLs — render those with a plain img. */
function isDataUrl(src: string): boolean {
  return src.trim().toLowerCase().startsWith("data:")
}

/**
 * One-Room-Type radio choice for a Hotel Booking.
 *
 * Exactly one Room Type per Hotel Booking (the backend takes a single
 * `room_type_id`), so this is a real fieldset/legend radio group with no
 * default: the guest makes an explicit choice and a Booking never maps to the
 * wrong Room Type.
 *
 * The comparison is the point, so each row leads with what the guest is
 * actually choosing between. A photo (the API ships one per Room Type and the
 * previous text-only rows never rendered it), the Room Type name, a scannable
 * capacity line, and the per-night price set in tabular figures in a trailing
 * column, so a 6x price spread reads down the page. The cheapest priced Room
 * Type is flagged from real data, not a hardcoded badge. Descriptions that only
 * restate the Room Type and Hotel names are dropped, because printing them
 * under the name they repeat is noise.
 *
 * Availability stays backend-owned: room counts here are display only.
 */
export function HotelRoomChoice({
  rooms,
  value,
  onChange,
  guidance,
  hotelName,
}: {
  rooms: RoomType[]
  /** Selected Room Type id, or null before the guest chooses. */
  value: number | null
  onChange: (roomTypeId: number) => void
  /** Inline capacity guidance for the current selection, if any. */
  guidance?: string | null
  /** Hotel name, used to detect descriptions that only restate the names. */
  hotelName: string
}) {
  const groupId = React.useId()
  const guidanceId = `${groupId}-guidance`

  // Flag the cheapest priced Room Type from real numbers. Unpriced rows are
  // excluded so a missing price never wins the comparison.
  const cheapestRoomId = React.useMemo(() => {
    let cheapestId: number | null = null
    let cheapestPrice = Number.POSITIVE_INFINITY
    for (const room of rooms) {
      const price = parsePriceAmount(room.price_per_night)
      if (price === null || price >= cheapestPrice) continue
      cheapestPrice = price
      cheapestId = room.id
    }
    return cheapestId
  }, [rooms])

  return (
    <fieldset
      aria-describedby={guidance ? guidanceId : undefined}
      className="flex w-full flex-col gap-2.5"
    >
      <legend className="sr-only">
        Choose one Room Type for this Hotel Booking
      </legend>
      <RadioGroupPrimitive
        value={value === null ? "" : String(value)}
        onValueChange={(next) => onChange(Number(next))}
        className="flex flex-col gap-2.5"
      >
        {rooms.map((room) => {
          const price = parsePriceAmount(room.price_per_night)
          const selected = value === room.id
          const isCheapest = price !== null && room.id === cheapestRoomId
          const imageSrc = resolveListingImageUrl(room.image)
          const showDescription = hasSubstantiveRoomDescription(
            room.description,
            room.name,
            hotelName
          )

          return (
            <motion.label
              key={room.id}
              whileTap={{ scale: 0.99 }}
              transition={MOTION_SPRINGS.tactile}
              className={cn(
                "group flex cursor-pointer touch-manipulation items-center gap-3.5 rounded-2xl border-2 bg-card p-2.5 text-left transition-[border-color,background-color,box-shadow] duration-300 ease-brand focus-within:ring-2 focus-within:ring-ring focus-within:outline-none sm:gap-4 sm:p-3",
                selected
                  ? "border-primary bg-primary/[0.04] shadow-[0_2px_16px_-6px_rgba(255,103,56,0.35)]"
                  : "border-border/80 hover:border-foreground/25 hover:shadow-xs"
              )}
            >
              {/* Room photo: the primary comparison cue between a standard
                  room and a suite. Falls back to a bed glyph when the backend
                  carries no image, so the row never collapses in height. */}
              <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted sm:size-24">
                {imageSrc.length > 0 ? (
                  isDataUrl(imageSrc) ? (
                    <img
                      src={imageSrc}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Image
                      src={imageSrc}
                      alt=""
                      fill
                      loading="lazy"
                      sizes="96px"
                      className="object-cover"
                    />
                  )
                ) : (
                  <HugeiconsIcon
                    icon={BedDoubleIcon}
                    size={22}
                    className="text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[15px] font-bold text-balance text-foreground sm:text-base">
                    {room.name}
                  </span>
                  {isCheapest ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary uppercase">
                      <HugeiconsIcon
                        icon={StarIcon}
                        size={10}
                        className="fill-current text-current"
                        aria-hidden="true"
                      />
                      <span>Lowest price</span>
                    </span>
                  ) : null}
                </span>

                <span className="text-[13px] leading-snug text-muted-foreground">
                  {formatRoomTypeCapacity(room)}
                </span>

                {/* Only printed when the copy says something the Room Type
                    name does not already say. */}
                {showDescription ? (
                  <span className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground/90">
                    {room.description}
                  </span>
                ) : null}
              </span>

              {/* Price in a right-hand column so a 6x spread reads down the
                  page instead of scattering through the copy. The hairline
                  turns the gap between the two columns into a legible table
                  gutter instead of dead space. */}
              <span className="flex shrink-0 flex-col items-end border-l border-border/60 pl-3 text-right sm:pl-4">
                {price !== null ? (
                  <>
                    <span className="text-lg font-extrabold tracking-tight text-foreground tabular-nums sm:text-xl">
                      {formatNaira(price)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      per night
                    </span>
                  </>
                ) : (
                  <span className="max-w-24 text-[12px] leading-snug font-medium text-muted-foreground">
                    Confirmed at booking
                  </span>
                )}
              </span>

              {/* Radio on the trailing edge: the whole row is the label, so
                  the control only confirms the state rather than being the
                  hit target. */}
              <Radio.Root
                value={String(room.id)}
                aria-label={`Choose ${room.name}`}
                className="flex size-6 shrink-0 touch-manipulation items-center justify-center rounded-full border-2 border-input bg-card transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-checked:border-primary"
              >
                <Radio.Indicator className="size-3 rounded-full bg-primary data-unchecked:hidden" />
              </Radio.Root>

              {/* Announced selection state; the ring and tint are visual only. */}
              <span className="sr-only" role="status">
                {selected ? `${room.name} selected` : ""}
              </span>
            </motion.label>
          )
        })}
      </RadioGroupPrimitive>

      {guidance ? (
        <p
          id={guidanceId}
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-[13px] leading-relaxed font-medium text-foreground"
        >
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={15}
            className="mt-0.5 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <span>{guidance}</span>
        </p>
      ) : null}
    </fieldset>
  )
}
