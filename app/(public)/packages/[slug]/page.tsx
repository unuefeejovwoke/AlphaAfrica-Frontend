import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Location01Icon,
  Calendar01Icon,
  Tick01Icon,
  StarIcon,
  Message01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { RetryButton } from "@/components/home/retry-button";
import { PackageEnquiryForm } from "@/components/packages/package-enquiry-form";
import { getPackages, getPackageDetail } from "@/lib/api/packages";
import { ApiError } from "@/lib/api/client";
import { formatNaira } from "@/lib/format";
import { canonicalUrl } from "@/lib/seo";
import { humanizeSlug, packageDetailJsonLd, resolveListingImageUrl } from "@/lib/listings";
import { getSupportWhatsAppUrl } from "@/lib/content/company";

export const revalidate = 3600;
export const dynamicParams = true;

type DetailParams = { slug: string };

export async function generateStaticParams(): Promise<DetailParams[]> {
  try {
    const page = await getPackages();
    return page.results.map((pkg) => ({ slug: pkg.slug }));
  } catch {
    // Backend may be unreachable at build time; ISR + dynamicParams
    // still renders new slugs on demand at runtime.
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<DetailParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const url = canonicalUrl(`/packages/${slug}`);
  try {
    const pkg = await getPackageDetail(slug);
    const description =
      pkg.summary.length > 0
        ? pkg.summary.slice(0, 155)
        : `${pkg.title} — a ${pkg.duration_days}-day curated itinerary to ${pkg.destination_name} from ${formatNaira(pkg.price)} per person.`;
    return {
      title: `${pkg.title} | Alphaa Africa`,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: `${pkg.title} | Alphaa Africa`,
        description,
        url,
        type: "website",
        images: [
          {
            url: resolveListingImageUrl(pkg.main_image),
            alt: `${pkg.title} — ${pkg.destination_name}`,
          },
        ],
      },
    };
  } catch {
    const name = humanizeSlug(slug);
    return {
      title: `${name} | Alphaa Africa`,
      description: `Curated holiday package with clear pricing and a no-payment enquiry from Alphaa Africa.`,
      alternates: { canonical: url },
    };
  }
}

/**
 * `/packages/[slug]` (RSC, ISR 3600): the 11 PRD §8.6 sections — hero,
 * name, destination, duration, from-price, highlights, inclusions,
 * gallery, description, inline Enquiry form, and a
 * "Need something different?" CTA — with TouristTrip JSON-LD.
 */
