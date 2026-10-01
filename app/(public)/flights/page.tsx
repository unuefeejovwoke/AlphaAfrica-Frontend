import * as React from "react"
import Link from "next/link"
import type { Metadata } from "next"
import { FlightSearchPageClient } from "@/components/flights/flight-search-page-client"
import {
  FLIGHTS_LANDING_DESCRIPTION,
  FLIGHTS_LANDING_TITLE,
  canonicalUrl,
  flightTravelActionJsonLd,
  getSiteUrl,
  hasFlightSearchParams,
  robotsForSearchParams,
} from "@/lib/seo"
import { serializeJsonLd } from "@/lib/structured-data"

/**
 * Flights discoverability (Phase 3, ticket 10; PRD §18 + spec §61).
 * - The clean `/flights` entry is the only indexable flights surface with a
 *   unique title, meta description, canonical URL, OpenGraph data, and
 *   TravelAction JSON-LD.
 * - Any URL carrying search state (`?origin=…`, `?legs=…`, …) is a dynamic
 *   result view: noindex/nofollow with a canonical back to `/flights`, so no
 *   thin indexable page exists per route/date combination.
 * - Heading hierarchy (h1/h2/h3) and image alt text live in the client search
 *   shell; crawlable internal links are rendered here on the server so bots
 *   see them without JavaScript.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  const params = await searchParams
  const hasSearch = hasFlightSearchParams(params)
  return {
    metadataBase: new URL(getSiteUrl()),
    title: FLIGHTS_LANDING_TITLE,
    description: FLIGHTS_LANDING_DESCRIPTION,
    // Dynamic result URLs canonicalize to the stable entry — never indexed
    // as separate pages.
    alternates: { canonical: canonicalUrl("/flights") },
    openGraph: {
      title: FLIGHTS_LANDING_TITLE,
      description:
        "Find flights with autocomplete search, live airline offers, and prices in Naira. No account required.",
      url: canonicalUrl("/flights"),
      siteName: "Alphaa Africa",
      locale: "en_NG",
      type: "website",
      images: [
        {
          url: `${getSiteUrl()}/android-chrome-512x512.png`,
          alt: "Alphaa Africa — search flights",
        },
      ],
    },
    robots: robotsForSearchParams(hasSearch),
  }
}

// The page itself is a static shell; search state lives in URL searchParams
// and the heavy search is client-side behind dynamic import.
export default function FlightsPage() {
  const travelAction = flightTravelActionJsonLd()
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: FLIGHTS_LANDING_TITLE,
    description: FLIGHTS_LANDING_DESCRIPTION,
    url: canonicalUrl("/flights"),
    isPartOf: {
      "@type": "WebSite",
      name: "Alphaa Africa",
      url: getSiteUrl(),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(travelAction) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(webPage) }}
      />
      <React.Suspense
        fallback={
          <div
            className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8"
            role="status"
            aria-live="polite"
          >
            Loading flight search…
          </div>
        }
      >
        <FlightSearchPageClient />
      </React.Suspense>
      {/* Server-rendered crawlable links for the stable entry (SEO §18). */}
      <nav
        aria-label="Explore more travel services"
        className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8"
      >
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
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
            <Link href="/visa" className="hover:text-primary hover:underline">
              Visa assistance
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
