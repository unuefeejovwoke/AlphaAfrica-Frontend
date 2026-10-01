import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Location01Icon,
  Calendar01Icon,
  Message01Icon,
  ArrowRight01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import { RetryButton } from "@/components/home/retry-button"
import { PackageCard } from "@/components/packages/package-card"
import { TerminalCta } from "@/components/shared/terminal-cta"
import { getDestinations, getDestinationDetail } from "@/lib/api/destinations"
import type { DestinationDetail } from "@/lib/api/destinations"
import type { PackageList } from "@/lib/api/packages"
import { ApiError } from "@/lib/api/client"
import { formatNaira } from "@/lib/format"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"
import {
  destinationDetailJsonLd,
  humanizeSlug,
  parsePriceAmount,
  resolveListingImageUrl,
} from "@/lib/listings"
import { serializeJsonLd } from "@/lib/structured-data"
import { getSupportWhatsAppUrl } from "@/lib/content/company"

export const revalidate = 3600
export const dynamicParams = true

type DetailParams = { slug: string }

/** Destination detail embeds package summaries; cards take PackageList. */
function toPackageList(
  pkg: DestinationDetail["packages"][number]
): PackageList {
  return {
    id: pkg.id,
    title: pkg.title,
    slug: pkg.slug,
    summary: pkg.summary,
    destination_name: pkg.destination_name,
    duration_days: pkg.duration_days,
    duration_nights: pkg.duration_nights,
    price: pkg.price,
    main_image: pkg.main_image,
    inclusions_list: pkg.inclusions_list,
    is_featured: pkg.is_featured,
  }
}

export async function generateStaticParams(): Promise<DetailParams[]> {
  try {
    const page = await getDestinations()
    return page.results.map((destination) => ({ slug: destination.slug }))
  } catch {
    // Backend may be unreachable at build time; ISR + dynamicParams
    // still renders new slugs on demand at runtime.
    return []
  }
}

function humanizeFallback(slug: string): string {
  return humanizeSlug(slug)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<DetailParams>
}): Promise<Metadata> {
  const { slug } = await params
  const url = canonicalUrl(`/destinations/${slug}`)
  try {
    const destination = await getDestinationDetail(slug)
    const description =
      destination.description.length > 0
        ? destination.description.slice(0, 155)
        : `${destination.name}, ${destination.country} — curated holiday packages with starting prices and human planning help.`
    return {
      metadataBase: new URL(getSiteUrl()),
      title: `${destination.name}, ${destination.country} Holiday Packages | Alphaa Africa`,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: `${destination.name} Holiday Packages | Alphaa Africa`,
        description,
        url,
        type: "website",
        images: [
          {
            url: resolveListingImageUrl(destination.main_image),
            alt: `${destination.name}, ${destination.country}`,
          },
        ],
      },
    }
  } catch {
    const name = humanizeSlug(slug)
    return {
      title: `${name} Holiday Packages | Alphaa Africa`,
      description: `Curated holiday packages for ${name} with starting prices and human planning help from Alphaa Africa.`,
      alternates: { canonical: url },
    }
  }
}

/**
 * `/destinations/[slug]` (RSC, ISR 3600): hero, introduction, featured +
 * other packages, travel inspiration, and a terminal CTA — with
 * TouristDestination/ItemList JSON-LD and per-slug metadata.
 */