export default async function PackageDetailPage({
  params,
}: {
  params: Promise<DetailParams>;
}) {
  const { slug } = await params;

  let pkg;
  try {
    pkg = await getPackageDetail(slug);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not-found") notFound();
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-12 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load this package right now."
        />
        <RetryButton label="Retry loading package" />
      </div>
    );
  }

  const jsonLd = packageDetailJsonLd({
    title: pkg.title,
    slug: pkg.slug,
    destination_name: pkg.destination_name,
    destination_slug: pkg.destination_slug,
    price: pkg.price,
    main_image: pkg.main_image,
    description: pkg.description || pkg.summary,
  });

  const nightsLabel =
    pkg.duration_nights > 0
      ? `${pkg.duration_days} ${pkg.duration_days === 1 ? "day" : "days"} · ${pkg.duration_nights} ${pkg.duration_nights === 1 ? "night" : "nights"}`
      : `${pkg.duration_days} ${pkg.duration_days === 1 ? "day" : "days"}`;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-12 sm:px-6 md:gap-16 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/packages" className="font-medium hover:text-primary hover:underline">
          Packages
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/packages?destination=${encodeURIComponent(pkg.destination_slug)}`}
          className="font-medium hover:text-primary hover:underline"
        >
          {pkg.destination_name}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="truncate font-semibold text-foreground">
          {pkg.title}
        </span>
      </nav>

      {/* 1. Hero image */}
      <section aria-label={`${pkg.title} photos`} className="overflow-hidden rounded-3xl border border-border bg-card">
        <img
          src={resolveListingImageUrl(pkg.main_image)}
          alt={`${pkg.title} — ${pkg.destination_name}`}
          fetchPriority="high"
          decoding="async"
          className="aspect-[16/8] w-full object-cover sm:aspect-[21/8]"
        />
      </section>

      {/* 2–5. Name, destination, duration, price */}
      <section aria-labelledby="package-heading" className="flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/destinations/${pkg.destination_slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <HugeiconsIcon icon={Location01Icon} size={14} className="text-primary" aria-hidden="true" />
            {pkg.destination_name}
          </Link>
          {pkg.is_featured === true && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <HugeiconsIcon icon={StarIcon} size={12} aria-hidden="true" />
              Featured
            </span>
          )}
        </div>
        <h1 id="package-heading" className="text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
          {pkg.title}
        </h1>
        {pkg.summary && (
          <p className="text-base leading-relaxed break-words text-muted-foreground">{pkg.summary}</p>
        )}
        <dl className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-3">
          <div className="flex items-start gap-2.5">
            <HugeiconsIcon icon={Calendar01Icon} size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex flex-col">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Duration</dt>
              <dd className="font-variant-numeric text-sm font-bold tabular-nums text-foreground">{nightsLabel}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <HugeiconsIcon icon={Tick01Icon} size={18} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
            <div className="flex flex-col">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">From price</dt>
              <dd className="text-sm font-bold text-foreground">
                {formatNaira(pkg.price)} <span className="font-medium text-muted-foreground">per person</span>
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <HugeiconsIcon icon={Location01Icon} size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex flex-col">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Destination</dt>
              <dd className="text-sm font-bold text-foreground">{pkg.destination_name}</dd>
            </div>
          </div>
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-10">
          {/* 6. Highlights */}
          {pkg.highlights_list.length > 0 && (
            <section aria-labelledby="package-highlights-heading">
              <h2 id="package-highlights-heading" className="text-2xl font-bold tracking-tight text-foreground">
                Highlights
              </h2>
              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {pkg.highlights_list.map((highlight) => (
                  <li
                    key={highlight}
                    className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground"
                  >
                    <HugeiconsIcon icon={StarIcon} size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 7. What's included */}
          {pkg.inclusions_list.length > 0 && (
            <section aria-labelledby="package-included-heading">
              <h2 id="package-included-heading" className="text-2xl font-bold tracking-tight text-foreground">
                What&apos;s included
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-5 sm:p-6">
                {pkg.inclusions_list.map((inclusion) => (
                  <li key={inclusion} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground">
                    <HugeiconsIcon icon={Tick01Icon} size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>{inclusion}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 8. Gallery */}
          {pkg.images.length > 0 && (
            <section aria-labelledby="package-gallery-heading">
              <h2 id="package-gallery-heading" className="text-2xl font-bold tracking-tight text-foreground">
                Gallery
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {pkg.images.map((image) => (
                  <figure
                    key={image.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <img
                      src={resolveListingImageUrl(image.image)}
                      alt={image.caption || `${pkg.title} — ${pkg.destination_name}`}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[16/10] w-full object-cover"
                    />
                    {image.caption && (
                      <figcaption className="px-4 py-2.5 text-xs text-muted-foreground">
                        {image.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* 9. Description */}
          {pkg.description && (
            <section aria-labelledby="package-about-heading">
              <h2 id="package-about-heading" className="text-2xl font-bold tracking-tight text-foreground">
                About this package
              </h2>
              <div className="mt-4 max-w-3xl space-y-4 text-sm leading-relaxed break-words text-muted-foreground md:text-base">
                {pkg.description.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 10. Enquiry form (sticky on desktop) */}
        <aside aria-label="Package enquiry" className="min-w-0">
          <div id="enquiry" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
            <PackageEnquiryForm
              packageSlug={pkg.slug}
              packageTitle={pkg.title}
              destinationName={pkg.destination_name}
            />
          </div>
        </aside>
      </div>

      {/* 11. "Need something different?" CTA */}
      <section
        aria-labelledby="different-heading"
        className="rounded-3xl bg-secondary p-8 text-secondary-foreground sm:p-12"
      >
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 id="different-heading" className="text-2xl font-bold tracking-tight text-balance text-white">
              Need something different?
            </h2>
            <p className="text-sm leading-relaxed text-white/80">
              Different dates, more travellers, or another destination entirely?
              A specialist will reshape this plan around you — or build a custom
              trip from scratch.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
            <Button
              render={
                <a
                  href={getSupportWhatsAppUrl(`a custom version of ${pkg.title}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              size="lg"
              className="justify-center bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <HugeiconsIcon icon={Message01Icon} size={18} aria-hidden="true" />
              <span>Customize this trip</span>
            </Button>
            <Button
              render={<Link href="/packages" />}
              variant="outline"
              size="lg"
              className="justify-center border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <span>Compare packages</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
