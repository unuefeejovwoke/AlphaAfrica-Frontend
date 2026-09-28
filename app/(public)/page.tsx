import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Clock01Icon,
  GlobeIcon,
  HeadphonesIcon,
  Luggage01Icon,
  SecurityCheckIcon,
  SparklesIcon,
  TicketCheckIcon,
  TravelBagIcon,
  UserIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { CardSkeleton } from "@/components/ui/skeleton"
import { HomeSearchSwitcher } from "@/components/home/home-search-switcher"
import { FeaturedPackages } from "@/components/home/featured-packages"
import { HomeTestimonials } from "@/components/home/home-testimonials"
import { HomeFaq } from "@/components/home/home-faq"
import { TerminalCta } from "@/components/shared/terminal-cta"
import { company, getSupportWhatsAppUrl } from "@/lib/content/company"
import { stats } from "@/lib/content/stats"
import {
  canonicalUrl,
  getSiteUrl,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo"

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

/**
 * "Why Choose Alphaa.Africa?" reasons — the seven value propositions
 * published on alphaaafrica.com, copied verbatim.
 */
const WHY_CHOOSE_REASONS = [
  {
    id: "e-ticket",
    icon: TicketCheckIcon,
    title: "Rapid E-Ticket Delivery",
    description:
      "Confirmed bookings are processed immediately, with official e-tickets and PNR boarding documents delivered straight to your inbox.",
  },
  {
    id: "hassle-free",
    icon: Clock01Icon,
    title: "Fast, Hassle-Free Bookings",
    description:
      "We find the best routes and fares quickly—so you spend less time searching and more time traveling.",
  },
  {
    id: "real-time-pricing",
    icon: Wallet01Icon,
    title: "Real-Time Pricing",
    description:
      "Live access to airline and travel inventories ensures transparent pricing, eliminating last-minute fare changes or hidden charges.",
  },
  {
    id: "advisory",
    icon: SecurityCheckIcon,
    title: "Expert Travel Advisory",
    description:
      "Every trip is guided by experienced travel consultants who validate routes, fares, visa requirements, and travel conditions.",
  },
  {
    id: "support",
    icon: HeadphonesIcon,
    title: "24/7 Human Support",
    description:
      "Enjoy responsive assistance for rebookings, cancellations, rerouting, and urgent travel needs—handled by real professionals, not automated responses.",
  },
  {
    id: "africa-rooted",
    icon: GlobeIcon,
    title: "Africa-Rooted. Globally Connected",
    description:
      "We blend deep local travel knowledge with international standards, offering guidance that works in real-world African and global environments.",
  },
  {
    id: "busy-travelers",
    icon: TravelBagIcon,
    title: "Built for Busy, Modern Travelers",
    description:
      "Whether you’re traveling for work, family, or leisure, we keep things simple, reliable, and stress-free.",
  },
]

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
          __html: JSON.stringify(organizationJsonLd()),
        }}
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

        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-start gap-5 px-4 pt-24 pb-36 text-left sm:gap-6 sm:px-6 sm:pt-32 lg:px-8 lg:pt-40">
          <div className="flex max-w-3xl flex-col gap-3">
            <h1 className="text-3xl leading-[1.15] font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Travel Beyond <span className="text-primary">Borders</span>
            </h1>
            <h2 className="max-w-2xl text-base leading-relaxed font-semibold text-white/90 sm:text-lg">
              Get the Best Flight Deals, Best Hotels, Curated Holidays with the
              world&apos;s Most Trusted Travel Experts.
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              From local trips to global journeys, Alphaa Africa Travels and
              Tours offers the best and cheapest travel deals with stress-free
              planning and expert support every step of the way.
            </p>
          </div>

          {/* Trust strip — claims published on alphaaafrica.com */}
          <div className="inline-flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-white/80 sm:gap-x-4 sm:text-sm">
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

      {/* Search & Reassurance Section */}
      <section className="relative z-20 mx-auto -mt-[188px] w-full max-w-7xl px-4 sm:px-6 md:-mt-[216px] lg:px-8">
        <div id="trip-search" className="scroll-mt-24">
          <HomeSearchSwitcher />
        </div>
      </section>

      {/* Why Choose Alphaa.Africa Section */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex max-w-3xl flex-col items-start gap-3 sm:mb-12">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Why Choose{" "}
            <span className="font-normal text-primary italic">
              Alphaa.Africa?
            </span>
          </h2>
          <span
            className="h-0.5 w-16 rounded-full bg-primary"
            aria-hidden="true"
          />
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-12">
          {/* 1. Everything in one place */}
          <div className="group relative col-span-1 flex flex-col rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md sm:p-2 md:col-span-4">
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
          <div className="group relative col-span-1 flex flex-col rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md sm:p-2 md:col-span-4">
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
          <div className="group relative col-span-1 flex flex-col rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md sm:p-2 md:col-span-4">
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
          <div className="group relative col-span-1 flex flex-col rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md sm:p-2 md:col-span-7 lg:col-span-8">
            <div className="relative flex min-h-[360px] flex-1 flex-col justify-between overflow-hidden rounded-[calc(1.5rem-2px)] border border-white/20 p-6 text-white shadow-xl sm:min-h-[400px] sm:p-8">
              <Image
                src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=85"
                alt="Turquoise ocean and white sand beach"
                fill
                sizes="(max-width: 768px) 100vw, 66vw"
                className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
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
          <div className="group relative col-span-1 flex flex-col rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md sm:p-2 md:col-span-5 lg:col-span-4">
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
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex max-w-2xl flex-col items-start gap-4">
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
          <Button
            render={<Link href="/packages" />}
            variant="outline"
            className="shrink-0 rounded-full px-5 py-2 font-medium"
          >
            <span>See all packages</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </Button>
        </div>
        <React.Suspense
          fallback={<FeaturedSkeletonGrid label="Loading featured packages" />}
        >
          <FeaturedPackages />
        </React.Suspense>
      </section>

      {/* Verified Customer Testimonials Slider */}
      <HomeTestimonials />

      {/* Terminal Support Hatch */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <TerminalCta
          title="Not sure where to start?"
          description="Tell us where you're going and when. We'll sort out the flights, hotel, visa, or car — and answer anything you're unsure about."
          eyebrow="Talk to a person"
          context="travel planning"
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
