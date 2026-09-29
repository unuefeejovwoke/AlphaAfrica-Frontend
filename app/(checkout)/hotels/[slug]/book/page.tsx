import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  Message01Icon,
} from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import {
  HotelGuestForm,
  buildHotelBackHref,
} from "@/components/hotels/hotel-guest-form"
import { ApiError } from "@/lib/api/client"
import {
  calculateNights,
  checkRoomCapacity,
  formatRoomTypePrice,
  getHotelDetail,
  getHotelSupportWhatsAppUrl,
  hotelSearchQuerySchema,
  parseHotelBookingParams,
  previewStayTotal,
  type ParsedHotelBookingStay,
} from "@/lib/api/hotels"
import { formatNaira } from "@/lib/format"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"
import { humanizeSlug } from "@/lib/listings"

/**
 * `/hotels/[slug]/book` (checkout shell, always dynamic, never indexed).
 *
 * Guest Booking with no account gate: the stay handoff
 * (`?room_type=&check_in=&check_out=&guests=&rooms=`) is validated strictly
 * server-side — Room Type exists, dates form a real forward stay, capacity
 * holds — before the Hotel Guest form ever renders. Creation itself is the
 * quote (ADR-0005): the form creates the Hotel Booking exactly once, then
 * hands off to Paystack. Only the stay travels in the URL — never names,
 * emails, phones, tokens, or payment data.
 */
export const dynamic = "force-dynamic"

type BookParams = { slug: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<BookParams>
}): Promise<Metadata> {
  const { slug } = await params
  return {
    metadataBase: new URL(getSiteUrl()),
    title: "Complete your Hotel Booking | Alphaa Africa",
    description:
      "Enter your Hotel Guest details once and continue to secure Paystack payment. No account needed — the exact total is confirmed before you pay.",
    alternates: { canonical: canonicalUrl(`/hotels/${slug}`) },
    robots: { index: false, follow: false },
  }
}

/** Back link preserving whatever stay fragments survived validation. */
function backHref(slug: string, stay: ParsedHotelBookingStay): string {
  const params = new URLSearchParams()
  if (stay.room_type_id !== undefined)
    params.set("room_type", String(stay.room_type_id))
  if (stay.check_in) params.set("check_in", stay.check_in)
  if (stay.check_out) params.set("check_out", stay.check_out)
  if (stay.guests !== undefined) params.set("guests", String(stay.guests))
  if (stay.rooms !== undefined) params.set("rooms", String(stay.rooms))
  const query = params.toString()
  return query ? `/hotels/${slug}?${query}` : `/hotels/${slug}`
}

function InvalidStay({
  slug,
  stay,
  title,
  message,
}: {
  slug: string
  stay: ParsedHotelBookingStay
  title: string
  message: string
}) {
  // Stay fragments that survived parsing travel into WhatsApp context (no
  // PII — dates and party only, exactly like the detail-panel hatch).
  const stayContext =
    stay.check_in || stay.check_out || stay.guests || stay.rooms
      ? {
          destination: `a Hotel stay`,
          check_in: stay.check_in || null,
          check_out: stay.check_out || null,
          guests: stay.guests ?? null,
          rooms: stay.rooms ?? null,
        }
      : undefined
  const supportHref = getHotelSupportWhatsAppUrl(
    "completing a Hotel stay booking",
    stayContext
  )
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        {message} No booking was made and no payment was taken.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href={backHref(slug, stay)}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} aria-hidden="true" />
          <span>Back to Hotel</span>
        </ButtonLink>
        <ButtonLink
          href={supportHref}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          size="sm"
        >
          <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
          <span>Talk to Alphaa</span>
        </ButtonLink>
      </div>
    </div>
  )
}

