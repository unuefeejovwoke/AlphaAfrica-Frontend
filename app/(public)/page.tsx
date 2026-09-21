"use client";

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Airplane01Icon,
  Building01Icon,
  Luggage01Icon,
  Passport01Icon,
  Car01Icon,
  SecurityCheckIcon,
  Call02Icon,
  Message01Icon,
  Tick01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  Location01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { company } from "@/lib/content/company";

const SEARCH_TABS = [
  { id: "flights", label: "Flights", icon: Airplane01Icon, href: "/flights" },
  { id: "hotels", label: "Hotels", icon: Building01Icon, href: "/hotels" },
  { id: "packages", label: "Packages", icon: Luggage01Icon, href: "/packages" },
  { id: "visa", label: "Visa Help", icon: Passport01Icon, href: "/visa" },
  { id: "cars", label: "Car Rentals", icon: Car01Icon, href: "/car-rentals" },
] as const;

const SERVICES = [
  {
    title: "Flight Bookings",
    description: "Domestic and international routes with direct ticketing, transparent fares in NGN, and no surprise markups.",
    href: "/flights",
    icon: Airplane01Icon,
    tag: "Instant Confirmation",
  },
  {
    title: "Hotel Reservations",
    description: "Handpicked, verified properties in Abuja, Lagos, Dubai, London, and premier global leisure destinations.",
    href: "/hotels",
    icon: Building01Icon,
    tag: "Verified Stays",
  },
  {
    title: "Holiday Packages",
    description: "Tailored family vacations, honeymoons, and curated group itineraries with accommodations and activities included.",
    href: "/packages",
    icon: Luggage01Icon,
    tag: "Curated Itineraries",
  },
  {
    title: "Visa Assistance",
    description: "Step-by-step document review, embassy interview prep, and guidance from experienced travel consultants.",
    href: "/visa",
    icon: Passport01Icon,
    tag: "Human Guidance",
  },
  {
    title: "Car Rentals & Airport Transfers",
    description: "Chauffeured and self-drive vehicles with timely airport pickups at Abuja Nnamdi Azikiwe and Lagos Murtala Muhammed.",
    href: "/car-rentals",
    icon: Car01Icon,
    tag: "Reliable Chauffeur",
  },
];

