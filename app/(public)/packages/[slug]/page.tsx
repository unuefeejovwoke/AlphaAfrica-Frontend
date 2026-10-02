import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Location01Icon,
  Calendar01Icon,
  Tick01Icon,
  StarIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { ErrorState } from "@/components/feedback/error-state"
import { RetryButton } from "@/components/home/retry-button"
import { PackageEnquiryForm } from "@/components/packages/package-enquiry-form"
import { PackageGallery } from "@/components/packages/package-gallery"
import {
  PackageShareButton,
  PackageMobileBar,
  BookNowButton,
} from "@/components/packages/package-detail-client"
import { ViewTracker } from "@/components/analytics/view-tracker"
import { getPackages, getPackageDetail } from "@/lib/api/packages"
import { ApiError } from "@/lib/api/client"
import { formatNaira } from "@/lib/format"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"
import { serializeJsonLd } from "@/lib/structured-data"
import { humanizeSlug, packageDetailJsonLd } from "@/lib/listings"

export const revalidate = 3600
export const dynamicParams = true

type DetailParams = { slug: string }

export async function generateStaticParams(): Promise<DetailParams[]> {
  try {
    const page = await getPackages()
    return page.results.map((pkg) => ({ slug: pkg.slug }))
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
  const url = canonicalUrl(`/packages/${slug}`)
  try {
    const pkg = await getPackageDetail(slug)
    const description =
      pkg.summary.length > 0
        ? pkg.summary.slice(0, 155)
        : `${pkg.title} — a ${pkg.duration_days}-day curated itinerary to ${pkg.destination_name} from ${formatNaira(pkg.price)} per person.`
    return {
      metadataBase: new URL(getSiteUrl()),
      title: `${pkg.title} | Alphaa Africa`,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: `${pkg.title} | Alphaa Africa`,
        description,
        url,
        type: "website",
      },
    }
  } catch {
    const name = humanizeSlug(slug)
    return {
      title: `${name} | Alphaa Africa`,
      description: `Curated holiday package with clear pricing and a no-payment enquiry from Alphaa Africa.`,
      alternates: { canonical: url },
    }
  }
}

const PACKAGE_FAQS = [
  {
    q: "Can I customize the itinerary or travel dates?",
    a: "Yes. Every holiday package is fully customizable. Once you submit an enquiry, our travel team will adjust dates, duration, hotel tiers, and activities to match your plans before finalizing.",
  },
  {
    q: "Are flights included in the starting price?",
    a: "The displayed starting price covers the curated land package (accommodation, transfers, tours, and meals as specified). We can easily bundle domestic or international flights at competitive airline rates upon request.",
  },
  {
    q: "When and how do I pay?",
    a: "Submitting an enquiry is 100% free with zero deposit. Once you review and approve your tailored itinerary, you will receive a transparent invoice and secure Paystack payment link.",
  },
  {
    q: "Can you assist with visas for this destination?",
    a: "Yes. Alphaa Africa provides complete visa advisory and application support for all our holiday destinations.",
  },
]

/**
 * `/packages/[slug]` (RSC, ISR 3600): Redesigned package detail page.
 * Uses the site-wide max-w-7xl container matching header and footer.
 * Clear editorial flow with hero, quick action bar, narrative, highlights, inclusions, and clean enquiry form at the bottom.
 */
