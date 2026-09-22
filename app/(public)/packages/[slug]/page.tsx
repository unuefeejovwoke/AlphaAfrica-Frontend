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
  SparklesIcon,
  SecurityCheckIcon,
  Passport01Icon,
  HeadphonesIcon,
  Call02Icon,
  InformationCircleIcon,
  Luggage01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { RetryButton } from "@/components/home/retry-button";
import { PackageEnquiryForm } from "@/components/packages/package-enquiry-form";
import { PackageGallery } from "@/components/packages/package-gallery";
import {
  PackageShareButton,
  PackageMobileBar,
} from "@/components/packages/package-detail-client";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { TrackLink } from "@/components/analytics/track-link";
import { TerminalCta } from "@/components/shared/terminal-cta";
import { getPackages, getPackageDetail } from "@/lib/api/packages";
import { ApiError } from "@/lib/api/client";
import { formatNaira } from "@/lib/format";
import { canonicalUrl } from "@/lib/seo";
import { humanizeSlug, packageDetailJsonLd, resolveListingImageUrl } from "@/lib/listings";
import { company, getSupportWhatsAppUrl } from "@/lib/content/company";

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

const PACKAGE_FAQS = [
  {
    q: "Can I customize the itinerary or dates?",
    a: "Yes! Every Alphaa Africa holiday is fully customizable. Once you submit an enquiry, our travel specialist will discuss your preferred travel dates, duration, hotel upgrades, and activity adjustments.",
  },
  {
    q: "Are flights included in the price?",
    a: "The starting price covers the curated land package (accommodation, transfers, tours, and meals as noted). Our Abuja team can bundle international or domestic flights from Abuja or Lagos at competitive live airline rates.",
  },
  {
    q: "How does payment work?",
    a: "Enquiring is 100% free with zero deposit. Once you and our specialist finalize your tailored itinerary, you will receive a transparent invoice and secure Paystack payment link in Naira.",
  },
  {
    q: "Can you assist with visas for this destination?",
    a: "Absolutely. Alphaa Africa offers comprehensive visa advisory and document preparation services for all our travel destinations.",
  },
];

