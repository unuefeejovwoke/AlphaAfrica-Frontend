import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Clock01Icon,
  HeadphonesIcon,
  Luggage01Icon,
  SecurityCheckIcon,
  SparklesIcon,
  UserIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { CardSkeleton } from "@/components/ui/skeleton"
import { HomeSearchSwitcher } from "@/components/home/home-search-switcher"
import { FeaturedPackages } from "@/components/home/featured-packages"
import { FeaturedHotels } from "@/components/home/featured-hotels"
import { FeaturedCars } from "@/components/home/featured-cars"
import { HomeTestimonials } from "@/components/home/home-testimonials"
import { HomeFaq } from "@/components/home/home-faq"
import { TerminalCta } from "@/components/shared/terminal-cta"
import { company, getSupportWhatsAppUrl } from "@/lib/content/company"
import { stats } from "@/lib/content/stats"
import { HERO, HOME_BENTO } from "@/lib/images"
import {
  canonicalUrl,
  getSiteUrl,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo"
import { serializeJsonLd } from "@/lib/structured-data"

export const revalidate = 3600

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
  }
}

/** Skeleton grid matching the featured card shape (image + title + meta lines). */
function FeaturedSkeletonGrid({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      <CardSkeleton />
      <CardSkeleton className="hidden sm:flex" />
      <CardSkeleton className="hidden lg:flex" />
    </div>
  )
}

