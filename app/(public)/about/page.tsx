import Link from "next/link"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Building01Icon,
  Luggage01Icon,
  Passport01Icon,
  Car01Icon,
  SecurityCheckIcon,
  Call02Icon,
  Message01Icon,
  Location01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { company, getSupportWhatsAppUrl } from "@/lib/content/company"
import { contact } from "@/lib/content/contact"
import { canonicalUrl, getSiteUrl, organizationJsonLd } from "@/lib/seo"

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const title = `About ${company.brandName} — Book Travel, Get Real Help`
  const description = `${company.positioning} ${company.promise}`
  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    alternates: { canonical: canonicalUrl("/about") },
    openGraph: {
      title,
      description,
      url: canonicalUrl("/about"),
      siteName: company.brandName,
      locale: "en_NG",
      type: "website",
    },
  }
}

const SERVICES = [
  // Self-service booking for flights/hotels/cars lands in Phases 3–5, so
  // those tiles hatch to Contact (a specialist) instead of an unbuilt route.
  // Packages/visa link to their canonical Phase 2 listings.
  {
    title: "Flight bookings",
    href: "/contact",
    icon: Airplane01Icon,
    live: false,
  },
  {
    title: "Hotel reservations",
    href: "/contact",
    icon: Building01Icon,
    live: false,
  },
  {
    title: "Holiday packages",
    href: "/packages",
    icon: Luggage01Icon,
    live: true,
  },
  { title: "Visa assistance", href: "/visa", icon: Passport01Icon, live: true },
  {
    title: "Car rentals & transfers",
    href: "/contact",
    icon: Car01Icon,
    live: false,
  },
]

const REASONS = [
  {
    title: "Less travel stress",
    description:
      "Transparent pricing in Naira with no hidden checkout surprises.",
  },
  {
    title: "Real human support",
    description:
      "Specialists reachable on WhatsApp, phone, and email — wherever you are.",
  },
  {
    title: "Clear, guided booking",
    description:
      "Guest checkout everywhere — never forced to create an account.",
  },
  {
    title: "Everything in one place",
    description:
      "Flights, stays, packages, visas, and transfers planned together.",
  },
]

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-16 pb-20 md:gap-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd()),
        }}
      />

      {/* 1. Hero */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 md:pt-20 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="text-xs font-semibold tracking-wider text-primary uppercase">
            About {company.brandName}
          </span>
          <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-foreground sm:text-5xl">
            Travel with people who take your trip personally.
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {company.positioning}
          </p>
        </div>
      </section>

      {/* 2. Who Alphaa is */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Who Alphaa is
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            {company.legalName} is an assisted-service travel platform. We
            combine modern self-service booking with dedicated human specialists
            — so you get the speed of technology and the reassurance of people
            who answer.
          </p>
        </div>
      </section>

      {/* 3. What we help you do */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            What we help you do
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-bold text-foreground">
                Book it yourself
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Search and pay for flights, hotels, and vehicle rentals as a
                guest — no account needed, confirmation with a verified
                reference.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-bold text-foreground">
                Plan it with us
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Send a no-payment Enquiry for holiday packages or start a Visa
                Consultation, and a travel specialist designs the journey with
                you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Services */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Services
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {SERVICES.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <HugeiconsIcon
                  icon={service.icon}
                  size={20}
                  aria-hidden="true"
                />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-foreground">
                  {service.title}
                </span>
                {!service.live && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Via specialist for now
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Why customers choose Alphaa */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Why customers choose Alphaa
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((reason) => (
            <div
              key={reason.title}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5"
            >
              <HugeiconsIcon
                icon={SecurityCheckIcon}
                size={20}
                className="text-primary"
                aria-hidden="true"
              />
              <h3 className="text-sm font-bold text-foreground">
                {reason.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Human support philosophy */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Human support, close by
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            {company.promise} Every booking page carries a support escape hatch:
            WhatsApp, phone, or email — {contact.hours.label}. If you ever feel
            stuck, a real person picks up the journey with you.
          </p>
        </div>
      </section>

      {/* 7. Abuja office */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-8 sm:p-12">
          <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
            <HugeiconsIcon icon={Location01Icon} size={16} aria-hidden="true" />
            {company.office.label}
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Abuja office
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {company.office.address}
          </p>
          <p className="text-xs text-muted-foreground">
            {company.phone.display} · {company.email}
          </p>
          <div>
            <Button render={<Link href="/contact" />} variant="outline">
              <span>Contact & directions</span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>
      </section>

      {/* 8. CTA */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-secondary p-8 sm:p-12 md:flex-row md:items-center">
          <div className="flex max-w-xl flex-col gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready when you are.
            </h2>
            <p className="text-sm leading-relaxed text-white/80">
              Browse trips or start with a conversation — either way, Alphaa
              makes it easier.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
            <Button
              render={
                <a
                  href={getSupportWhatsAppUrl("planning your trip")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="justify-center"
                />
              }
              size="lg"
              className="justify-center bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={18}
                aria-hidden="true"
              />
              <span>Talk to Alphaa</span>
            </Button>
            <Button
              render={
                <a
                  href={`tel:${company.phone.e164}`}
                  className="justify-center"
                />
              }
              variant="outline"
              size="lg"
              className="justify-center border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <HugeiconsIcon icon={Call02Icon} size={18} aria-hidden="true" />
              <span>Call {company.phone.display}</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