const TRUST_PILLARS = [
  {
    title: "Less Travel Stress",
    description: "Transparent pricing in Nigerian Naira with no hidden checkout surcharges. What you see is what you pay.",
    icon: SecurityCheckIcon,
  },
  {
    title: "Real Human Support",
    description: "Speak directly with specialists based at our Central Business District office in Abuja via WhatsApp, call, or desk.",
    icon: Call02Icon,
  },
  {
    title: "Clear, Guided Booking",
    description: "Book seamlessly as a guest. We respect your time and never force account registration before completing a trip.",
    icon: Tick01Icon,
  },
  {
    title: "All Services in One Place",
    description: "Coordinate flights, accommodations, visas, and airport transfers together so every detail of your journey aligns.",
    icon: Location01Icon,
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = React.useState<(typeof SEARCH_TABS)[number]["id"]>("flights");

  const currentTab = SEARCH_TABS.find((t) => t.id === activeTab) ?? SEARCH_TABS[0];

  return (
    <div className="flex flex-col gap-16 md:gap-24 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-start gap-8 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <span>Alphaa Africa Platform • Abuja Assisted Service</span>
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Wherever you&apos;re going, we&apos;ve got the journey covered.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
              Abuja&apos;s premium assisted-service travel platform. Book flights, hotels, and vehicle rentals with verified ease, or speak with our human travel specialists for tailor-made holiday packages and visa guidance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Button render={<Link href="/flights" />} size="lg">
              <HugeiconsIcon icon={Airplane01Icon} size={18} />
              <span>Search Flights</span>
            </Button>
            <Button render={<Link href="/packages" />} variant="outline" size="lg">
              <span>Explore Holiday Packages</span>
            </Button>
            <a
              href={`https://wa.me/${company.whatsapp.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground/80 hover:text-primary transition-colors"
            >
              <HugeiconsIcon icon={Message01Icon} size={18} className="text-emerald-600" />
              <span>Talk to an Abuja Specialist</span>
            </a>
          </div>
        </div>

        {/* Quick Search Switcher Card */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-4 sm:p-6 w-full">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-border/80">
            {SEARCH_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shrink-0 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <HugeiconsIcon icon={tab.icon} size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Preview */}
          <div className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-background p-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HugeiconsIcon icon={Location01Icon} size={14} className="text-primary" />
                  Departure
                </span>
                <span className="text-sm font-bold text-foreground">Abuja (ABV)</span>
                <span className="text-xs text-muted-foreground">Nnamdi Azikiwe Airport</span>
              </div>

              <div className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-background p-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HugeiconsIcon icon={Location01Icon} size={14} className="text-primary" />
                  Destination
                </span>
                <span className="text-sm font-bold text-foreground">
                  {activeTab === "visa" ? "United Kingdom / UAE" : "London Heathrow (LHR)"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {activeTab === "visa" ? "Work, Study, or Tourism" : "Direct & Connecting Flights"}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-background p-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HugeiconsIcon icon={Calendar01Icon} size={14} className="text-primary" />
                  Travel Dates
                </span>
                <span className="text-sm font-bold text-foreground">Flexible Departure</span>
                <span className="text-xs text-muted-foreground">Round-trip or One-way</span>
              </div>

              <div className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-background p-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HugeiconsIcon icon={UserIcon} size={14} className="text-primary" />
                  Travellers
                </span>
                <span className="text-sm font-bold text-foreground">1 Adult, Economy</span>
                <span className="text-xs text-muted-foreground">Customizable composition</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/60">
              <span className="text-xs text-muted-foreground">
                Verified live inventory • Instant e-ticket delivery • NGN local payment with Paystack
              </span>
              <Button render={<Link href={currentTab.href} />} size="lg" className="shrink-0">
                <span>Continue to {currentTab.label}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Reassurance Banner */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Tick01Icon} size={16} className="text-primary shrink-0" />
            <span>IATA Certified Standards</span>
          </div>
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={SecurityCheckIcon} size={16} className="text-emerald-600 shrink-0" />
            <span>Paystack 256-bit Secured</span>
          </div>
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Call02Icon} size={16} className="text-primary shrink-0" />
            <span>Abuja CBD Support Office</span>
          </div>
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Tick01Icon} size={16} className="text-primary shrink-0" />
            <span>Guest Checkout Supported</span>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-3 max-w-2xl mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Comprehensive Travel Services
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            How can we help your journey?
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Choose whether to book independently through verified systems or partner with our Abuja travel specialists for end-to-end guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <HugeiconsIcon icon={service.icon} size={24} />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {service.tag}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-primary pt-4 border-t border-border/60">
                <span>Explore service</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}

          {/* Assisted Service Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-secondary/20 bg-secondary/5 p-6">
            <div className="flex flex-col gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <HugeiconsIcon icon={Call02Icon} size={24} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  Bespoke Assisted Service & Group Travel
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Managing corporate itineraries, family delegations, or complex multi-city schedules? Our senior consultants handle every detail.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 pt-4 border-t border-secondary/20">
              <a
                href={`https://wa.me/${company.whatsapp.number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <HugeiconsIcon icon={Message01Icon} size={16} />
                <span>WhatsApp Specialist</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why Alphaa Africa Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12">
          <div className="flex flex-col gap-3 max-w-2xl mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              The Alphaa Advantage
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Why travellers rely on Alphaa Africa
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              We eliminate the friction and guesswork of travel booking by pairing modern automated reservation engines with dedicated local humans in Abuja.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {TRUST_PILLARS.map((pillar) => (
              <div key={pillar.title} className="flex flex-col gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={pillar.icon} size={20} />
                </div>
                <h3 className="text-base font-bold text-foreground">{pillar.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Office & Assistance Callout */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 rounded-3xl bg-secondary p-8 sm:p-12 text-secondary-foreground">
          <div className="flex flex-col gap-3 max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Visit or Call Our Abuja Office
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Prefer speaking directly with a consultant?
            </h2>
            <p className="text-sm text-white/80 leading-relaxed">
              {company.office.address} We are open Monday through Saturday to answer questions and organize your trips.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <Button
              render={
                <a
                  href={`https://wa.me/${company.whatsapp.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 justify-center"
            >
              <HugeiconsIcon icon={Message01Icon} size={18} />
              <span>Chat on WhatsApp</span>
            </Button>
            <Button
              render={<a href={`tel:${company.phone.e164}`} />}
              variant="outline"
              size="lg"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white justify-center"
            >
              <HugeiconsIcon icon={Call02Icon} size={18} />
              <span>Call {company.phone.display}</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
