import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Location01Icon,
  StarIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import { RetryButton } from "@/components/home/retry-button"
import { TerminalCta } from "@/components/shared/terminal-cta"
import { ViewTracker } from "@/components/analytics/view-tracker"
import { HotelGallery } from "@/components/hotels/hotel-gallery"
import { HotelMobileBar } from "@/components/hotels/hotel-mobile-bar"
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
 * One Hotel page answering "can Alphaa help with this stay?": gallery with
 * descriptive alt text, overview, display-only location with a map link only
 * when coordinates exist, full amenities, Room Type list with per-night
 * pricing, and a sticky booking panel. Stable Hotel content revalidates
 * hourly; new slugs render on demand with a prices-confirmed-at-booking
 * caveat against stale from-prices (ADR-0005, ADR-0003).
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
        : `${hotel.name} in ${display.placeLabel} — compare Room Type per-night prices in Naira and book with no account. Prices confirmed at booking.`
    const title = `${hotel.name} — ${display.placeLabel} | Alphaa Africa`
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
            url: display.gallery[0]?.src ?? `${getSiteUrl()}/android-chrome-512x512.png`,
            alt: display.gallery[0]?.alt ?? `${hotel.name} — ${display.placeLabel}`,
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
          <Button
            render={<Link href="/hotels" />}
            variant="ghost"
            size="sm"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} aria-hidden="true" />
            <span>Back to Hotel search</span>
          </Button>
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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 pb-24 sm:gap-14 sm:px-6 sm:pb-32 md:py-12 lg:px-8">
      {/* Funnel: backend place facts only — never guest data (ticket 07). */}
      <ViewTracker
        event="hotel_viewed"
        props={{ city: hotel.city, stars: hotel.star_rating }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb + support hatch (crawlable internal links). */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
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

        <Button render={<Link href="/hotels" />} variant="ghost" size="sm">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} aria-hidden="true" />
          <span>Back to Hotel search</span>
        </Button>
      </div>

      {/* Title block: one h1, place context, star rating. */}
      <section aria-labelledby="hotel-title" className="flex flex-col gap-6">
        <div className="flex max-w-4xl flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <HugeiconsIcon icon={Location01Icon} size={14} aria-hidden="true" />
              <span>{display.placeLabel}</span>
            </span>
            {display.starLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <HugeiconsIcon
                  icon={StarIcon}
                  size={13}
                  className="text-amber-500"
                  aria-hidden="true"
                />
                <span
                  role="img"
                  aria-label={`Rated ${hotel.star_rating} out of 5 stars`}
                >
                  {display.starLabel}
                </span>
              </span>
            ) : null}
          </div>

          <h1
            id="hotel-title"
            className="text-3xl leading-[1.15] font-extrabold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl"
          >
            {hotel.name}
          </h1>
        </div>

        <HotelGallery hotelName={hotel.name} images={display.gallery} />
      </section>

      {/* Room choice + stay panel: interactive leaf around RSC content. */}
      <React.Suspense fallback={<HotelBookingFlowFallback />}>
        <HotelBookingFlow
          hotel={{
            id: hotel.id,
            slug: hotel.slug,
            name: hotel.name,
            city: hotel.city,
          }}
          rooms={hotel.room_types}
        >
          {/* Overview */}
          <section
            aria-labelledby="hotel-overview-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="hotel-overview-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              About this Hotel
            </h2>
            {overviewParagraphs.length > 0 ? (
              <div className="max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                {overviewParagraphs.map((paragraph, index) => (
                  <p key={index} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Details for this Hotel are being updated. Talk to Alphaa and a
                specialist will describe the Hotel, its Room Types, and
                current per-night prices before you pay anything.
              </p>
            )}
          </section>

          {/* Location: display-only place context, map link when pinned. */}
          <section
            aria-labelledby="hotel-location-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="hotel-location-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Location
            </h2>
            <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
              <p className="flex items-start gap-2.5 text-sm font-semibold text-foreground">
                <HugeiconsIcon
                  icon={Location01Icon}
                  size={18}
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>
                  {display.placeLabel}
                  {display.addressText ? (
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {display.addressText}
                    </span>
                  ) : null}
                </span>
              </p>
              {display.mapUrl ? (
                <div>
                  <Button
                    render={
                      <a
                        href={display.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                    variant="outline"
                    size="sm"
                  >
                    <span>View on map</span>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={14}
                      aria-hidden="true"
                    />
                  </Button>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Ask Alphaa for directions to this Hotel on WhatsApp and a
                  specialist will guide you.
                </p>
              )}
            </div>
          </section>

          {/* Amenities */}
          <section
            aria-labelledby="hotel-amenities-heading"
            className="flex flex-col gap-5"
          >
            <h2
              id="hotel-amenities-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Amenities
            </h2>
            {display.amenities.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {display.amenities.map((amenity) => (
                  <li
                    key={amenity}
                    className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm font-medium text-foreground"
                  >
                    <HugeiconsIcon
                      icon={Tick01Icon}
                      size={16}
                      className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-500"
                      aria-hidden="true"
                    />
                    <span>{amenity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                The full amenity list for this Hotel is being updated. Talk to
                Alphaa to confirm what matters for your stay before you book.
              </p>
            )}
          </section>

        </HotelBookingFlow>
      </React.Suspense>

      {/* Crawlable onward links. */}
      <nav
        aria-label="Explore more Hotels"
        className="flex flex-col gap-3 border-t border-border/60 pt-6"
      >
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
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
              className="hover:text-primary hover:underline"
            >
              More Hotels in {hotel.city}
            </Link>
          </li>
          <li>
            <Link href="/hotels" className="hover:text-primary hover:underline">
              Search all Hotels
            </Link>
          </li>
          <li>
            <Link
              href="/flights"
              className="hover:text-primary hover:underline"
            >
              Search flights
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              className="hover:text-primary hover:underline"
            >
              Contact Alphaa
            </Link>
          </li>
        </ul>
      </nav>

      <TerminalCta
        title="Unsure this Hotel fits your trip?"
        description="Different dates, more guests, or another city entirely? A specialist will compare options with you and confirm per-night prices before anything is booked."
        eyebrow="Human Help, One Tap Away"
        primaryHref="/hotels"
        primaryLabel="Search more Hotels"
        context={`the ${hotel.name} Hotel stay in ${hotel.city}`}
      />

      {/* Thumb-first booking bar (mobile only, appears after scrolling). */}
      <HotelMobileBar
        fromPriceLabel={display.fromPriceLabel}
        hotelName={hotel.name}
      />
    </div>
  )
}
