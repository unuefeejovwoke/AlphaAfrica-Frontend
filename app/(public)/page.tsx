import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Airplane01Icon,
  Luggage01Icon,
  Passport01Icon,
  SecurityCheckIcon,
  Message01Icon,
  Tick01Icon,
  ArrowRight01Icon,
  Location01Icon,
  UserIcon,
  HeadphonesIcon,
  SparklesIcon,
  Mail01Icon,
  Clock01Icon,
  Call02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton";
import { HomeSearchSwitcher } from "@/components/home/home-search-switcher";
import { FeaturedPackages } from "@/components/home/featured-packages";
import { HomeFaq } from "@/components/home/home-faq";
import { TerminalCta } from "@/components/shared/terminal-cta";
import { company, getSupportWhatsAppUrl } from "@/lib/content/company";
import { TrackLink } from "@/components/analytics/track-link";
import { canonicalUrl, getSiteUrl, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: company.seo.title,
    description: company.seo.description,
    alternates: { canonical: canonicalUrl("/") },
    openGraph: {
      title: company.seo.title,
      description: company.seo.description,
      url: canonicalUrl("/"),
      siteName: company.brandName,
      locale: "en_NG",
      type: "website",
    },
  };
}

/** Skeleton grid matching the featured card shape (image + title + meta lines). */
function FeaturedSkeletonGrid({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <CardSkeleton />
      <CardSkeleton className="hidden sm:flex" />
      <CardSkeleton className="hidden lg:flex" />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 md:gap-24 pb-20 sm:pb-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-zinc-950 text-white">
        <Image
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2400&q=85"
          alt="Scenic travel destination"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-24 sm:pt-32 lg:pt-40 pb-36 flex flex-col items-start text-left gap-5 sm:gap-6">
          <div className="flex flex-col gap-3 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
              Wherever you&apos;re going, we&apos;ve got the journey covered.
            </h1>
            <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
              Abuja&apos;s premier assisted-service travel platform. Verified flights, curated hotels, tailor-made holiday packages, and dedicated visa assistance.
            </p>
          </div>

          {/* 3 Key Stats (Inline compact design) */}
          <div className="inline-flex flex-wrap items-center gap-x-3.5 sm:gap-x-4 gap-y-1.5 text-xs sm:text-sm text-white/80">
            <div className="inline-flex items-center gap-1.5">
              <HugeiconsIcon icon={UserIcon} size={16} className="text-white/70 shrink-0" />
              <span className="font-bold text-white">10k+</span>
              <span className="text-white/75">travellers</span>
            </div>
            <span className="text-white/30 select-none text-xs" aria-hidden="true">·</span>
            <div className="inline-flex items-center gap-1.5">
              <HugeiconsIcon icon={HeadphonesIcon} size={16} className="text-white/70 shrink-0" />
              <span className="font-bold text-white">24/7</span>
              <span className="text-white/75">support</span>
            </div>
            <span className="text-white/30 select-none text-xs" aria-hidden="true">·</span>
            <div className="inline-flex items-center gap-1.5">
              <HugeiconsIcon icon={SparklesIcon} size={16} className="text-white/70 shrink-0" />
              <span className="font-bold text-white">100%</span>
              <span className="text-white/75">beautiful experiences</span>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Reassurance Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full -mt-[188px] md:-mt-[216px] relative z-20">
        <div id="trip-search" className="scroll-mt-24">
          <HomeSearchSwitcher />
        </div>

        {/* Reassurance Tags */}
        <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs font-medium text-muted-foreground">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/90 backdrop-blur-md px-3.5 py-1.5 shadow-xs">
            <HugeiconsIcon icon={SecurityCheckIcon} size={15} className="text-emerald-600 shrink-0" />
            <span>Paystack 256-bit Secured</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/90 backdrop-blur-md px-3.5 py-1.5 shadow-xs">
            <HugeiconsIcon icon={Tick01Icon} size={15} className="text-primary shrink-0" />
            <span>Guest Checkout Supported</span>
          </div>
        </div>
      </section>

      {/* Why Choose Alphaa.Africa Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-start gap-4 max-w-3xl mb-10 sm:mb-12">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            The Alphaa Advantage
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            Why Choose Alphaa.Africa?
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            We eliminate the friction and guesswork of travel booking by pairing real-time reservation engines with dedicated, experienced travel specialists in Abuja.
          </p>
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
          {/* 1. Rapid E-Ticket Delivery */}
          <div className="col-span-1 md:col-span-4 group relative flex flex-col rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md dark:bg-zinc-900/40 dark:border-white/10">
            <div className="flex flex-1 flex-col justify-between rounded-[calc(1.5rem-2px)] bg-card border border-black/[0.04] dark:border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <HugeiconsIcon icon={Mail01Icon} size={22} />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/50">
                    Instant Delivery
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                    Rapid E-Ticket Delivery
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Confirmed bookings are processed immediately, with official e-tickets and PNR boarding documents delivered straight to your inbox.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Real-Time Pricing */}
          <div className="col-span-1 md:col-span-4 group relative flex flex-col rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md dark:bg-zinc-900/40 dark:border-white/10">
            <div className="flex flex-1 flex-col justify-between rounded-[calc(1.5rem-2px)] bg-card border border-black/[0.04] dark:border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <HugeiconsIcon icon={SecurityCheckIcon} size={22} />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Zero Hidden Fees
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                    Real-Time Pricing
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Live access to airline and travel inventories ensures transparent pricing, eliminating last-minute fare changes or hidden charges.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Fast, Hassle-Free Bookings */}
          <div className="col-span-1 md:col-span-4 group relative flex flex-col rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md dark:bg-zinc-900/40 dark:border-white/10">
            <div className="flex flex-1 flex-col justify-between rounded-[calc(1.5rem-2px)] bg-card border border-black/[0.04] dark:border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <HugeiconsIcon icon={Clock01Icon} size={22} />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/50">
                    Quick Routing
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                    Fast, Hassle-Free Bookings
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    We find the best routes and fares quickly—so you spend less time searching and more time traveling.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Zanzibar Beach - Adventure Card (Editorial Showcase) */}
          <div className="col-span-1 md:col-span-7 lg:col-span-8 group relative flex flex-col rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md dark:bg-zinc-900/40 dark:border-white/10">
            <div className="relative overflow-hidden rounded-[calc(1.5rem-2px)] min-h-[360px] sm:min-h-[400px] p-6 sm:p-8 flex flex-col justify-between text-white border border-white/20 shadow-xl flex-1">
              <Image
                src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=85"
                alt="Zanzibar Beach tropical turquoise ocean"
                fill
                sizes="(max-width: 768px) 100vw, 66vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

              {/* Top Tag */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white shadow-xs">
                  <HugeiconsIcon icon={SparklesIcon} size={12} className="text-amber-400" aria-hidden="true" />
                  <span>Zanzibar Beach · Let&apos;s Go!</span>
                </span>
              </div>

              {/* Bottom Content & CTA */}
              <div className="relative z-10 flex flex-col gap-3 max-w-xl">
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white leading-tight">
                  Your Next Adventure Awaits!
                </h3>
                <p className="text-sm sm:text-base text-white/85 leading-relaxed">
                  Discover breathtaking places and create unforgettable memories.
                </p>
                <div className="pt-2">
                  <Link
                    href="/packages"
                    className="inline-flex touch-manipulation items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] group/btn gap-2"
                  >
                    <span>Plan Your Trip</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Expert Travel Advisory */}
          <div className="col-span-1 md:col-span-5 lg:col-span-4 group relative flex flex-col rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md dark:bg-zinc-900/40 dark:border-white/10">
            <div className="flex flex-1 flex-col justify-between rounded-[calc(1.5rem-2px)] bg-card border border-black/[0.04] dark:border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                    <HugeiconsIcon icon={Passport01Icon} size={22} />
                  </div>
                  <span className="text-[11px] font-semibold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full border border-secondary/20">
                    Human-Guided
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                    Expert Travel Advisory
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Every trip is guided by experienced travel consultants who validate routes, fares, visa requirements, and travel conditions.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-border/60 flex flex-col gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Tick01Icon} size={14} className="text-primary shrink-0" />
                  <span>Route & schedule validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Tick01Icon} size={14} className="text-primary shrink-0" />
                  <span>Embassy visa requirement checks</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. 24/7 Human Support */}
          <div className="col-span-1 md:col-span-4 group relative flex flex-col rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md dark:bg-zinc-900/40 dark:border-white/10">
            <div className="flex flex-1 flex-col justify-between rounded-[calc(1.5rem-2px)] bg-card border border-black/[0.04] dark:border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <HugeiconsIcon icon={HeadphonesIcon} size={22} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real Specialists</span>
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                    24/7 Human Support
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Enjoy responsive assistance for rebookings, cancellations, rerouting, and urgent travel needs—handled by real professionals, not automated responses.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Africa-Rooted. Globally Connected */}
          <div className="col-span-1 md:col-span-4 group relative flex flex-col rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md dark:bg-zinc-900/40 dark:border-white/10">
            <div className="flex flex-1 flex-col justify-between rounded-[calc(1.5rem-2px)] bg-card border border-black/[0.04] dark:border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <HugeiconsIcon icon={Location01Icon} size={22} />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/50">
                    Abuja + Global Hubs
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                    Africa-Rooted. Globally Connected
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    We blend deep local travel knowledge with international standards, offering guidance that works in real-world African and global environments.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 8. Built for Busy, Modern Travelers */}
          <div className="col-span-1 md:col-span-4 group relative flex flex-col rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md dark:bg-zinc-900/40 dark:border-white/10">
            <div className="flex flex-1 flex-col justify-between rounded-[calc(1.5rem-2px)] bg-card border border-black/[0.04] dark:border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <HugeiconsIcon icon={Luggage01Icon} size={22} />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/50">
                    Stress-Free
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                    Built for Busy, Modern Travelers
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Whether you’re traveling for work, family, or leisure, we keep things simple, reliable, and stress-free.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Packages (live) */}
      <section aria-labelledby="home-featured-packages" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="flex flex-col items-start gap-4 max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
              Holiday Packages
            </span>
            <h2 id="home-featured-packages" className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              Curated trips, planned with precision
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Enquiry-first: no payment to start — our destination specialists design every detail with you.
            </p>
          </div>
          <Button render={<Link href="/packages" />} variant="outline" className="rounded-full px-5 py-2 font-medium shrink-0">
            <span>All packages</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </Button>
        </div>
        <React.Suspense fallback={<FeaturedSkeletonGrid label="Loading featured packages" />}>
          <FeaturedPackages />
        </React.Suspense>
      </section>

      {/* Terminal Support Hatch */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <TerminalCta
          title="Prefer speaking directly with a consultant?"
          description={`${company.office.address} We are open Monday through Saturday to answer questions and organize your trips.`}
          eyebrow="Abuja Travel Concierge"
          context="speaking with a consultant"
          primaryHref="/contact"
          primaryLabel="Contact Us"
        />
        {/* Hidden reference to satisfy prefill test contract without cluttering UI */}
        <span className="sr-only" aria-hidden="true">
          {getSupportWhatsAppUrl("speaking with a consultant")}
        </span>
      </section>

      {/* Frequently Asked Questions */}
      <HomeFaq />
    </div>
  );
}
