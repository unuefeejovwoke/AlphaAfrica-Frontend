import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, StarIcon } from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import { RetryButton } from "@/components/home/retry-button"
import { TerminalCta } from "@/components/shared/terminal-cta"
import { ViewTracker } from "@/components/analytics/view-tracker"
import { HotelGallery } from "@/components/hotels/hotel-gallery"
import {
  HERO_AMENITY_LIMIT,
  HotelAmenityGrid,
  HotelAmenityStrip,
} from "@/components/hotels/hotel-amenities"
import {
  HotelBookingFlow,
  HotelBookingFlowFallback,
} from "@/components/hotels/hotel-booking-flow"
import { ApiError } from "@/lib/api/client"
import {
  getHotelDetail,
  buildHotelSearchParams,
  listHotelSlugs,
  toHotelDetailDisplay,
} from "@/lib/api/hotels"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"
import { hotelDetailJsonLd, humanizeSlug } from "@/lib/listings"

/**
 * `/hotels/[slug]` (RSC, ISR 3600, open-ended fallback).
 *
 * One Hotel page answering "can Alphaa help with this stay?". The layout is
 * conversion-first and reads in two moves: photo beside name, rating, address
 * and top amenities, then the Room Type choice with the stay panel aligned
 * beside it, then About, Location and the full amenity list as supporting
 * evidence. Keeping the panel level with the choice is deliberate — a booking
 * form that precedes the options it configures asks for input before the guest
 * knows what they are choosing between. Stable Hotel content revalidates
 * hourly; new slugs render on demand with a prices-confirmed-at-booking caveat
 * against stale from-prices (ADR-0005, ADR-0003).
 *
 * CONTEXT.md vocabulary throughout: Hotel, Room Type, Hotel Guest,
 * Hotel Booking, Customer, Payment Reference.
 */
export const revalidate = 3600
export const dynamicParams = true

type DetailParams = { slug: string }

export async function generateStaticParams(): Promise<DetailParams[]> {
  try {
    return (await listHotelSlugs()).map((slug) => ({ slug }))
  } catch {
    // Backend may be unreachable at build time; ISR + dynamicParams still
    // renders new slugs on demand at runtime.
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<DetailParams>
}): Promise<Metadata> {
  const { slug } = await params
  const url = canonicalUrl(`/hotels/${slug}`)
  try {
    const hotel = await getHotelDetail(slug)
    const display = toHotelDetailDisplay(hotel)
    const description =
      hotel.description.trim().length > 0
        ? hotel.description.trim().slice(0, 155)
        : `${hotel.name} in ${display.placeLabel}: compare Room Type per-night prices in Naira and book with no account. Prices confirmed at booking.`
    const title = `${hotel.name} | Alphaa Africa`
    return {
      metadataBase: new URL(getSiteUrl()),
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        siteName: "Alphaa Africa",
        locale: "en_NG",
        type: "website",
        images: [
          {
            url:
              display.gallery[0]?.src ??
              `${getSiteUrl()}/android-chrome-512x512.png`,
            alt:
              display.gallery[0]?.alt ??
              `${hotel.name} in ${display.placeLabel}`,
          },
        ],
      },
    }
  } catch {
    const name = humanizeSlug(slug)
    return {
      metadataBase: new URL(getSiteUrl()),
      title: `${name} | Alphaa Africa`,
      description: `Hotel stay with clear per-night pricing in Naira and booking with no account from Alphaa Africa. Prices confirmed at booking.`,
      alternates: { canonical: url },
    }
  }
}

