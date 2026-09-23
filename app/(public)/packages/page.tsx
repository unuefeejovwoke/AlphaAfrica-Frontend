import type { Metadata } from "next"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { WhatsappIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import { RetryButton } from "@/components/home/retry-button"
import { PackageCard } from "@/components/packages/package-card"
import { PackageFilters } from "@/components/packages/package-filters"
import { TerminalCta } from "@/components/shared/terminal-cta"
import { getPackages } from "@/lib/api/packages"
import { getDestinations } from "@/lib/api/destinations"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"
import {
  buildPackageSearchParams,
  parsePackageSearchParams,
  sortFeaturedFirst,
} from "@/lib/listings"
import { getSupportWhatsAppUrl } from "@/lib/content/company"

export const revalidate = 3600

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
}

type ListingSearchParams = {
  destination?: string | string[]
  max_price?: string | string[]
  featured?: string | string[]
}

/**
 * `/packages` (RSC, ISR 3600): server-filtered grid driven by URL
 * searchParams (`destination`, `max_price`, `featured`), so every
 * filtered view is shareable and crawlable. Controls update the URL
 * via `startTransition`. Covers loading, empty, and error+retry (§12).
 */
export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>
}) {
  const rawSearchParams = await searchParams
  const filters = parsePackageSearchParams(rawSearchParams)

  let packages
  let destinationOptions: { slug: string; name: string }[] = []
  try {
    // Parallel independent fetches — no waterfalls.
    const [packagePage, destinationPage] = await Promise.all([
      getPackages(filters),
      getDestinations(),
    ])
    packages = sortFeaturedFirst(packagePage.results)
    destinationOptions = destinationPage.results.map((destination) => ({
      slug: destination.slug,
      name: destination.name,
    }))
  } catch (error) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load packages right now."
        />
        <RetryButton label="Retry loading packages" />
      </div>
    )
  }

  const activeFilterCount =
    (filters.destination ? 1 : 0) +
    (filters.max_price !== undefined ? 1 : 0) +
    (filters.featured ? 1 : 0)
  const shareableQuery = buildPackageSearchParams(filters)

  return (
    <div className="flex flex-col gap-14 pb-20 sm:gap-18 sm:pb-28">
      {/* 1. Hero: Clean Header */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 md:pt-16 lg:px-8">
        <div className="flex max-w-3xl flex-col items-start gap-4">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
            Holiday Packages
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Curated journeys, planned with precision.
          </h1>
        </div>
      </section>

      {/* 2. Filters & Status (Commented out per user request)
      <section aria-label="Package filters" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col gap-4">
        <PackageFilters initial={filters} destinations={destinationOptions} />

        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-1" aria-live="polite">
          <span className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-primary" />
            {packages.length === 0
              ? "No packages match these filters yet."
              : `${packages.length} ${packages.length === 1 ? "package" : "packages"} available`}
          </span>
          {activeFilterCount > 0 && shareableQuery && (
            <Link
              href="/packages"
              scroll={false}
              className="text-primary hover:underline underline-offset-4 transition-colors font-semibold"
            >
              Reset all filters
            </Link>
          )}
        </div>
      </section>
      */}

      {/* 3. Package Grid / Empty State */}
      <section
        aria-label="Available packages"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        {packages.length === 0 ? (
          <div className="relative rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs sm:p-2 dark:border-white/10 dark:bg-zinc-900/40">
            <div className="flex flex-col items-center gap-4 rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-10 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-14 dark:border-white/[0.06] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <h2 className="text-xl font-semibold text-foreground">
                No packages match these filters
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Try widening your budget or clearing the destination filter. Or
                describe your ideal trip — our specialists will design a custom
                itinerary with you.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  render={<Link href="/packages" scroll={false} />}
                  variant="outline"
                  size="sm"
                >
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
                  className="bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                >
                  <HugeiconsIcon
                    icon={WhatsappIcon}
                    size={16}
                    aria-hidden="true"
                  />
                  <span>Plan custom trip</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <PackageCard key={pkg.slug} pkg={pkg} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Custom Trip CTA */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <TerminalCta
          title="Need a bespoke itinerary?"
          description="Honeymoon, family vacation, or multi-city tour not listed here? Tell us your dates, group size, and preferred budget — our destination specialists will craft a custom trip for you."
          eyebrow="Tailored Itineraries"
          backgroundImage="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80"
          primaryHref="/contact"
          primaryLabel="Contact Us"
        />
      </section>
    </div>
  )
}
