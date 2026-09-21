import * as React from "react";
import type { Metadata } from "next";
import { FlightSearchPageClient } from "@/components/flights/flight-search-page-client";
import { canonicalUrl, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Search Flights — One-way, Round-trip & Multi-city | Alphaa Africa",
  description:
    "Search one-way, round-trip, and multi-city flights by airport, date, party and cabin. Airport autocomplete from IATA, city or name. Live fares in NGN, no account needed. Confirm the live fare before paying.",
  alternates: { canonical: canonicalUrl("/flights") },
  openGraph: {
    title: "Search Flights — One-way, Round-trip & Multi-city | Alphaa Africa",
    description:
      "Find flights with autocomplete search, live airline offers, and prices in Naira. No account required.",
    url: canonicalUrl("/flights"),
    type: "website",
    images: [
      {
        url: `${getSiteUrl()}/android-chrome-512x512.png`,
        alt: "Alphaa Africa — search flights",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

// The page itself is static shell; search state lives in URL searchParams
// and the heavy search is client-side behind dynamic import.
// Per spec: dynamic search results are not separately indexed — this stable
// entry is the crawlable flights surface.
export default function FlightsPage() {
  // JSON-LD for the marketing entry (not per-search results)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Search Flights — One-way, Round-trip & Multi-city",
    description:
      "Search one-way, round-trip, and multi-city flights by airport, date, party and cabin with airport autocomplete. Live fares in NGN.",
    url: canonicalUrl("/flights"),
    isPartOf: {
      "@type": "WebSite",
      name: "Alphaa Africa",
      url: getSiteUrl(),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <React.Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8" role="status" aria-live="polite">Loading flight search…</div>}>
        <FlightSearchPageClient />
      </React.Suspense>
    </>
  );
}
