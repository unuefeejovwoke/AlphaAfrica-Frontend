import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { RetryButton } from "@/components/home/retry-button";
import { DestinationCard } from "@/components/destinations/destination-card";
import { TerminalCta } from "@/components/shared/terminal-cta";
import { getDestinations } from "@/lib/api/destinations";
import { canonicalUrl, getSiteUrl } from "@/lib/seo";
import { destinationListJsonLd, sortFeaturedFirst } from "@/lib/listings";
import { getSupportWhatsAppUrl } from "@/lib/content/company";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Destinations | Alphaa Africa",
  description:
    "Browse Alphaa Africa destinations with curated holiday packages, package counts, and starting prices in Naira. Plan with a specialist on WhatsApp.",
  alternates: { canonical: canonicalUrl("/destinations") },
  openGraph: {
    title: "Destinations | Alphaa Africa",
    description:
      "Holiday destinations with curated packages, starting prices, and human planning help.",
    url: canonicalUrl("/destinations"),
    type: "website",
    images: [
      {
        url: `${getSiteUrl()}/android-chrome-512x512.png`,
        alt: "Alphaa Africa — holiday destinations",
      },
    ],
  },
};

/**
 * `/destinations` (RSC, ISR 3600): server grid of Destination cards —
 * image, destination, country, package count, starting price, CTA —
 * featured first. Covers loading (skeleton), empty, and error+retry (§12).
 */
export default async function DestinationsPage() {
  let destinations;
  try {
    const page = await getDestinations();
    destinations = sortFeaturedFirst(page.results);
  } catch (error) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-12 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load destinations right now."
        />
        <RetryButton label="Retry loading destinations" />
      </div>
    );
  }

  const jsonLd = destinationListJsonLd(
    destinations.map((destination) => ({
      name: destination.name,
      slug: destination.slug,
      country: destination.country,
      main_image: destination.main_image,
    })),
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-12 sm:px-6 md:gap-16 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex max-w-3xl flex-col gap-4">
        <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Destinations
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
          Where do you want to go?
        </h1>
        <p className="text-base leading-relaxed break-words text-muted-foreground">
          Every destination below has curated holiday packages with clear starting
          prices in Naira. Open one to compare itineraries, or tell us your dates
          and a specialist will plan it with you.
        </p>
        <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
          {destinations.length} {destinations.length === 1 ? "destination" : "destinations"} available
        </p>
      </div>

      {destinations.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-foreground">No destinations published yet.</p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            New destinations land regularly. Tell us where you want to go and a
            specialist will plan it with you.
          </p>
          <Button
            render={
              <a
                href={getSupportWhatsAppUrl("destination planning")}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <DestinationCard key={destination.slug} destination={destination} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold text-foreground">Prefer a packaged itinerary?</h2>
          <p className="text-xs text-muted-foreground">
            Compare durations, inclusions, and from-prices across every destination.
          </p>
        </div>
        <Button render={<Link href="/packages" />} variant="outline">
          <span>Browse all packages</span>
        </Button>
      </div>

      <TerminalCta
        title="Not sure which destination fits?"
        description="Tell us your dates, party size, and budget. A specialist will match you with the right itinerary — no payment needed to start."
        context="destination planning"
        primaryHref="/packages"
        primaryLabel="Explore packages"
      />
    </div>
  );
}
