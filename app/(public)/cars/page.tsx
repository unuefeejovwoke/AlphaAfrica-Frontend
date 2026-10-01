import * as React from "react"
import Link from "next/link"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { Message01Icon } from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { CarSearchPageClient } from "@/components/cars/car-search-page-client"
import { CarResultsSkeleton } from "@/components/cars/car-results-skeleton"
import { getCarSupportWhatsAppUrl, hasCarSearchParams } from "@/lib/api/cars"
import {
  CARS_LANDING_DESCRIPTION,
  CARS_LANDING_TITLE,
  canonicalUrl,
  carTravelActionJsonLd,
  getSiteUrl,
  robotsForSearchParams,
} from "@/lib/seo"
import { serializeJsonLd } from "@/lib/structured-data"

/**
 * `/cars` — indexable landing + dynamic result view.
 * Clean entry carries title/meta/canonical/OG + TravelAction JSON-LD.
 * Any search-state URL is noindex with canonical back to `/cars`.
 */
export const dynamic = "force-dynamic"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  const params = await searchParams
  const hasSearch = hasCarSearchParams(params)
  return {
    metadataBase: new URL(getSiteUrl()),
    title: CARS_LANDING_TITLE,
    description: CARS_LANDING_DESCRIPTION,
    alternates: { canonical: canonicalUrl("/cars") },
    openGraph: {
      title: CARS_LANDING_TITLE,
      description:
        "Browse vehicles with driver by hourly rate in Naira. No account required.",
      url: canonicalUrl("/cars"),
      siteName: "Alphaa Africa",
      locale: "en_NG",
      type: "website",
      images: [
        {
          url: `${getSiteUrl()}/android-chrome-512x512.png`,
          alt: "Alphaa Africa — rent cars by the hour",
        },
      ],
    },
    robots: robotsForSearchParams(hasSearch),
  }
}

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const hasSearch = hasCarSearchParams(await searchParams)

  return (
    <>
      {!hasSearch ? (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd(carTravelActionJsonLd()),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd({
                "@context": "https://schema.org",
                "@type": "WebPage",
                name: CARS_LANDING_TITLE,
                description: CARS_LANDING_DESCRIPTION,
                url: canonicalUrl("/cars"),
                isPartOf: {
                  "@type": "WebSite",
                  name: "Alphaa Africa",
                  url: getSiteUrl(),
                },
              }),
            }}
          />
        </>
      ) : null}

      <React.Suspense fallback={<CarsPageFallback />}>
        <CarSearchPageClient />
      </React.Suspense>

      <nav
        aria-label="Explore more travel services"
        className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8"
      >
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
          <li>
            <Link
              href="/flights"
              className="hover:text-primary hover:underline"
            >
              Search flights
            </Link>
          </li>
          <li>
            <Link href="/hotels" className="hover:text-primary hover:underline">
              Find a hotel
            </Link>
          </li>
          <li>
            <Link
              href="/packages"
              className="hover:text-primary hover:underline"
            >
              Browse holiday packages
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
    </>
  )
}

function CarsPageFallback() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          All vehicles
        </h1>
        <ButtonLink
          href={getCarSupportWhatsAppUrl("finding a car for my trip")}
          target="_blank"
          rel="noopener noreferrer"
          variant="ghost"
          size="sm"
        >
          <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
          <span>Talk to Alphaa</span>
        </ButtonLink>
      </div>
      <CarResultsSkeleton />
    </div>
  )
}