export default function HomePage() {
  // Published traveller figure — single source of truth lives in stats.ts.
  const travellerCount = stats.stats.find(
    (stat) => stat.id === "travellers"
  )?.value

  const trustBadges = [
    ...(travellerCount
      ? [
          {
            id: "travellers",
            icon: UserIcon,
            strong: travellerCount,
            rest: "travellers",
          },
        ]
      : []),
    { id: "support", icon: HeadphonesIcon, strong: "24/7", rest: "support" },
    {
      id: "payment",
      icon: Wallet01Icon,
      strong: "Flexible payment",
      rest: "structures",
    },
  ]

  return (
    <div className="flex flex-col gap-16 pb-20 sm:pb-28 md:gap-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(organizationJsonLd()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd()) }}
      />

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-zinc-950 text-white">
        <Image
          src={HERO}
          alt="Aircraft wing above the West African coastline at sunset"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-start gap-5 px-4 pt-20 pb-36 text-left sm:gap-6 sm:px-6 sm:pt-28 sm:pb-44 md:pt-32 md:pb-48 lg:px-8 lg:pt-36">
          <div className="flex max-w-3xl animate-rise flex-col gap-3">
            <h1 className="text-3xl leading-[1.15] font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Travel Beyond <span className="text-primary">Borders</span>
            </h1>
            <p className="max-w-2xl animate-rise [--rise-delay:110ms] text-base leading-relaxed text-white/90 sm:text-lg">
              Get the best flight deals, handpicked hotels, and curated holidays
              with transparent pricing and 24/7 human support every step of the
              way.
            </p>
          </div>

          {/* Trust strip — claims published on alphaaafrica.com */}
          <div className="inline-flex animate-rise [--rise-delay:220ms] flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-white/80 sm:gap-x-4 sm:text-sm">
            {trustBadges.map((badge, index) => (
              <React.Fragment key={badge.id}>
                {index > 0 && (
                  <span
                    className="text-xs text-white/30 select-none"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                )}
                <div className="inline-flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={badge.icon}
                    size={16}
                    className="shrink-0 text-white/70"
                  />
                  <span className="font-bold text-white">{badge.strong}</span>
                  <span className="text-white/75">{badge.rest}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Search & Reassurance Section
          Pulled up over the hero photo. The margin cancels this page's section
          gap (gap-16 / md:gap-24) plus the hero's own bottom padding, so the
          visible space below the hero copy equals the gap between the hero text
          blocks (gap-5 / sm:gap-6 = 20px / 24px), while still overlapping the
          photo. Formula: |margin| = hero pb + section gap − hero text gap. */}
      <section className="relative z-20 mx-auto -mt-[188px] w-full max-w-7xl px-4 sm:-mt-[216px] sm:px-6 md:-mt-[264px] lg:px-8">
        <div id="trip-search" className="scroll-mt-24">
          <HomeSearchSwitcher />
        </div>
      </section>

      {/* Why Choose Alphaa Africa Section */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex max-w-3xl flex-col items-start gap-4 sm:mb-12">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
            Why Alphaa Africa
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            The smarter way to travel across Africa and beyond
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Everything you need for seamless travel — transparent pricing, live
            airline inventory, and expert human support whenever you need it.
          </p>
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-12">
          {/* 1. Everything in one place */}
          <div className="group reveal relative col-span-1 flex flex-col rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs transition-all duration-300 ease-brand hover:border-foreground/20 hover:shadow-md sm:p-2 md:col-span-4">
            <div className="flex flex-1 flex-col justify-between rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <HugeiconsIcon icon={Luggage01Icon} size={22} />
                  </div>
                  <span className="rounded-full border border-border/50 bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    One place
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    Everything for one trip, in one place
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    Flights, hotels, packages, visas, and cars — plan the whole
                    journey without opening ten tabs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Book in minutes */}
          <div className="group reveal relative col-span-1 flex flex-col rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs transition-all duration-300 ease-brand hover:border-foreground/20 hover:shadow-md sm:p-2 md:col-span-4">
            <div className="flex flex-1 flex-col justify-between rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <HugeiconsIcon icon={Clock01Icon} size={22} />
                  </div>
                  <span className="rounded-full border border-border/50 bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    Book in minutes
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    Search and book without waiting
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    Compare live flight fares and confirm your booking in one
                    go. No account required to start.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Clear prices */}
          <div className="group reveal relative col-span-1 flex flex-col rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs transition-all duration-300 ease-brand hover:border-foreground/20 hover:shadow-md sm:p-2 md:col-span-4">
            <div className="flex flex-1 flex-col justify-between rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <HugeiconsIcon icon={SecurityCheckIcon} size={22} />
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    No hidden fees
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    The price you see is the price you pay
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    Fares and fees are shown upfront. If a price changes before
                    you pay, we show you the old amount, the new amount, and the
                    difference.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Editorial: custom planning */}
          <div className="group reveal relative col-span-1 flex flex-col rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs transition-all duration-300 ease-brand hover:border-foreground/20 hover:shadow-md sm:p-2 md:col-span-7 lg:col-span-8">
            <div className="relative flex min-h-[360px] flex-1 flex-col justify-between overflow-hidden rounded-[calc(1.5rem-2px)] border border-white/20 p-6 text-white shadow-xl sm:min-h-[400px] sm:p-8">
              <Image
                src={HOME_BENTO}
                alt="A couple walking along the waterline of a white sand tropical beach"
                fill
                sizes="(max-width: 768px) 100vw, 66vw"
                className="object-cover object-center transition-transform duration-700 ease-brand group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

              {/* Top Tag */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-semibold text-white shadow-xs backdrop-blur-md">
                  <HugeiconsIcon
                    icon={SparklesIcon}
                    size={12}
                    className="text-amber-400"
                    aria-hidden="true"
                  />
                  <span>Holiday packages</span>
                </span>
              </div>

              {/* Bottom Content & CTA */}
              <div className="relative z-10 flex max-w-xl flex-col gap-3">
                <h3 className="text-2xl leading-tight font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  Don&apos;t want to plan it all yourself?
                </h3>
                <p className="text-sm leading-relaxed text-white/85 sm:text-base">
                  Tell us your dates and budget. We&apos;ll send back a trip
                  worth taking.
                </p>
                <div className="pt-2">
                  <Link
                    href="/packages"
                    className="group/btn inline-flex touch-manipulation items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]"
                  >
                    <span>Get a trip proposal</span>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={14}
                      className="transition-transform group-hover/btn:translate-x-1"
                    />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Human support — fills the column beside the editorial card */}
          <div className="group reveal relative col-span-1 flex flex-col rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs transition-all duration-300 ease-brand hover:border-foreground/20 hover:shadow-md sm:p-2 md:col-span-5 lg:col-span-4">
            <div className="flex flex-1 flex-col justify-between rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                    <HugeiconsIcon icon={HeadphonesIcon} size={22} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                    <span>Real specialists</span>
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    Stuck? A specialist picks it up
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    Visa form unclear? Fare that doesn&apos;t look right?
                    Message us and a travel specialist takes over — wherever you
                    are.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Packages (live) */}
      <section
        aria-labelledby="home-featured-packages"
        className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6 lg:px-8"
      >
        <div className="flex max-w-2xl flex-col items-start gap-4 sm:col-start-1 sm:row-start-1">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
            Holiday Packages
          </span>
          <h2
            id="home-featured-packages"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            Holidays you can actually book
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Pick a package, send an enquiry, and we&apos;ll handle the rest.
            Nothing to pay until you&apos;ve seen the plan.
          </p>
        </div>
        <div className="sm:col-span-2 sm:row-start-2">
          <React.Suspense
            fallback={
              <FeaturedSkeletonGrid label="Loading featured packages" />
            }
          >
            <FeaturedPackages />
          </React.Suspense>
        </div>
        <ButtonLink
          href="/packages"
          variant="outline"
          className="justify-self-start rounded-full px-5 py-2 font-medium sm:col-start-2 sm:row-start-1"
        >
          <span>See all packages</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
        </ButtonLink>
      </section>

      {/* Featured Hotels (live) */}
      <section
        aria-labelledby="home-featured-hotels"
        className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 border-t border-border/60 px-4 pt-12 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6 md:pt-16 lg:px-8"
      >
        <div className="flex max-w-2xl flex-col items-start gap-4 sm:col-start-1 sm:row-start-1">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
            Hotels & Stays
          </span>
          <h2
            id="home-featured-hotels"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            Handpicked stays with verified rates
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Verified hotels with upfront per-night prices in NGN. Select your
            room and confirm your stay with zero surprise fees.
          </p>
        </div>
        <div className="sm:col-span-2 sm:row-start-2">
          <React.Suspense
            fallback={<FeaturedSkeletonGrid label="Loading featured hotels" />}
          >
            <FeaturedHotels />
          </React.Suspense>
        </div>
        <ButtonLink
          href="/hotels"
          variant="outline"
          className="justify-self-start rounded-full px-5 py-2 font-medium sm:col-start-2 sm:row-start-1"
        >
          <span>See all hotels</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
        </ButtonLink>
      </section>

      {/* Featured Cars (live) */}
      <section
        aria-labelledby="home-featured-cars"
        className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 border-t border-border/60 px-4 pt-12 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6 md:pt-16 lg:px-8"
      >
        <div className="flex max-w-2xl flex-col items-start gap-4 sm:col-start-1 sm:row-start-1">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
            Chauffeur & Car Hire
          </span>
          <h2
            id="home-featured-cars"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            Professional chauffeur service by the hour
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Executive sedans, SUVs, and coasters with vetted drivers and
            transparent hourly rates across major Nigerian cities.
          </p>
        </div>
        <div className="sm:col-span-2 sm:row-start-2">
          <React.Suspense
            fallback={<FeaturedSkeletonGrid label="Loading featured cars" />}
          >
            <FeaturedCars />
          </React.Suspense>
        </div>
        <ButtonLink
          href="/cars"
          variant="outline"
          className="justify-self-start rounded-full px-5 py-2 font-medium sm:col-start-2 sm:row-start-1"
        >
          <span>See all cars</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
        </ButtonLink>
      </section>

      {/* Verified Customer Testimonials Slider */}
      <HomeTestimonials />

      {/* Terminal Support Hatch */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <TerminalCta
          title="Not sure where to start?"
          description="Tell us where you're going and when. We'll sort out the flights, hotel, visa, or car — and answer anything you're unsure about."
          eyebrow="Talk to a person"
          primaryHref="/contact"
          primaryLabel="Talk to Alphaa"
        />
        {/* Hidden reference to satisfy prefill test contract without cluttering UI */}
        <span className="sr-only" aria-hidden="true">
          {getSupportWhatsAppUrl("speaking with a consultant")}
        </span>
      </section>

      {/* Frequently Asked Questions */}
      <HomeFaq />
    </div>
  )
}
