"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  BedDoubleIcon,
  Message01Icon,
} from "@hugeicons/core-free-icons"
import { Button, ButtonLink, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DatePicker } from "@/components/ui/date-picker"
import { TrackLink } from "@/components/analytics/track-link"
import { track } from "@/lib/analytics"
import { HotelPartyStepper } from "@/components/hotels/hotel-party-stepper"
import { HotelRoomChoice } from "@/components/hotels/hotel-room-choice"
import { HotelMobileBar } from "@/components/hotels/hotel-mobile-bar"
import {
  DEFAULT_HOTEL_GUESTS,
  DEFAULT_HOTEL_ROOMS,
  buildHotelBookingParams,
  calculateNights,
  checkRoomCapacity,
  formatRoomTypePrice,
  getHotelSupportWhatsAppUrl,
  parseHotelBookingParams,
  previewStayTotal,
  validateHotelSearchQuery,
  type HotelStayContext,
  type RoomType,
} from "@/lib/api/hotels"
import { formatNaira } from "@/lib/format"

export interface HotelBookingFlowHotel {
  id: number
  slug: string
  name: string
  city: string
}

/** Today as a local YYYY-MM-DD string (never a past date, day precision). */
function todayString(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

/**
 * Hotel detail interactive shell: Room Type choice plus the stay panel.
 *
 * The ordering is the redesign. The Room Type choice is the page's only
 * conversion action, so it sits in the first content row and the stay panel is
 * top-aligned with it rather than with the hero. The panel used to start level
 * with the photo, which put a booking form in front of the guest before they
 * had seen a single Room Type, and left its Continue button disabled above the
 * list that would enable it. Mirroring the current selection is what lets the
 * panel double as the running summary.
 *
 * This component returns a fragment: the page owns the grid and renders the
 * hero as a sibling outside the Suspense boundary, because the hero photo is
 * the LCP element and must be present in the initial HTML. Only the genuinely
 * interactive regions are behind `useSearchParams`, so only they need the
 * client bailout and the skeleton.
 *
 * `details` is a server-rendered slot so static Hotel content stays out of the
 * client bundle; this leaf owns only the choice, the dates, the party, and the
 * live preview. On mobile the panel sits between the Room Types and the
 * supporting detail, so the guest picks a room, then dates, then reads the fine
 * print.
 *
 * Stay-date rules reuse the shared search validation (both-or-neither, real
 * calendar dates, check-out after check-in, neither in the past). Blank dates
 * are "add dates" guidance, not an error. The only chargeable total is the
 * backend-computed amount returned at booking.
 */
export function HotelBookingFlow({
  hotel,
  rooms,
  details,
  startingPrice,
}: {
  hotel: HotelBookingFlowHotel
  rooms: RoomType[]
  /** Server-rendered About, Location, and deferred amenity regions. */
  details: React.ReactNode
  /**
   * Hotel-level starting price as the backend decimal string. Formatted with
   * `formatRoomTypePrice` so the panel header and the Room Type rows share one
   * "₦X per night" shape instead of stacking "From" on a label that already
   * says "from".
   */
  startingPrice: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = React.useMemo(todayString, [])
  const staySentinelRef = React.useRef<HTMLDivElement>(null)

  // One-shot hint hydration: search context or a return from the
  // guest-details step pre-fills dates, party, and the Room Type choice.
  const hint = React.useMemo(() => {
    const parsed = parseHotelBookingParams(
      Object.fromEntries(searchParams.entries()) as Record<string, string>
    )
    const roomHint =
      parsed.room_type_id !== undefined &&
      rooms.some((room) => room.id === parsed.room_type_id)
        ? parsed.room_type_id
        : null
    return {
      roomTypeId: roomHint,
      checkIn: parsed.check_in,
      checkOut: parsed.check_out,
      guests: parsed.guests ?? DEFAULT_HOTEL_GUESTS,
      rooms: parsed.rooms ?? DEFAULT_HOTEL_ROOMS,
    }
  }, [searchParams, rooms])

  const [roomTypeId, setRoomTypeId] = React.useState<number | null>(
    hint.roomTypeId
  )
  const [checkIn, setCheckIn] = React.useState(hint.checkIn)
  const [checkOut, setCheckOut] = React.useState(hint.checkOut)
  const [guests, setGuests] = React.useState(hint.guests)
  const [roomsCount, setRoomsCount] = React.useState(hint.rooms)

  const room = React.useMemo(
    () => rooms.find((candidate) => candidate.id === roomTypeId) ?? null,
    [rooms, roomTypeId]
  )
  const nights = React.useMemo(
    () => calculateNights(checkIn, checkOut),
    [checkIn, checkOut]
  )

  const hasAnyDate = checkIn.trim() !== "" || checkOut.trim() !== ""
  const dateError = React.useMemo(() => {
    if (!hasAnyDate) return null
    const validation = validateHotelSearchQuery({
      destination: "",
      check_in: checkIn,
      check_out: checkOut,
      guests,
      rooms: roomsCount,
      page: 1,
    })
    return validation.success ? null : validation.message
  }, [hasAnyDate, checkIn, checkOut, guests, roomsCount])
  const datesValid = hasAnyDate && dateError === null && nights !== null

  const verdict = React.useMemo(
    () =>
      room
        ? checkRoomCapacity({
            maxGuests: room.max_guests,
            numGuests: guests,
            numRooms: roomsCount,
          })
        : null,
    [room, guests, roomsCount]
  )
  const capacityGuidance = verdict && !verdict.ok ? verdict.guidance : null

  const preview = React.useMemo(
    () =>
      room
        ? previewStayTotal({
            pricePerNight: room.price_per_night,
            nights,
            numRooms: roomsCount,
          })
        : null,
    [room, nights, roomsCount]
  )
  const roomPriceLabel = room ? formatRoomTypePrice(room.price_per_night) : null
  const fromPriceLabel = React.useMemo(
    () => formatRoomTypePrice(startingPrice),
    [startingPrice]
  )

  const canContinue = room !== null && datesValid && (verdict?.ok ?? false)

  const stayContext = React.useMemo<HotelStayContext>(
    () => ({
      destination: `${hotel.name}, ${hotel.city}`,
      check_in: checkIn.trim() !== "" ? checkIn.trim() : null,
      check_out: checkOut.trim() !== "" ? checkOut.trim() : null,
      guests,
      rooms: roomsCount,
    }),
    [hotel.name, hotel.city, checkIn, checkOut, guests, roomsCount]
  )
  const supportHref = getHotelSupportWhatsAppUrl(
    `the ${hotel.name} Hotel stay in ${hotel.city}`,
    hasAnyDate ? stayContext : undefined
  )

  const handleContinue = React.useCallback(() => {
    if (!canContinue || room === null || nights === null) return
    // Funnel: coarse stay shape only — never the Hotel name, dates, or
    // anything personal (ticket 07).
    track("hotel_booking_started", {
      nights,
      rooms: roomsCount,
      guests,
    })
    router.push(
      `/hotels/${hotel.slug}/book?${buildHotelBookingParams({
        room_type_id: room.id,
        check_in: checkIn.trim(),
        check_out: checkOut.trim(),
        guests,
        rooms: roomsCount,
      })}`
    )
  }, [
    canContinue,
    room,
    nights,
    hotel.slug,
    checkIn,
    checkOut,
    guests,
    roomsCount,
    router,
  ])

  const nightWord = nights === 1 ? "night" : "nights"
  const roomWord = roomsCount === 1 ? "room" : "rooms"

  // The one thing standing between the guest and the CTA, phrased as the
  // single next action rather than a stack of possibilities.
  const blockedReason = React.useMemo(() => {
    if (room === null) return "Pick a room to see your total."
    if (!hasAnyDate) return "Add your check-in and check-out dates."
    if (!datesValid) return "Check your dates, then continue."
    if (!(verdict?.ok ?? false))
      return "Adjust rooms or room type so every guest fits."
    return null
  }, [room, hasAnyDate, datesValid, verdict])

  // Placement is owned by the page-level grid. Returning a fragment (rather
  // than a wrapper) puts these three regions directly into that grid, which is
  // what lets the hero render server-side outside this Suspense boundary
  // while the interactive regions keep their column and row.
  return (
    <>
      {/* Room Types: the conversion action, directly under the hero. */}
      <section
        id="room-types"
        aria-labelledby="hotel-rooms-heading"
        className="flex scroll-mt-24 flex-col gap-4 lg:col-start-1 lg:row-start-2"
      >
        <div className="flex flex-col gap-1.5">
          <h2
            id="hotel-rooms-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Choose your room
          </h2>
          <p className="max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
            Every price is per night in Naira, and your total is confirmed
            before you pay anything.
          </p>
        </div>{" "}
        {rooms.length > 0 ? (
          <HotelRoomChoice
            rooms={rooms}
            value={roomTypeId}
            onChange={setRoomTypeId}
            guidance={capacityGuidance}
            hotelName={hotel.name}
          />
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Room Types for this Hotel are being updated. Talk to Alphaa and a
              specialist will confirm availability and per-night prices for your
              dates.
            </p>
            <div>
              <ButtonLink
                href={supportHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                size="sm"
              >
                <HugeiconsIcon
                  icon={Message01Icon}
                  size={14}
                  aria-hidden="true"
                />
                <span>Ask about Room Types</span>
              </ButtonLink>
            </div>
          </div>
        )}
      </section>

      {/* Stay panel. Top-aligned with the Room Type choice on desktop so the
          control and the thing it configures are read together; inline between
          the Room Types and the supporting detail on mobile. It deliberately
          does NOT start level with the hero: a booking form that precedes the
          options it configures asks for dates and party before the guest has
          seen a single Room Type. */}
      <aside
        id="stay-panel"
        aria-label={`Book ${hotel.name}`}
        className="relative min-w-0 scroll-mt-24 lg:col-start-2 lg:row-start-2"
      >
        {/* Zero-height marker at the panel's own top edge. The mobile bar
            observes it, so the bar appears exactly when this panel leaves the
            top of the viewport. Absolute so it never takes a grid cell. */}
        <div
          ref={staySentinelRef}
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px lg:hidden"
        />
        <div className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-border/80 lg:sticky lg:top-24">
          {/* From-price header. The panel answers "what does this cost"
              before it asks for anything. */}
          <div className="flex flex-col gap-1 border-b border-border/70 bg-muted/40 px-5 py-4">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {room ? "Your room" : "From"}
            </span>
            <span className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
              {room
                ? (roomPriceLabel ?? "Price confirmed at booking")
                : (fromPriceLabel ?? "Price confirmed at booking")}
            </span>
            <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <HugeiconsIcon
                icon={BedDoubleIcon}
                size={13}
                aria-hidden="true"
              />
              <span className="truncate">{room ? room.name : hotel.city}</span>
            </span>
          </div>

          <div className="flex flex-col gap-5 p-5">
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="Check-in"
                name="check_in"
                autoComplete="off"
                labelClassName="text-[13px] normal-case tracking-normal"
                min={today}
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                error={
                  checkIn.trim() !== "" ? (dateError ?? undefined) : undefined
                }
              />
              <DatePicker
                label="Check-out"
                name="check_out"
                autoComplete="off"
                labelClassName="text-[13px] normal-case tracking-normal"
                min={checkIn || today}
                value={checkOut}
                onChange={(event) => setCheckOut(event.target.value)}
                error={
                  checkOut.trim() !== "" ? (dateError ?? undefined) : undefined
                }
              />
            </div>

            <HotelPartyStepper
              value={{ guests, rooms: roomsCount }}
              onChange={(next) => {
                setGuests(next.guests)
                setRoomsCount(next.rooms)
              }}
            />

            {/* Total. An auditable breakdown beats a bare figure, and every
                row is a live placeholder rather than a dash that reads as
                broken. The panel does not also print a "what to do next"
                line: the Total slot, the date fields, and the Room Type
                guidance each already name the missing step where it applies,
                so a fourth restatement was pure noise. */}
            <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-muted-foreground">Stay length</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {nights !== null
                    ? `${nights} ${nightWord} × ${roomsCount} ${roomWord}`
                    : "Add your dates"}
                </span>
              </div>
              <div className="flex items-end justify-between gap-3 border-t border-border/70 pt-2.5">
                <span className="text-sm font-semibold text-foreground">
                  Total
                </span>
                <span className="text-right">
                  {preview !== null ? (
                    <span className="block text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                      {formatNaira(String(preview))}
                    </span>
                  ) : (
                    <span className="block text-sm font-semibold text-muted-foreground">
                      Pick a room
                    </span>
                  )}
                </span>
              </div>
              {/* The single, authoritative caveat. It used to appear three
                  times on this page. */}
              <p className="text-xs leading-relaxed text-muted-foreground">
                {preview !== null
                  ? "An estimate, confirmed by our team before you pay."
                  : "Your total is confirmed before you pay."}
              </p>
            </div>

            {/* The removed status line still needs to reach assistive tech
                when the guest changes a date, a party size, or the room. */}
            <p className="sr-only" role="status" aria-live="polite">
              {blockedReason ??
                (preview !== null
                  ? `${nights} ${nightWord} in ${roomsCount} ${roomWord}, total ${formatNaira(String(preview))}. Ready to continue.`
                  : "")}
            </p>

            <Button
              type="button"
              size="lg"
              disabled={!canContinue}
              onClick={handleContinue}
              className="h-12 w-full justify-center"
            >
              <span>Continue</span>
              {/* Nested trailing icon: the arrow reads as part of the
                  control rather than floating beside the label. */}
              <span
                aria-hidden="true"
                data-icon="inline-end"
                className="flex size-6 items-center justify-center rounded-full bg-primary-foreground/20"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </span>
            </Button>

            {/* A disabled primary button with no stated reason is a dead end
                for sighted guests, so the missing step is named next to the
                control waiting on it. This is the visual twin of the `sr-only`
                live region below, which already announces the same sentence on
                every change — hence `aria-hidden`, so assistive tech hears it
                once rather than twice. */}
            {blockedReason ? (
              <p
                aria-hidden="true"
                className="-mt-2 text-[13px] leading-snug text-muted-foreground"
              >
                {blockedReason}
              </p>
            ) : null}

            <TrackLink
              event="support_click"
              eventProps={{
                context: `hotel stay at ${hotel.name}`,
                channel: "whatsapp",
              }}
              href={supportHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 w-full justify-center"
              )}
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={16}
                aria-hidden="true"
              />
              <span>Talk to Alphaa</span>
            </TrackLink>
          </div>
        </div>
      </aside>

      {/* Supporting detail: About, Location, and any amenities the hero
          strip deferred. Read after the guest has chosen a room. */}
      <div className="flex min-w-0 flex-col gap-10 sm:gap-12 lg:col-start-1 lg:row-start-3">
        {details}
      </div>

      {/* Out of flow (`fixed`), so it never takes a grid cell. Mirrors the
          panel's live selection on small screens. */}
      <HotelMobileBar
        priceLabel={
          roomPriceLabel ??
          fromPriceLabel ??
          (room === null ? null : "Price confirmed at booking")
        }
        roomLabel={room?.name ?? null}
        sentinelRef={staySentinelRef}
      />
    </>
  )
}

/**
 * Suspense fallback while stay hints hydrate.
 *
 * The hero is already server-rendered outside this boundary, so the skeleton
 * only stands in for the three interactive regions. It returns a fragment with
 * the same grid placement as the real component, so nothing shifts when the
 * client leaf takes over.
 */
export function HotelBookingFlowFallback() {
  const shimmer = "animate-pulse bg-muted/80 motion-reduce:animate-none"

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Room Types and stay options"
      className="contents"
    >
      <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-2">
        <div className={cn("h-8 w-48 rounded-xl", shimmer)} />
        {[0, 1, 2].map((card) => (
          <div
            key={card}
            aria-hidden="true"
            className="flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-3"
          >
            <div className={cn("size-24 shrink-0 rounded-xl", shimmer)} />
            <div className="flex flex-1 flex-col gap-2">
              <div className={cn("h-4 w-1/3 rounded-lg", shimmer)} />
              <div className={cn("h-3.5 w-1/2 rounded-lg", shimmer)} />
            </div>
            <div className={cn("h-5 w-20 rounded-lg", shimmer)} />
          </div>
        ))}
      </div>

      <div className="min-w-0 lg:col-start-2 lg:row-start-2">
        <div
          aria-hidden="true"
          className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/80"
        >
          <div className={cn("h-24", shimmer)} />
          <div className="flex flex-col gap-4 p-5">
            <div className={cn("h-11 w-full rounded-xl", shimmer)} />
            <div className={cn("h-28 w-full rounded-xl", shimmer)} />
            <div className={cn("h-12 w-full rounded-xl", shimmer)} />
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-start-3">
        <div className={cn("h-8 w-40 rounded-xl", shimmer)} />
        <div className={cn("h-20 w-full rounded-xl", shimmer)} />
      </div>
    </div>
  )
}