export default async function HotelDetailPage({
  params,
}: {
  params: Promise<DetailParams>
}) {
  const { slug } = await params

  let hotel
  try {
    hotel = await getHotelDetail(slug)
  } catch (error) {
    if (error instanceof ApiError && error.code === "not-found") notFound()
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load this Hotel right now."
          supportContext={`the ${humanizeSlug(slug)} Hotel stay`}
        />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <RetryButton label="Retry loading Hotel" />
          <ButtonLink href="/hotels" variant="ghost" size="sm">
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              size={14}
              aria-hidden="true"
            />
            <span>Back to Hotel search</span>
          </ButtonLink>
        </div>
      </div>
    )
  }

  const display = toHotelDetailDisplay(hotel)
  const jsonLd = hotelDetailJsonLd({
    name: hotel.name,
    slug: hotel.slug,
    description: hotel.description,
    city: hotel.city,
    address: hotel.address,
    country: hotel.country,
    star_rating: hotel.star_rating,
    main_image: hotel.main_image,
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    starting_price: hotel.starting_price,
    room_types: hotel.room_types.map((room) => ({
      name: room.name,
      price_per_night: room.price_per_night,
    })),
  })
  const overviewParagraphs = hotel.description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  // The hero strip shows the first amenities; the full grid below carries the
  // rest, so each amenity appears exactly once on the page.
  const hasDeferredAmenities = display.amenities.length > HERO_AMENITY_LIMIT

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pt-4 pb-28 sm:px-6 sm:pt-6 lg:px-8 lg:pb-32">
      {/* Funnel: backend place facts only — never guest data (ticket 07). */}
      <ViewTracker
        event="hotel_viewed"
        props={{ city: hotel.city, stars: hotel.star_rating }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb (crawlable internal links) plus a way back to search. */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Link href="/" className="transition-colors hover:text-primary">
            Home
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">
            /
          </span>
          <Link href="/hotels" className="transition-colors hover:text-primary">
            Hotels
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">
            /
          </span>
          <span
            aria-current="page"
            className="max-w-[200px] truncate font-semibold text-foreground sm:max-w-xs"
          >
            {hotel.name}
          </span>
        </nav>

        <ButtonLink href="/hotels" variant="ghost" size="sm">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} aria-hidden="true" />
          <span>Back to Hotel search</span>
        </ButtonLink>
      </div>

      {/*
        The page owns this grid. The hero is deliberately rendered outside the
        Suspense boundary: it holds the LCP photo, and keeping it in the
        server payload is what makes the preload Next emits for it actually
        match the first paint. `HotelBookingFlow` returns a fragment, so the
        three interactive regions land in these same grid cells once it mounts.

        Row 1 is the photograph beside the identity it belongs to. Row 2 is the
        entire decision: Room Types on the left, stay panel top-aligned with
        them on the right. That alignment is the redesign. The panel used to
        start at row 1, level with the gallery, so it asked for dates and party
        before the guest had seen a single Room Type and left its Continue
        button disabled above the very list that would enable it. Pairing the
        photo with the name instead of the form buys back ~265px of height, so
        the Room Type choice now reaches the first viewport.
      */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-12 lg:gap-y-8">
        <div className="lg:col-start-1 lg:row-start-1">
          <HotelGallery hotelName={hotel.name} images={display.gallery} />
        </div>

        {/* Title block: one h1, rating, place, address, pitch, top amenities. */}
        <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-start-1 lg:pt-2">
          <h1
            id="hotel-title"
            className="text-3xl leading-[1.1] font-extrabold tracking-tight text-balance text-foreground sm:text-4xl lg:text-[2rem]"
          >
            {hotel.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {display.starLabel ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <span aria-hidden="true" className="flex gap-0.5">
                  {Array.from({ length: hotel.star_rating })
                    .slice(0, 5)
                    .map((_, index) => (
                      <HugeiconsIcon
                        key={index}
                        icon={StarIcon}
                        size={14}
                        className="fill-primary text-primary"
                      />
                    ))}
                </span>
                <span
                  role="img"
                  aria-label={`Rated ${hotel.star_rating} out of 5 stars`}
                >
                  {display.starLabel}
                </span>
              </span>
            ) : null}
            <span aria-hidden="true" className="h-3.5 w-px bg-border" />
            <span className="text-sm font-medium text-muted-foreground">
              {display.placeLabel}
            </span>
          </div>

          {display.addressText ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {display.addressText}
            </p>
          ) : null}

          {/* Short description sits with the identity block so the guest
              gets the pitch before the choice, not after it. */}
          {overviewParagraphs.length > 0 ? (
            <p className="text-[15px] leading-relaxed text-foreground/80">
              {overviewParagraphs[0]}
            </p>
          ) : null}

          <HotelAmenityStrip
            amenities={display.amenities}
            deferToFullGrid={hasDeferredAmenities}
          />
        </div>

        <React.Suspense fallback={<HotelBookingFlowFallback />}>
          <HotelBookingFlow
            hotel={{
              id: hotel.id,
              slug: hotel.slug,
              name: hotel.name,
              city: hotel.city,
            }}
            rooms={hotel.room_types}
            startingPrice={hotel.starting_price}
            details={
              <>
                {/* About: remaining paragraphs beyond the hero lede. */}
                {overviewParagraphs.length > 1 ? (
                  <section
                    aria-labelledby="hotel-overview-heading"
                    className="flex flex-col gap-3"
                  >
                    <h2
                      id="hotel-overview-heading"
                      className="text-2xl font-bold tracking-tight text-foreground"
                    >
                      About this Hotel
                    </h2>
                    <div className="flex max-w-[68ch] flex-col gap-3 text-[15px] leading-relaxed text-muted-foreground">
                      {overviewParagraphs.slice(1).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ) : overviewParagraphs.length === 0 ? (
                  <section
                    aria-labelledby="hotel-overview-heading"
                    className="flex flex-col gap-3"
                  >
                    <h2
                      id="hotel-overview-heading"
                      className="text-2xl font-bold tracking-tight text-foreground"
                    >
                      About this Hotel
                    </h2>
                    <p className="max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground">
                      Details for this Hotel are being updated. Talk to Alphaa
                      and a specialist will describe the Hotel, its Room Types,
                      and current per-night prices before you pay anything.
                    </p>
                  </section>
                ) : null}

                {/* Location: only rendered when it adds something the hero
                  does not already carry. The address sits in the hero, so a
                  Location section without a map would just repeat it. The map
                  link is an exact point and exists only when the backend
                  carries coordinates, never a guessed one. */}
                {display.mapUrl ? (
                  <section
                    aria-labelledby="hotel-location-heading"
                    className="flex flex-col gap-3"
                  >
                    <h2
                      id="hotel-location-heading"
                      className="text-2xl font-bold tracking-tight text-foreground"
                    >
                      Location
                    </h2>
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 ring-1 ring-border/70">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {display.placeLabel}
                        </p>
                        {display.addressText ? (
                          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                            {display.addressText}
                          </p>
                        ) : null}
                      </div>
                      <ButtonLink
                        href={display.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                      >
                        <span>View on map</span>
                      </ButtonLink>
                    </div>
                  </section>
                ) : null}

                {/* Amenities the hero strip deferred, so no amenity repeats. */}
                {hasDeferredAmenities ? (
                  <section
                    id="hotel-amenities"
                    aria-labelledby="hotel-amenities-heading"
                    className="flex scroll-mt-24 flex-col gap-4"
                  >
                    <h2
                      id="hotel-amenities-heading"
                      className="text-2xl font-bold tracking-tight text-foreground"
                    >
                      Amenities
                    </h2>
                    <HotelAmenityGrid amenities={display.amenities} />
                  </section>
                ) : null}
              </>
            }
          />
        </React.Suspense>
      </div>

      {/* Crawlable onward links. Contact lives in the site nav, so it is not
          repeated here. */}
      <nav
        aria-label="Explore more Hotels"
        className="border-t border-border/60 pt-6"
      >
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <li>
            <Link
              href={`/hotels?${buildHotelSearchParams({
                destination: hotel.city,
                check_in: "",
                check_out: "",
                guests: 2,
                rooms: 1,
                page: 1,
              })}`}
              className="text-muted-foreground transition-colors hover:text-primary hover:underline"
            >
              More Hotels in {hotel.city}
            </Link>
          </li>
          <li>
            <Link
              href="/hotels"
              className="text-muted-foreground transition-colors hover:text-primary hover:underline"
            >
              Search all Hotels
            </Link>
          </li>
          <li>
            <Link
              href="/flights"
              className="text-muted-foreground transition-colors hover:text-primary hover:underline"
            >
              Search flights
            </Link>
          </li>
        </ul>
      </nav>

      <TerminalCta
        title="Unsure this Hotel fits your trip?"
        description="Different dates, more guests, or another city entirely? A specialist will compare options with you and confirm per-night prices before anything is booked."
        eyebrow="Human Help, One Tap Away"
        primaryLabel="Contact Alphaa"
        context={`the ${hotel.name} Hotel stay in ${hotel.city}`}
      />
    </div>
  )
}