export default async function PackageDetailPage({
  params,
}: {
  params: Promise<DetailParams>
}) {
  const { slug } = await params

  let pkg
  try {
    pkg = await getPackageDetail(slug)
  } catch (error) {
    if (error instanceof ApiError && error.code === "not-found") notFound()
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load this package right now."
        />
        <RetryButton label="Retry loading package" />
      </div>
    )
  }

  const jsonLd = packageDetailJsonLd({
    title: pkg.title,
    slug: pkg.slug,
    destination_name: pkg.destination_name,
    destination_slug: pkg.destination_slug,
    price: pkg.price,
    main_image: pkg.main_image,
    description: pkg.description || pkg.summary,
  })

  const durationFormatted =
    pkg.duration_nights > 0
      ? `${pkg.duration_days} Days / ${pkg.duration_nights} Nights`
      : `${pkg.duration_days} Days`

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 pb-24 sm:gap-14 sm:px-6 sm:pb-32 md:py-12 lg:px-8">
      <ViewTracker event="package_viewed" props={{ slug: pkg.slug }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* 1. Breadcrumb & Share Action */}
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
          <Link
            href="/packages"
            className="transition-colors hover:text-primary"
          >
            Holiday Packages
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">
            /
          </span>
          <Link
            href={`/destinations/${pkg.destination_slug}`}
            className="transition-colors hover:text-primary"
          >
            {pkg.destination_name}
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">
            /
          </span>
          <span
            aria-current="page"
            className="max-w-[200px] truncate font-semibold text-foreground sm:max-w-xs"
          >
            {pkg.title}
          </span>
        </nav>

        <PackageShareButton
          title={pkg.title}
          destinationName={pkg.destination_name}
        />
      </div>

      {/* 2. Hero Header: Title, Tags & Photo Showcase */}
      <section aria-labelledby="package-title" className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/destinations/${pkg.destination_slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <HugeiconsIcon
                icon={Location01Icon}
                size={14}
                aria-hidden="true"
              />
              <span>{pkg.destination_name}</span>
            </Link>

            {pkg.is_featured === true && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700">
                <HugeiconsIcon
                  icon={StarIcon}
                  size={12}
                  className="fill-amber-500 text-amber-500"
                  aria-hidden="true"
                />
                <span>Featured Journey</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <HugeiconsIcon
                icon={Calendar01Icon}
                size={13}
                aria-hidden="true"
              />
              <span>{durationFormatted}</span>
            </span>
          </div>

          <h1
            id="package-title"
            className="text-3xl leading-[1.15] font-extrabold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl"
          >
            {pkg.title}
          </h1>

          {pkg.summary && (
            <p className="max-w-3xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              {pkg.summary}
            </p>
          )}
        </div>

        {/* Gallery Showcase with Lightbox */}
        <PackageGallery
          title={pkg.title}
          destinationName={pkg.destination_name}
          mainImage={pkg.main_image}
          images={pkg.images}
        />
      </section>

      {/* 3. Package Action Bar: Price & Immediate "Book Now" CTA */}
      <section aria-label="Package booking actions">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border/80 bg-muted/30 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Starting Price
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {formatNaira(pkg.price)}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                / person
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Zero upfront deposit · Fully customizable
            </p>
          </div>

          <div className="flex w-full sm:w-auto">
            <BookNowButton className="h-12 w-full justify-center px-8 text-base shadow-md shadow-primary/20 sm:w-auto" />
          </div>
        </div>
      </section>

      {/* 4. Middle Content: Overview, Highlights, Inclusions & FAQ */}
      <div className="flex flex-col gap-12 sm:gap-16">
        {/* Narrative Description */}
        {pkg.description && (
          <section
            aria-labelledby="package-about-heading"
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-wider text-primary uppercase">
                The Experience
              </span>
              <h2
                id="package-about-heading"
                className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                About this holiday
              </h2>
            </div>

            <div className="prose prose-zinc max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              {pkg.description.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Highlights */}
        {pkg.highlights_list.length > 0 && (
          <section
            aria-labelledby="package-highlights-heading"
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-wider text-primary uppercase">
                Highlights
              </span>
              <h2
                id="package-highlights-heading"
                className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                What you&apos;ll experience
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pkg.highlights_list.map((highlight, index) => (
                <div
                  key={highlight}
                  className="flex items-start gap-3.5 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs transition-colors hover:border-foreground/20"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-relaxed font-medium text-foreground">
                    {highlight}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Inclusions */}
        {pkg.inclusions_list.length > 0 && (
          <section
            aria-labelledby="package-included-heading"
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-wider text-emerald-600 uppercase">
                Transparent Inclusions
              </span>
              <h2
                id="package-included-heading"
                className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                What&apos;s included
              </h2>
            </div>

            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-8">
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pkg.inclusions_list.map((inclusion) => (
                  <li
                    key={inclusion}
                    className="flex items-start gap-3 text-sm text-foreground"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <HugeiconsIcon
                        icon={Tick01Icon}
                        size={13}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="leading-relaxed font-medium">
                      {inclusion}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Frequently Asked Questions */}
        <section
          aria-labelledby="package-faq-heading"
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Good to Know
            </span>
            <h2
              id="package-faq-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Frequently asked questions
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PACKAGE_FAQS.map((faq) => (
              <div
                key={faq.q}
                className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6"
              >
                <h3 className="flex items-start gap-2 text-sm font-bold text-foreground sm:text-base">
                  <HugeiconsIcon
                    icon={InformationCircleIcon}
                    size={18}
                    className="mt-0.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{faq.q}</span>
                </h3>
                <p className="pl-6.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 5. Booking Section at the Bottom */}
      <section
        id="book-now"
        aria-label="Book this package"
        className="scroll-mt-20 pt-6"
      >
        <div id="enquiry" className="scroll-mt-20">
          <PackageEnquiryForm
            packageSlug={pkg.slug}
            packageTitle={pkg.title}
            destinationName={pkg.destination_name}
            packagePrice={pkg.price}
            durationFormatted={durationFormatted}
          />
        </div>
      </section>

      {/* 6. Mobile Floating Action Bar */}
      <PackageMobileBar price={pkg.price} title={pkg.title} />
    </div>
  )
}
