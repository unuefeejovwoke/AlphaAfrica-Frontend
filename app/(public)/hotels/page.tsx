import * as React from "react"
import Link from "next/link"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { Message01Icon } from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { HotelSearchPageClient } from "@/components/hotels/hotel-search-page-client"
import { HotelResultsSkeleton } from "@/components/hotels/hotel-results-skeleton"
import {
  getHotelSupportWhatsAppUrl,
  hasHotelSearchParams,
} from "@/lib/api/hotels"
import {
  HOTELS_LANDING_DESCRIPTION,
  HOTELS_LANDING_TITLE,
  canonicalUrl,
  getSiteUrl,
  hotelTravelActionJsonLd,
  robotsForSearchParams,
} from "@/lib/seo"

/**
 * Hotels discoverability (Phase 4, ticket 01; PRD §18 + ADR-0005).
 * - `/hotels` is the only indexable hotel search surface: unique title, meta
 *   description, canonical URL, Open Graph data, and TravelAction JSON-LD.
 * - Any URL carrying listing state (`?destination=…`, server filters, page)
 *   is a dynamic result view: noindex/nofollow with a canonical back to
 *   `/hotels`, and structured data is withheld so result URLs are never
 *   indexed as thin landing variants.
 * - The listing is fully dynamic with no static pre-rendering and opt-out
 *   caching, since every query combination is request-time state (ADR-0005).
 * - Crawlable internal links render server-side so bots see them without JS.
 */
export const dynamic = "force-dynamic"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  const params = await searchParams
  const hasSearch = hasHotelSearchParams(params)
  return {
    metadataBase: new URL(getSiteUrl()),
    title: HOTELS_LANDING_TITLE,
    description: HOTELS_LANDING_DESCRIPTION,
    alternates: { canonical: canonicalUrl("/hotels") },
    openGraph: {
      title: HOTELS_LANDING_TITLE,
      description:
        "Search Hotels by city or Hotel name and compare from-prices per night in Naira. No account required.",
      url: canonicalUrl("/hotels"),
      siteName: "Alphaa Africa",
      locale: "en_NG",
      type: "website",
      images: [
        {
          url: `${getSiteUrl()}/android-chrome-512x512.png`,
          alt: "Alphaa Africa — search Hotels",
        },
      ],
    },
    robots: robotsForSearchParams(hasSearch),
  }
}

export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const hasSearch = hasHotelSearchParams(await searchParams)

  return (
    <>
      {/* Landing structured data only on the indexable clean entry. */}
      {!hasSearch ? (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(hotelTravelActionJsonLd()),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebPage",
                name: HOTELS_LANDING_TITLE,
                description: HOTELS_LANDING_DESCRIPTION,
                url: canonicalUrl("/hotels"),
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

      <React.Suspense fallback={<HotelsPageFallback />}>
        <HotelSearchPageClient />
      </React.Suspense>

      {/* Server-rendered crawlable links for the stable entry (SEO §18). */}
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
            <Link
              href="/destinations"
              className="hover:text-primary hover:underline"
            >
              Explore destinations
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

/**
 * Suspense fallback while the search client hydrates. Mirrors the results
 * section, keeps the support hatch available, and never renders a blank
 * container.
 */
function HotelsPageFallback() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      <div className="h-12 w-full animate-pulse rounded-2xl border border-border/60 bg-muted/30" />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          All Hotels
        </h1>
        <ButtonLink
          href={getHotelSupportWhatsAppUrl("finding a Hotel for my stay")}
          target="_blank"
          rel="noopener noreferrer"
          variant="ghost"
          size="sm"
        >
          <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
          <span>Talk to Alphaa</span>
        </ButtonLink>
      </div>
      <HotelResultsSkeleton />
    </div>
  )
}