export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<DetailParams>
}) {
  const { slug } = await params

  let destination
  try {
    destination = await getDestinationDetail(slug)
  } catch (error) {
    if (error instanceof ApiError && error.code === "not-found") notFound()
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-12 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load this destination right now."
        />
        <RetryButton label="Retry loading destination" />
      </div>
    )
  }

  const packages = destination.packages
  const featured = packages.filter((pkg) => pkg.is_featured === true)
  const nonFeatured = packages.filter((pkg) => pkg.is_featured !== true)
  // DestinationDetail carries no starting_price; derive it honestly from
  // the lowest listed from-price (matches the listing card derivation).
  const prices = packages
    .map((pkg) => parsePriceAmount(pkg.price))
    .filter((value): value is number => value !== null)
  const startingPrice =
    prices.length > 0 ? formatNaira(String(Math.min(...prices))) : null

  const jsonLd = destinationDetailJsonLd({
    name: destination.name,
    slug: destination.slug,
    country: destination.country,
    description: destination.description,
    main_image: destination.main_image,
    packages: packages.map((pkg) => ({ title: pkg.title, slug: pkg.slug })),
  })

  const intro =
    destination.description.length > 0
      ? destination.description
      : `${destination.name} is one of our curated destinations. Open a package below to compare durations, inclusions, and from-prices — or tell a specialist your dates and they will shape the trip with you.`

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-12 sm:px-6 md:gap-16 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* 1. Hero */}
      <section
        aria-labelledby="destination-heading"
        className="overflow-hidden rounded-3xl border border-border bg-card"
      >
        <div className="relative">
          <img
            src={resolveListingImageUrl(destination.main_image)}
            alt={`${destination.name}, ${destination.country} — holiday destination`}
            fetchPriority="high"
            decoding="async"
            className="aspect-[16/8] w-full object-cover sm:aspect-[21/8]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 sm:p-10">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-white/85 uppercase">
              <HugeiconsIcon
                icon={Location01Icon}
                size={14}
                aria-hidden="true"
              />
              {destination.country}
            </span>
            <h1
              id="destination-heading"
              className="text-3xl font-extrabold tracking-tight text-balance text-white sm:text-5xl"
            >
              {destination.name}
            </h1>
            <p className="text-sm font-medium text-white/85">
              {packages.length} {packages.length === 1 ? "package" : "packages"}
              {startingPrice ? (
                <>
                  {" "}
                  · From{" "}
                  <span className="font-semibold text-white">
                    {startingPrice}
                  </span>{" "}
                  per person
                </>
              ) : null}
            </p>
          </div>
        </div>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 px-6 py-4 text-xs text-muted-foreground sm:px-10"
        >
          <Link
            href="/destinations"
            className="font-medium hover:text-primary hover:underline"
          >
            Destinations
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-semibold text-foreground">
            {destination.name}
          </span>
        </nav>
      </section>

      {/* 2. Introduction */}
      <section
        aria-labelledby="destination-intro-heading"
        className="max-w-3xl"
      >
        <h2
          id="destination-intro-heading"
          className="text-2xl font-bold tracking-tight text-foreground"
        >
          Planning a trip to {destination.name}?
        </h2>
        <p className="mt-3 text-sm leading-relaxed break-words text-muted-foreground md:text-base">
          {intro}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ButtonLink href="#packages" size="sm">
            <span>Compare packages</span>
          </ButtonLink>
          <ButtonLink
            href={getSupportWhatsAppUrl(`a ${destination.name} holiday`)}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="sm"
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Ask a specialist</span>
          </ButtonLink>
        </div>
      </section>

      {/* 3 + 4. Featured + other packages */}
      <section
        id="packages"
        aria-labelledby="destination-packages-heading"
        className="scroll-mt-24"
      >
        <div className="mb-6 flex max-w-2xl flex-col gap-2">
          <h2
            id="destination-packages-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {featured.length > 0 ? "Featured packages" : "Available packages"}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Curated itineraries to {destination.name} with clear durations and
            from-prices. Open one to see highlights, inclusions, and to send an
            enquiry.
          </p>
        </div>
        {packages.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm font-semibold text-foreground">
              New {destination.name} itineraries are on the way.
            </p>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              Nothing is published for this destination yet. Describe your ideal
              trip and a specialist will design it with you — no payment needed
              to start.
            </p>
            <ButtonLink
              href={getSupportWhatsAppUrl(`a ${destination.name} holiday`)}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={16}
                aria-hidden="true"
              />
              <span>Plan a custom trip</span>
            </ButtonLink>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(featured.length > 0 ? featured : packages).map((pkg) => (
              <PackageCard key={pkg.slug} pkg={toPackageList(pkg)} />
            ))}
          </div>
        )}

        {featured.length > 0 && nonFeatured.length > 0 && (
          <div className="mt-10">
            <h3 className="mb-4 text-xl font-bold tracking-tight text-foreground">
              More ways to see {destination.name}
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {nonFeatured.map((pkg) => (
                <PackageCard key={pkg.slug} pkg={toPackageList(pkg)} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 5. Travel inspiration (planning prompts — no fabricated claims) */}
      <section
        aria-labelledby="destination-inspiration-heading"
        className="rounded-3xl border border-border bg-card p-8 sm:p-10"
      >
        <h2
          id="destination-inspiration-heading"
          className="text-2xl font-bold tracking-tight text-foreground"
        >
          Start shaping your {destination.name} trip
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Three answers help a specialist match you with the right itinerary
          fast.
        </p>
        <ol className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: "Your dates",
              body: "Share when you can travel and how flexible you are. Nearby dates often unlock better fares.",
              icon: Calendar01Icon,
            },
            {
              title: "Your party",
              body: "Tell us how many adults and children are travelling so inclusions and rooms fit everyone.",
              icon: Tick01Icon,
            },
            {
              title: "Your budget",
              body: "Name a comfortable per-person range. We will stay inside it and show the trade-offs clearly.",
              icon: Location01Icon,
            },
          ].map((item) => (
            <li key={item.title} className="flex flex-col gap-2">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={item.icon} size={20} aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-foreground">
                {item.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/60 pt-6">
          <ButtonLink
            href={getSupportWhatsAppUrl(`a ${destination.name} holiday`)}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="sm"
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Send your three answers on WhatsApp</span>
          </ButtonLink>
          <Link
            href="/packages"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <span>Or compare every package</span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      {/* 6. Terminal CTA */}
      <TerminalCta
        title={`Ready when you are — let's plan ${destination.name}.`}
        description={`Send an enquiry on any ${destination.name} package, or tell a specialist your dates and budget for a custom plan. No payment needed to start.`}
        primaryHref="/contact"
        primaryLabel="Contact Us"
      />
    </div>
  )
}