export default async function HotelBookPage({
  params,
  searchParams,
}: {
  params: Promise<BookParams>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const stay = parseHotelBookingParams(await searchParams)

  let hotel
  try {
    hotel = await getHotelDetail(slug)
  } catch (error) {
    if (error instanceof ApiError && error.code === "not-found") notFound()
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load this Hotel right now."
          supportContext={`the ${humanizeSlug(slug)} Hotel stay`}
        />
        <ButtonLink href="/hotels" variant="ghost" size="sm">
          <span>Back to Hotel search</span>
        </ButtonLink>
      </div>
    )
  }

  const room =
    stay.room_type_id !== undefined
      ? (hotel.room_types.find(
          (candidate) => candidate.id === stay.room_type_id
        ) ?? null)
      : null
  if (!room) {
    return (
      <InvalidStay
        slug={slug}
        stay={stay}
        title="Choose a Room Type first."
        message="This booking step needs one Room Type for the Hotel Booking. Pick one on the Hotel page and continue."
      />
    )
  }

  const guests = stay.guests ?? 0
  const roomsCount = stay.rooms ?? 0
  const dateValidation = hotelSearchQuerySchema.safeParse({
    destination: "",
    check_in: stay.check_in,
    check_out: stay.check_out,
    guests: guests >= 1 ? guests : 2,
    rooms: roomsCount >= 1 ? roomsCount : 1,
    page: 1,
  })
  if (!dateValidation.success || guests < 1 || roomsCount < 1) {
    return (
      <InvalidStay
        slug={slug}
        stay={stay}
        title="That stay needs a quick review."
        message={
          !dateValidation.success
            ? (dateValidation.error.issues[0]?.message ??
              "Some stay details need attention.")
            : "Add how many guests and rooms this stay covers."
        }
      />
    )
  }

  const verdict = checkRoomCapacity({
    maxGuests: room.max_guests,
    numGuests: guests,
    numRooms: roomsCount,
  })
  if (!verdict.ok) {
    return (
      <InvalidStay
        slug={slug}
        stay={stay}
        title="That party doesn't fit this Room Type."
        message={verdict.guidance}
      />
    )
  }

  const nights = calculateNights(stay.check_in, stay.check_out)
  const preview = previewStayTotal({
    pricePerNight: room.price_per_night,
    nights,
    numRooms: roomsCount,
  })
  const roomPriceLabel = formatRoomTypePrice(room.price_per_night)
  const nightWord = nights === 1 ? "night" : "nights"

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Complete your Hotel Booking
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {hotel.name} · {room.name} · Guest Booking, no account needed.
          </p>
        </header>

        <HotelGuestForm
          hotel={{
            id: hotel.id,
            slug: hotel.slug,
            name: hotel.name,
            city: hotel.city,
          }}
          room={room}
          stay={{
            check_in: stay.check_in,
            check_out: stay.check_out,
            guests,
            rooms: roomsCount,
          }}
          backHref={buildHotelBackHref(
            slug,
            {
              check_in: stay.check_in,
              check_out: stay.check_out,
              guests,
              rooms: roomsCount,
            },
            room.id
          )}
        />
      </div>

      {/* Stay summary stays visible while creation runs and after failure. */}
      <aside aria-label="Your stay summary" className="min-w-0">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6 lg:sticky lg:top-24">
          <h2 className="text-base font-bold text-foreground">Your stay</h2>
          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Hotel
              </dt>
              <dd className="font-semibold text-foreground">{hotel.name}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Room Type
              </dt>
              <dd className="font-semibold text-foreground">{room.name}</dd>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Check-in
                </dt>
                <dd className="font-semibold text-foreground tabular-nums">
                  <time dateTime={stay.check_in}>{stay.check_in}</time>
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Check-out
                </dt>
                <dd className="font-semibold text-foreground tabular-nums">
                  <time dateTime={stay.check_out}>{stay.check_out}</time>
                </dd>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Nights
                </dt>
                <dd className="font-semibold text-foreground tabular-nums">
                  {nights ?? "—"}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Rooms
                </dt>
                <dd className="font-semibold text-foreground tabular-nums">
                  {roomsCount}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Guests
                </dt>
                <dd className="font-semibold text-foreground tabular-nums">
                  {guests}
                </dd>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
              <dt className="text-xs text-muted-foreground">
                {roomPriceLabel ?? "Per night"} × {nights ?? "—"} {nightWord} ×{" "}
                {roomsCount} {roomsCount === 1 ? "room" : "rooms"}
              </dt>
              <dd className="text-base font-extrabold tracking-tight text-foreground tabular-nums">
                {preview !== null ? formatNaira(String(preview)) : "Confirmed"}
              </dd>
            </div>
          </dl>
          <p className="border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
            Preview only — the exact backend total is confirmed before you pay.
          </p>
        </div>
      </aside>
    </div>
  )
}