/**
 * `/packages/[slug]` (RSC, ISR 3600): Elevated editorial luxury package detail page.
 * Cohesive with Homepage and Visa design systems:
 * - Editorial mosaic gallery with interactive fullscreen lightbox
 * - Luxury spec ribbon with key trip parameters
 * - Rich narrative overview & curated highlights cards
 * - Inclusions breakdown with Alphaa travel assurance
 * - Interactive Enquiry widget with steppers and quick prompts
 * - Mobile floating conversion bar
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
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 sm:px-6 lg:px-8">
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

  const durationFormatted =
    pkg.duration_nights > 0
      ? `${pkg.duration_days} Days / ${pkg.duration_nights} Nights`
      : `${pkg.duration_days} Days`;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 sm:gap-14 px-4 py-8 sm:px-6 md:py-12 lg:px-8 pb-24 sm:pb-32">
      <ViewTracker event="package_viewed" props={{ slug: pkg.slug }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 1. Top Bar: Breadcrumb & Social Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">/</span>
          <Link href="/packages" className="hover:text-primary transition-colors">
            Holiday Packages
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">/</span>
          <Link
            href={`/destinations/${pkg.destination_slug}`}
            className="hover:text-primary transition-colors"
          >
            {pkg.destination_name}
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">/</span>
          <span aria-current="page" className="truncate font-semibold text-foreground max-w-[200px] sm:max-w-xs">
            {pkg.title}
          </span>
        </nav>

        <div className="flex items-center gap-2.5">
          <PackageShareButton title={pkg.title} destinationName={pkg.destination_name} />
          <Button
            render={
              <TrackLink
                event="support_click"
                eventProps={{ context: "package detail top bar", channel: "whatsapp" }}
                href={getSupportWhatsAppUrl(`the ${pkg.title} holiday package to ${pkg.destination_name}`)}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            variant="outline"
            size="xs"
            className="h-8 gap-1.5 rounded-full px-3 text-xs"
          >
            <HugeiconsIcon icon={Message01Icon} size={14} className="text-emerald-600" aria-hidden="true" />
            <span>Ask Specialist</span>
          </Button>
        </div>
      </div>

      {/* 2. Package Title & Hero Section */}
      <section aria-labelledby="package-title" className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/destinations/${pkg.destination_slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <HugeiconsIcon icon={Location01Icon} size={14} aria-hidden="true" />
              <span>{pkg.destination_name}</span>
            </Link>

            {pkg.is_featured === true && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <HugeiconsIcon icon={StarIcon} size={12} className="text-amber-500" aria-hidden="true" />
                <span>Featured Journey</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              <HugeiconsIcon icon={Calendar01Icon} size={13} aria-hidden="true" />
              <span>{durationFormatted}</span>
            </span>
          </div>

          <h1
            id="package-title"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15] text-balance"
          >
            {pkg.title}
          </h1>

          {pkg.summary && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed text-pretty">
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

      {/* 3. Luxury Spec Ribbon / Key Facts Strip */}
      <section aria-label="Key trip specifications">
        <div className="rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs dark:bg-zinc-900/40 dark:border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 rounded-[calc(1.5rem-2px)] bg-card border border-black/[0.04] dark:border-white/[0.06] p-4 sm:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
            {/* Duration */}
            <div className="flex items-start gap-3 p-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={Calendar01Icon} size={20} aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Duration
                </span>
                <span className="text-sm font-bold text-foreground font-variant-numeric tabular-nums">
                  {durationFormatted}
                </span>
                <span className="text-[11px] text-muted-foreground">Customizable pace</span>
              </div>
            </div>

            {/* Destination */}
            <div className="flex items-start gap-3 p-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={Location01Icon} size={20} aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Destination
                </span>
                <span className="text-sm font-bold text-foreground truncate max-w-[140px]">
                  {pkg.destination_name}
                </span>
                <span className="text-[11px] text-muted-foreground">Curated itinerary</span>
              </div>
            </div>

            {/* Starting Price */}
            <div className="flex items-start gap-3 p-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <HugeiconsIcon icon={Tick01Icon} size={20} aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Starting Price
                </span>
                <span className="text-sm font-bold text-foreground">
                  {formatNaira(pkg.price)}
                </span>
                <span className="text-[11px] text-muted-foreground">Per person · No hidden fees</span>
              </div>
            </div>

            {/* Assisted Service */}
            <div className="flex items-start gap-3 p-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <HugeiconsIcon icon={Passport01Icon} size={20} aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Service Level
                </span>
                <span className="text-sm font-bold text-foreground">
                  Human-Guided
                </span>
                <span className="text-[11px] text-muted-foreground">Abuja travel desk</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_420px] lg:gap-14">
        {/* Left Column: Itinerary Details, Inclusions, Highlights & FAQ */}
        <div className="flex min-w-0 flex-col gap-12 sm:gap-14">
          {/* About & Narrative Description */}
          {pkg.description && (
            <section aria-labelledby="package-about-heading" className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HugeiconsIcon icon={SparklesIcon} size={16} aria-hidden="true" />
                </span>
                <h2 id="package-about-heading" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  About this experience
                </h2>
              </div>

              <div className="prose prose-zinc dark:prose-invert max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                {pkg.description.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={index} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Specialist Promise Callout */}
              <div className="mt-2 rounded-2xl border border-border/80 bg-muted/30 p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={HeadphonesIcon} size={22} aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Tailored around your lifestyle
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Looking to adjust hotel tiers, extend your stay, or add a private excursion? Our Abuja travel advisors work directly with you to craft the perfect itinerary before any payment is made.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Curated Highlights */}
          {pkg.highlights_list.length > 0 && (
            <section aria-labelledby="package-highlights-heading" className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Memorable Moments
                </span>
                <h2 id="package-highlights-heading" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Trip Highlights
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {pkg.highlights_list.map((highlight, index) => (
                  <div
                    key={highlight}
                    className="group relative flex flex-col rounded-2xl p-1 bg-muted/30 border border-border/80 shadow-2xs transition-all hover:border-foreground/20 hover:shadow-xs"
                  >
                    <div className="flex flex-1 items-start gap-3 rounded-[calc(1rem-2px)] bg-card p-4">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="text-xs sm:text-sm font-medium leading-relaxed text-foreground">
                        {highlight}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* What's Included & Alphaa Guarantees */}
          {pkg.inclusions_list.length > 0 && (
            <section aria-labelledby="package-included-heading" className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Comprehensive Inclusions
                </span>
                <h2 id="package-included-heading" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  What&apos;s Included
                </h2>
              </div>

              <div className="rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs dark:bg-zinc-900/40 dark:border-white/10">
                <div className="rounded-[calc(1.5rem-2px)] bg-card border border-black/[0.04] p-5 sm:p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {pkg.inclusions_list.map((inclusion) => (
                      <li key={inclusion} className="flex items-start gap-3 text-xs sm:text-sm text-foreground">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mt-0.5">
                          <HugeiconsIcon icon={Tick01Icon} size={14} aria-hidden="true" />
                        </span>
                        <span className="leading-relaxed font-medium">{inclusion}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Alphaa Peace of Mind Pack */}
                  <div className="mt-6 pt-6 border-t border-border/70 flex flex-col gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Complimentary Alphaa Africa Perks
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={SecurityCheckIcon} size={16} className="text-primary shrink-0" />
                        <span>Airport Meet & Greet</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={HeadphonesIcon} size={16} className="text-primary shrink-0" />
                        <span>24/7 On-Trip Concierge</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={Passport01Icon} size={16} className="text-primary shrink-0" />
                        <span>Visa Application Guidance</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Why Book With Alphaa Africa (Brand Trust Bento) */}
          <section aria-labelledby="why-alphaa-heading" className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                The Alphaa Guarantee
              </span>
              <h2 id="why-alphaa-heading" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Why book this journey with us?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Zero Deposit */}
              <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Tick01Icon} size={20} aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-foreground">Zero Upfront Deposit</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enquire and customize your itinerary completely free of charge. You only pay when you are 100% satisfied with the plan.
                </p>
              </div>

              {/* Card 2: Real Travel Specialists */}
              <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                <div className="flex size-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <HugeiconsIcon icon={HeadphonesIcon} size={20} aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-foreground">Abuja Travel Concierge</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Real human specialists in Abuja CBD dedicated to answering questions, managing flight changes, and ensuring seamless travel.
                </p>
              </div>

              {/* Card 3: Handpicked Partners */}
              <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <HugeiconsIcon icon={StarIcon} size={20} aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-foreground">Handpicked Stays & Tours</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Every resort, vehicle, and excursion is vetted for comfort, safety, and authentic hospitality by experienced scouts.
                </p>
              </div>

              {/* Card 4: End-to-End Assistance */}
              <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Luggage01Icon} size={20} aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-foreground">End-to-End Coverage</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  From international flights to visa approvals and travel insurance, we orchestrate all elements under one unified booking.
                </p>
              </div>
            </div>
          </section>

          {/* Frequently Asked Questions */}
          <section aria-labelledby="package-faq-heading" className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Helpful Details
              </span>
              <h2 id="package-faq-heading" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {PACKAGE_FAQS.map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col gap-2"
                >
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-primary shrink-0" aria-hidden="true" />
                    <span>{faq.q}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-6">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Enquiry Widget & Quick Contact */}
        <aside aria-label="Book this package" className="min-w-0">
          <div className="flex flex-col gap-5 lg:sticky lg:top-24">
            {/* The Main Enquiry Form */}
            <div id="enquiry" className="scroll-mt-24">
              <PackageEnquiryForm
                packageSlug={pkg.slug}
                packageTitle={pkg.title}
                destinationName={pkg.destination_name}
                packagePrice={pkg.price}
              />
            </div>

            {/* Quick Contact Help Card */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Call02Icon} size={18} aria-hidden="true" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">Need immediate assistance?</span>
                  <span className="text-[11px] text-muted-foreground">Speak directly with our Abuja desk</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  render={
                    <a
                      href={company.phone.href}
                      className="justify-center text-xs"
                    />
                  }
                  variant="outline"
                  size="sm"
                >
                  <HugeiconsIcon icon={Call02Icon} size={14} aria-hidden="true" />
                  <span>Call Office</span>
                </Button>
                <Button
                  render={
                    <TrackLink
                      event="support_click"
                      eventProps={{ context: "package detail sidebar", channel: "whatsapp" }}
                      href={getSupportWhatsAppUrl(`package: ${pkg.title}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="justify-center text-xs"
                    />
                  }
                  variant="outline"
                  size="sm"
                  className="text-emerald-700 hover:text-emerald-800 border-emerald-300 dark:border-emerald-800"
                >
                  <HugeiconsIcon icon={Message01Icon} size={14} className="text-emerald-600" aria-hidden="true" />
                  <span>WhatsApp</span>
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center pt-1 border-t border-border/50">
                Office: Suite B4, Statement Hotel Building, CBD Abuja
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* 5. Terminal CTA */}
      <TerminalCta
        title="Need something completely bespoke?"
        description="Different dates, more travellers, or another destination entirely? A specialist in Abuja will reshape this plan around you — or build a custom trip from scratch."
        eyebrow="Bespoke Variations"
        primaryHref="/contact"
        primaryLabel="Contact Us"
      />

      {/* 6. Mobile Floating Action Bar */}
      <PackageMobileBar price={pkg.price} title={pkg.title} />
    </div>
  );
}
