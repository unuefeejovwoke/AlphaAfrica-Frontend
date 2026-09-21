import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { RetryButton } from "@/components/home/retry-button";
import { PackageCard } from "@/components/packages/package-card";
import { PackageFilters } from "@/components/packages/package-filters";
import { getPackages } from "@/lib/api/packages";
import { getDestinations } from "@/lib/api/destinations";
import { canonicalUrl, getSiteUrl } from "@/lib/seo";
import {
  buildPackageSearchParams,
  parsePackageSearchParams,
  sortFeaturedFirst,
} from "@/lib/listings";
import { getSupportWhatsAppUrl } from "@/lib/content/company";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Holiday Packages | Alphaa Africa",
  description:
    "Curated holiday packages with durations, inclusions, and from-prices in Naira. Filter by destination and budget, then send a no-payment enquiry.",
  alternates: { canonical: canonicalUrl("/packages") },
  openGraph: {
    title: "Holiday Packages | Alphaa Africa",
    description:
      "Curated itineraries with clear durations, inclusions, and from-prices. Enquire without paying.",
    url: canonicalUrl("/packages"),
    type: "website",
    images: [
      {
        url: `${getSiteUrl()}/android-chrome-512x512.png`,
        alt: "Alphaa Africa — curated holiday packages",
      },
    ],
  },
};

type ListingSearchParams = {
  destination?: string | string[];
  max_price?: string | string[];
  featured?: string | string[];
};

/**
 * `/packages` (RSC, ISR 3600): server-filtered grid driven by URL
 * searchParams (`destination`, `max_price`, `featured`), so every
 * filtered view is shareable and crawlable. Controls update the URL
 * via `startTransition`. Covers loading, empty, and error+retry (§12).
 */
export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const rawSearchParams = await searchParams;
  const filters = parsePackageSearchParams(rawSearchParams);

  let packages;
  let destinationOptions: { slug: string; name: string }[] = [];
  try {
    // Parallel independent fetches — no waterfalls.
    const [packagePage, destinationPage] = await Promise.all([
      getPackages(filters),
      getDestinations(),
    ]);
    packages = sortFeaturedFirst(packagePage.results);
    destinationOptions = destinationPage.results.map((destination) => ({
      slug: destination.slug,
      name: destination.name,
    }));
  } catch (error) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-12 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load packages right now."
        />
        <RetryButton label="Retry loading packages" />
      </div>
    );
  }

  const activeFilterCount =
    (filters.destination ? 1 : 0) + (filters.max_price !== undefined ? 1 : 0) + (filters.featured ? 1 : 0);
  const shareableQuery = buildPackageSearchParams(filters);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 md:gap-10 lg:px-8">
      <div className="flex max-w-3xl flex-col gap-4">
        <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Holiday Packages
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
          Trips worth taking, planned with you.
        </h1>
        <p className="text-base leading-relaxed break-words text-muted-foreground">
          Curated itineraries with clear durations, inclusions, and from-prices
          in Naira. Open a package to see the full plan, then send an enquiry —
          no payment needed to start.
        </p>
      </div>

      <PackageFilters initial={filters} destinations={destinationOptions} />

      <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
        {packages.length === 0
          ? "No packages match these filters yet."
          : `${packages.length} ${packages.length === 1 ? "package" : "packages"} found`}
        {activeFilterCount > 0 && shareableQuery ? (
          <>
            {" "}·{" "}
            <span className="font-variant-numeric tabular-nums">?{shareableQuery}</span>
          </>
        ) : null}
      </p>

      {packages.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-foreground">No packages match these filters.</p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Try widening the budget or clearing the destination. Or describe your
            ideal trip — a specialist will design it with you.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button render={<Link href="/packages" scroll={false} />} variant="outline" size="sm">
              <span>Clear filters</span>
            </Button>
            <Button
              render={
                <a
                  href={getSupportWhatsAppUrl("a custom holiday package")}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
              <span>Plan a custom trip</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard key={pkg.slug} pkg={pkg} />
          ))}
        </div>
      )}

      {/* Custom-trip CTA: the terminal conversion moment for this page. */}
      <section
        aria-labelledby="custom-trip-heading"
        className="rounded-3xl border border-border bg-card p-8 sm:p-10"
      >
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 id="custom-trip-heading" className="text-2xl font-bold tracking-tight text-foreground">
              Need something different?
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Honeymoon, family reunion, or multi-city plan not listed here? Tell
              us your dates, party size, and budget — a specialist will design a
              custom itinerary with you.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
            <Button
              render={
                <a
                  href={getSupportWhatsAppUrl("a custom holiday package")}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              size="lg"
              className="justify-center bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <HugeiconsIcon icon={Message01Icon} size={18} aria-hidden="true" />
              <span>Plan a custom trip</span>
            </Button>
            <Button render={<Link href="/destinations" />} variant="outline" size="lg" className="justify-center">
              <span>Browse destinations</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
