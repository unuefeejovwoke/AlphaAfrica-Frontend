"use client"

import * as React from "react"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { HugeiconsIcon } from "@hugeicons/react"
import { BedSingle01Icon } from "@hugeicons/core-free-icons"
import {
  formatRoomTypeCapacity,
  formatRoomTypePrice,
  type RoomType,
} from "@/lib/api/hotels"
import { cn } from "@/lib/utils"

/**
 * One-Room-Type radio choice for a Hotel Booking (Phase 4, ticket 04).
 *
 * Exactly one Room Type per Hotel Booking (backend takes a single
 * `room_type_id`): a fieldset/legend radio group where each option shows the
 * Room Type name, description, locked per-night price, per-room capacity, and
 * informational room count. No default selection — the guest makes an
 * explicit choice so a Hotel Booking never maps to the wrong Room Type.
 * Availability stays backend-owned; counts here are display only.
 */
export function HotelRoomChoice({
  rooms,
  value,
  onChange,
  guidance,
}: {
  rooms: RoomType[]
  /** Selected Room Type id, or null before the guest chooses. */
  value: number | null
  onChange: (roomTypeId: number) => void
  /** Inline capacity guidance for the current selection, if any. */
  guidance?: string | null
}) {
  const groupId = React.useId()
  const guidanceId = `${groupId}-guidance`

  return (
    <fieldset
      aria-describedby={guidance ? guidanceId : undefined}
      className="flex w-full flex-col gap-4"
    >
      <legend className="sr-only">
        Choose one Room Type for this Hotel Booking
      </legend>
      <RadioGroupPrimitive
        value={value === null ? "" : String(value)}
        onValueChange={(next) => onChange(Number(next))}
        className="flex flex-col gap-4"
      >
        {rooms.map((room) => {
          const priceLabel = formatRoomTypePrice(room.price_per_night)
          const selected = value === room.id
          return (
            <label
              key={room.id}
              className={cn(
                "flex cursor-pointer touch-manipulation items-start gap-3.5 rounded-2xl border-2 bg-card p-4 shadow-xs transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:outline-none sm:p-5",
                selected
                  ? "border-primary"
                  : "border-border/80 hover:border-foreground/25"
              )}
            >
              <Radio.Root
                value={String(room.id)}
                aria-label={`Choose ${room.name}`}
                className="mt-1 flex size-5 shrink-0 touch-manipulation items-center justify-center rounded-full border-2 border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-checked:border-primary"
              >
                <Radio.Indicator className="size-2.5 rounded-full bg-primary data-unchecked:hidden" />
              </Radio.Root>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-start gap-2">
                  <HugeiconsIcon
                    icon={BedSingle01Icon}
                    size={18}
                    className="mt-0.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="text-base font-bold text-foreground sm:text-lg">
                    {room.name}
                  </span>
                </span>
                {room.description.trim().length > 0 ? (
                  <span className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {room.description}
                  </span>
                ) : null}
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-2.5">
                  {priceLabel ? (
                    <span className="text-base font-bold tracking-tight text-foreground">
                      {priceLabel}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      Price confirmed at booking
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {formatRoomTypeCapacity(room)}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {room.total_rooms > 0
                    ? `${room.total_rooms} ${room.total_rooms === 1 ? "room" : "rooms"} of this Room Type at this Hotel`
                    : "Availability confirmed at booking"}
                </span>
              </span>
            </label>
          )
        })}
      </RadioGroupPrimitive>
      {guidance ? (
        <p
          id={guidanceId}
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs leading-relaxed font-medium text-foreground"
        >
          {guidance}
        </p>
      ) : null}
    </fieldset>
  )
}
