"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  Message01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { TrackLink } from "@/components/analytics/track-link"
import { track } from "@/lib/analytics"
import { HotelPartyStepper } from "@/components/hotels/hotel-party-stepper"
import { HotelRoomChoice } from "@/components/hotels/hotel-room-choice"
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
 * Room Type choice plus stay editing with live preview (Phase 4, ticket 04).
 *
 * Exactly one Room Type per Hotel Booking via an accessible radio choice;
 * capacity enforced as guests ≤ per-room capacity × rooms with inline
 * guidance (zero-capacity rows pass through); date changes preserve the
 * chosen Room Type while re-deriving nights and preview totals; the only
 * chargeable total is the backend-computed amount returned at creation.
 *
 * Static detail content (overview, location, amenities) arrives as RSC
 * children so it stays server-rendered; this leaf owns only the interactive
 * choice, dates, party, and preview. Stay hints (`?check_in=` etc.) are read
 * from the URL so search context and back-navigation survive.
 */
export function HotelBookingFlow({
  hotel,
  rooms,
  children,
}: {
  hotel: HotelBookingFlowHotel
  rooms: RoomType[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = React.useMemo(todayString, [])

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

  // Stay-date rules reuse the shared search validation (both-or-neither,
  // real calendar dates, check-out after check-in, neither in the past).
  // Blank dates are "add dates" guidance, not an error.
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

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px] lg:gap-14">
      <div className="flex min-w-0 flex-col gap-12 sm:gap-14">
        {children}

        {/* Room Types: the one-Room-Type radio choice. */}
        <section
          id="room-types"
          aria-labelledby="hotel-rooms-heading"
          className="flex scroll-mt-24 flex-col gap-5"
        >
          <div className="flex flex-col gap-1">
            <h2
              id="hotel-rooms-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Room Types
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Choose exactly one Room Type for this Hotel Booking. Every price
              below is per night in Naira — the charged total is confirmed
              before you pay.
            </p>
          </div>
          {rooms.length > 0 ? (
            <HotelRoomChoice
              rooms={rooms}
              value={roomTypeId}
              onChange={setRoomTypeId}
              guidance={capacityGuidance}
            />
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Room Types for this Hotel are being updated. Talk to Alphaa and
                a specialist will confirm availability and per-night prices for
                your dates.
              </p>
              <div>
                <Button
                  render={
                    <a
                      href={supportHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  variant="outline"
                  size="sm"
                >
                  <HugeiconsIcon
                    icon={Message01Icon}
                    size={14}
                    aria-hidden="true"
                  />
                  <span>Ask about Room Types</span>
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Sticky stay panel: dates, party, per-night preview, one action. */}
      <aside aria-label={`Book ${hotel.name}`} className="min-w-0">
        <div className="flex flex-col gap-5 rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6 lg:sticky lg:top-24">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold text-foreground">Your stay</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {room ? room.name : "Choose a Room Type below"} · {hotel.city}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <DatePicker
              label="Check-in"
              min={today}
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              error={
                checkIn.trim() !== "" ? (dateError ?? undefined) : undefined
              }
            />
            <DatePicker
              label="Check-out"
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

          <dl className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-muted-foreground">Per night</dt>
              <dd className="text-xs font-semibold text-foreground">
                {roomPriceLabel ?? "Confirmed at booking"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-muted-foreground">Nights</dt>
              <dd className="text-xs font-semibold text-foreground tabular-nums">
                {nights !== null ? `${nights} ${nightWord}` : "Add dates"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
              <dt className="text-xs font-semibold text-foreground">
                Preview total
              </dt>
              <dd className="text-base font-extrabold tracking-tight text-foreground tabular-nums">
                {preview !== null ? formatNaira(String(preview)) : "—"}
              </dd>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {preview !== null
                ? `Preview for ${nights} ${nightWord} × ${roomsCount} ${roomWord}. The backend total is what you're charged.`
                : "Exact total confirmed before you pay — the backend total is what you're charged."}
            </p>
          </dl>

          {!canContinue ? (
            <p
              role="status"
              className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
            >
              <HugeiconsIcon
                icon={AlertCircleIcon}
                size={14}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span>
                {room === null
                  ? "Choose one Room Type to continue — each Hotel Booking covers exactly one."
                  : !hasAnyDate
                    ? "Add your check-in and check-out dates to continue."
                    : !datesValid
                      ? "Review your stay dates to continue."
                      : "Adjust rooms or Room Type so every guest fits."}
              </span>
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            disabled={!canContinue}
            onClick={handleContinue}
            className="w-full justify-center"
          >
            <span>Continue with this stay</span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={16}
              aria-hidden="true"
            />
          </Button>

          <Button
            render={
              <TrackLink
                event="support_click"
                eventProps={{
                  context: `hotel stay at ${hotel.name}`,
                  channel: "whatsapp",
                }}
                href={supportHref}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            variant="outline"
            size="sm"
            className="w-full justify-center"
          >
            <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </Button>
        </div>
      </aside>
    </div>
  )
}

/**
 * Suspense fallback while stay hints hydrate: skeleton shape mirrors the
 * rooms section plus the stay panel so the detail page never flashes blank.
 */
export function HotelBookingFlowFallback() {
  return (
    <div
      className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px] lg:gap-14"
      role="status"
      aria-live="polite"
      aria-label="Loading Room Types and stay options"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="h-8 w-40 animate-pulse rounded-xl bg-muted/80 motion-reduce:animate-none" />
        <div className="h-4 w-3/4 animate-pulse rounded-xl bg-muted/80 motion-reduce:animate-none" />
        {[0, 1].map((card) => (
          <div
            key={card}
            aria-hidden="true"
            className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-5"
          >
            <div className="h-5 w-1/2 animate-pulse rounded-lg bg-muted/80 motion-reduce:animate-none" />
            <div className="h-4 w-full animate-pulse rounded-lg bg-muted/80 motion-reduce:animate-none" />
            <div className="h-4 w-2/3 animate-pulse rounded-lg bg-muted/80 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
      <div className="min-w-0">
        <div
          aria-hidden="true"
          className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5"
        >
          <div className="h-5 w-24 animate-pulse rounded-lg bg-muted/80 motion-reduce:animate-none" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-muted/80 motion-reduce:animate-none" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-muted/80 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  )
}
