import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  Car01Icon,
  Location01Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import { RetryButton } from "@/components/home/retry-button"
import { TerminalCta } from "@/components/shared/terminal-cta"
import { ViewTracker } from "@/components/analytics/view-tracker"
import { CarHireCalculator } from "@/components/cars/car-hire-calculator"
import { ApiError } from "@/lib/api/client"
import {
  getVehicleDetail,
  listVehicleSlugs,
  toVehicleDetailDisplay,
} from "@/lib/api/cars"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"
import {
  humanizeSlug,
  resolveListingImageUrl,
  vehicleDetailJsonLd,
} from "@/lib/listings"
import { formatNaira } from "@/lib/format"

/**
 * `/cars/[slug]` (RSC, ISR 3600, open-ended fallback).
 * Gallery + overview + hire calculator. Prices confirmed at booking.
 */
export const revalidate = 3600
export const dynamicParams = true

type DetailParams = { slug: string }

export async function generateStaticParams(): Promise<DetailParams[]> {
  try {
    return (await listVehicleSlugs()).map((slug) => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<DetailParams>
}): Promise<Metadata> {
  const { slug } = await params
  const url = canonicalUrl(`/cars/${slug}`)
  try {
    const vehicle = await getVehicleDetail(slug)
    const display = toVehicleDetailDisplay(vehicle)
    const title = `${vehicle.name} — ${display.typeLabel} hire | Alphaa Africa`
    const description =
      vehicle.description.trim().length > 0
        ? vehicle.description.trim().slice(0, 155)
        : `${vehicle.name} with driver at ${formatNaira(vehicle.hourly_rate)}/hr. Pick pickup, hours, and book with no account.`
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
            url: display.imageSrc,
            alt: display.imageAlt,
          },
        ],
      },
    }
  } catch {
    const name = humanizeSlug(slug)
    return {
      metadataBase: new URL(getSiteUrl()),
      title: `${name} | Alphaa Africa`,
      description: `Hourly car hire with driver in Naira from Alphaa Africa. Rates confirmed at booking.`,
      alternates: { canonical: url },
    }
  }
}

export default async function CarDetailPage({
  params,
}: {
  params: Promise<DetailParams>
}) {
  const { slug } = await params

  let vehicle
  try {
    vehicle = await getVehicleDetail(slug)
  } catch (error) {
    if (error instanceof ApiError && error.code === "not-found") notFound()
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load this vehicle right now."
          supportContext={`the ${humanizeSlug(slug)} car hire`}
        />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <RetryButton label="Retry loading vehicle" />
          <ButtonLink href="/cars" variant="ghost" size="sm">
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              size={14}
              aria-hidden="true"
            />
            <span>Back to car search</span>
          </ButtonLink>
        </div>
      </div>
    )
  }

  const display = toVehicleDetailDisplay(vehicle)
  const jsonLd = vehicleDetailJsonLd({
    name: vehicle.name,
    slug: vehicle.slug,
    description: vehicle.description,
    vehicle_type_display: display.typeLabel,
    main_image: vehicle.main_image,
    city: vehicle.city,
    capacity: vehicle.capacity,
    hourly_rate: vehicle.hourly_rate,
  })
  const overviewParagraphs = vehicle.description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 pb-24 sm:gap-14 sm:px-6 sm:pb-32 md:py-12 lg:px-8">
      <ViewTracker
        event="car_viewed"
        props={{ vehicle_type: vehicle.vehicle_type, city: vehicle.city }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
          <Link href="/cars" className="transition-colors hover:text-primary">
            Cars
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">
            /
          </span>
          <span
            aria-current="page"
            className="max-w-[200px] truncate font-semibold text-foreground sm:max-w-xs"
          >
            {vehicle.name}
          </span>
        </nav>
        <ButtonLink href="/cars" variant="ghost" size="sm">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} aria-hidden="true" />
          <span>Back to car search</span>
        </ButtonLink>
      </div>

      <section
        aria-labelledby="car-title"
        className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]"
      >
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex max-w-4xl flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <HugeiconsIcon icon={Car01Icon} size={14} aria-hidden="true" />
                <span>{display.typeLabel}</span>
              </span>
              {display.capacityLabel ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <HugeiconsIcon
                    icon={UserMultiple02Icon}
                    size={13}
                    aria-hidden="true"
                  />
                  <span>{display.capacityLabel}</span>
                </span>
              ) : null}
              {display.placeLabel ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <HugeiconsIcon
                    icon={Location01Icon}
                    size={13}
                    aria-hidden="true"
                  />
                  <span>Based in {display.placeLabel}</span>
                </span>
              ) : null}
            </div>
            <h1
              id="car-title"
              className="text-3xl leading-[1.15] font-extrabold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl"
            >
              {vehicle.name}
            </h1>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border/70 bg-card p-1.5 shadow-xs">
            <div className="overflow-hidden rounded-[calc(1.5rem-2px)] bg-muted">
              <img
                src={resolveListingImageUrl(vehicle.main_image)}
                alt={display.imageAlt}
                loading="eager"
                decoding="async"
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          </div>

          <section
            aria-labelledby="car-overview-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="car-overview-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              About this vehicle
            </h2>
            {overviewParagraphs.length > 0 ? (
              <div className="space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                {overviewParagraphs.map((paragraph, index) => (
                  <p key={index} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Hire {vehicle.name} with driver by the hour. Talk to Alphaa and
                a specialist will confirm pickup, hours, and the exact total
                before you pay anything.
              </p>
            )}
          </section>

          <section
            aria-labelledby="car-good-to-know"
            className="flex flex-col gap-4"
          >
            <h2
              id="car-good-to-know"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Good to know
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                "Driver included in every hire",
                "Pickup and drop-off anywhere you type",
                "Priced per hour — total confirmed before payment",
                "Pay securely via Paystack, no account needed",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm font-medium text-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside aria-label="Book this vehicle" className="min-w-0">
          <CarHireCalculator vehicle={vehicle} />
        </aside>
      </section>

      <nav
        aria-label="Explore more vehicles"
        className="flex flex-col gap-3 border-t border-border/60 pt-6"
      >
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
          <li>
            <Link href="/cars" className="hover:text-primary hover:underline">
              Search all vehicles
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
        title="Need a different car or longer hire?"
        description="Tell us your route and hours and a specialist will match a vehicle and confirm the exact hourly total before anything is booked."
        eyebrow="Human Help, One Tap Away"
        primaryHref="/cars"
        primaryLabel="Search more vehicles"
        context={`the ${vehicle.name} car hire`}
      />
    </div>
  )
}
