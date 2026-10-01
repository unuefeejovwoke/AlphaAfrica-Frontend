import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Clock01Icon,
  Tick01Icon,
  Message01Icon,
  ArrowRight01Icon,
  Passport01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { ButtonLink, buttonVariants } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import { RetryButton } from "@/components/home/retry-button"
import { VisaConsultationForm } from "@/components/visa/visa-consultation-form"
import {
  VisaShareButton,
  VisaMobileBar,
  StartConsultationButton,
} from "@/components/visa/visa-detail-client"
import { ViewTracker } from "@/components/analytics/view-tracker"
import { TrackLink } from "@/components/analytics/track-link"
import {
  getVisaCountries,
  getVisaCountryDetail,
  TRAVEL_PURPOSE_LABELS,
} from "@/lib/api/visa"
import { ApiError } from "@/lib/api/client"
import { formatNaira } from "@/lib/format"
import {
  canonicalUrl,
  faqPageJsonLd,
  getSiteUrl,
  organizationJsonLd,
} from "@/lib/seo"
import {
  humanizeSlug,
  resolveListingImageUrl,
  visaCountryDetailJsonLd,
} from "@/lib/listings"
import { serializeJsonLd } from "@/lib/structured-data"
import { getSupportWhatsAppUrl } from "@/lib/content/company"
import { faqs } from "@/lib/content/faqs"
import { cn } from "@/lib/utils"

export const revalidate = 3600
export const dynamicParams = true

type DetailParams = { slug: string }

export async function generateStaticParams(): Promise<DetailParams[]> {
  try {
    const page = await getVisaCountries()
    return page.results.map((country) => ({ slug: country.slug }))
  } catch {
    // Backend may be unreachable at build time; ISR + dynamicParams
    // still renders new slugs on demand at runtime.
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<DetailParams>
}): Promise<Metadata> {
  const { slug } = await params
  const url = canonicalUrl(`/visa/${slug}`)
  try {
    const country = await getVisaCountryDetail(slug)
    const description =
      country.description.length > 0
        ? country.description.slice(0, 155)
        : `${country.name} visa consultation — ${formatNaira(country.consultation_fee)} fee with human guidance from Alphaa Africa.`
    return {
      metadataBase: new URL(getSiteUrl()),
      title: `${country.name} Visa Assistance | Alphaa Africa`,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: `${country.name} Visa Assistance | Alphaa Africa`,
        description,
        url,
        siteName: "Alphaa Africa",
        locale: "en_NG",
        type: "website",
        images: [
          {
            url: resolveListingImageUrl(country.flag_image),
            alt: `Flag of ${country.name} — visa consultation`,
          },
        ],
      },
    }
  } catch {
    const name = humanizeSlug(slug)
    return {
      metadataBase: new URL(getSiteUrl()),
      title: `${name} Visa Assistance | Alphaa Africa`,
      description: `Paid visa consultation for ${name} with human guidance from Alphaa Africa.`,
      alternates: { canonical: url },
    }
  }
}

const WHAT_ALPHAA_HELPS_WITH = [
  {
    title: "Document review",
    body: "A specialist checks your supporting documents against the requirements for your purpose of travel before anything is submitted.",
  },
  {
    title: "Process walkthrough",
    body: "Know each step, timeline, and fee up front — no guessing what happens after payment.",
  },
  {
    title: "Interview preparation",
    body: "Practice the questions consular officers actually ask, with feedback on clear, honest answers.",
  },
] as const

/**
 * `/visa/[slug]` (RSC, ISR 3600): the 9 PRD §8.7 sections — country hero,
 * assistance overview, consultation fee, processing time, who this service
 * is for, what Alphaa helps with, Consultation form, FAQ, and a
 * human support CTA — with Service + FAQPage JSON-LD.
 *
 * Layout mirrors `/packages/[slug]` (max-w-7xl editorial flow, action bar,
 * bottom booking card, mobile bar) so both detail pages feel like one product.
 */
export default async function VisaCountryDetailPage({
  params,
}: {
  params: Promise<DetailParams>
}) {
  const { slug } = await params

  let country
  try {
    country = await getVisaCountryDetail(slug)
  } catch (error) {
    if (error instanceof ApiError && error.code === "not-found") notFound()
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load this visa country right now."
        />
        <RetryButton label="Retry loading visa country" />
      </div>
    )
  }

  const visaFaqGroup = faqs.groups.find((group) => group.id === "visa")
  const jsonLd = visaCountryDetailJsonLd({
    name: country.name,
    slug: country.slug,
    consultation_fee: country.consultation_fee,
    processing_time: country.processing_time,
    flag_image: country.flag_image,
    description: country.description,
  })
  const faqJsonLd = visaFaqGroup ? faqPageJsonLd([visaFaqGroup]) : null

  const purposes = Object.values(TRAVEL_PURPOSE_LABELS)
  const overview =
    country.description.length > 0
      ? country.description
      : `Planning a trip to ${country.name}? Start with a paid consultation: a specialist reviews your documents, walks you through the process, and prepares you for the interview. The embassy makes the final decision — we make sure your application is as strong as it can be.`

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 pb-24 sm:gap-14 sm:px-6 sm:pb-32 md:py-12 lg:px-8">
      <ViewTracker event="visa_country_viewed" props={{ slug: country.slug }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(organizationJsonLd()),
        }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        />
      )}

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
          <Link href="/visa" className="transition-colors hover:text-primary">
            Visa Assistance
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">
            /
          </span>
          <span
            aria-current="page"
            className="max-w-[200px] truncate font-semibold text-foreground sm:max-w-xs"
          >
            {country.name}
          </span>
        </nav>

        <VisaShareButton countryName={country.name} />
      </div>

      {/* 2. Hero Header: Title, Tags & Flag Showcase */}
      <section aria-labelledby="visa-heading" className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <HugeiconsIcon
                icon={Passport01Icon}
                size={14}
                aria-hidden="true"
              />
              <span>Visa consultation</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <HugeiconsIcon icon={Clock01Icon} size={13} aria-hidden="true" />
              <span>
                {country.processing_time || "Processing confirmed in call"}
              </span>
            </span>
          </div>

          <h1
            id="visa-heading"
            className="text-3xl leading-[1.15] font-extrabold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl"
          >
            {country.name}
          </h1>

          <p className="max-w-3xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {overview}
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xs">
          <img
            src={resolveListingImageUrl(country.flag_image)}
            alt={`Flag of ${country.name} — visa consultation`}
            fetchPriority="high"
            decoding="async"
            className="aspect-[16/8] w-full object-cover sm:aspect-[21/8]"
          />
        </div>
      </section>

      {/* 3. Consultation Action Bar: Fee & Immediate CTA */}
      <section aria-label="Visa consultation actions">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border/80 bg-muted/30 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Consultation fee
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {formatNaira(country.consultation_fee)}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                / consultation
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pay securely via Paystack · Specialist follows up
            </p>
          </div>

          <div className="flex w-full sm:w-auto">
            <StartConsultationButton className="h-12 w-full justify-center px-8 text-base shadow-md shadow-primary/20 sm:w-auto" />
          </div>
        </div>
      </section>

      {/* 4. Middle Content: Overview, Who-for, Help & FAQ */}
      <div className="flex flex-col gap-12 sm:gap-16">
        {/* Narrative overview */}
        <section
          aria-labelledby="visa-overview-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-primary uppercase">
              The Experience
            </span>
            <h2
              id="visa-overview-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Visa assistance overview
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <HugeiconsIcon
                icon={Tick01Icon}
                size={18}
                className="mt-0.5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Consultation fee
                </span>
                <span className="text-sm font-bold text-foreground">
                  {formatNaira(country.consultation_fee)}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <HugeiconsIcon
                icon={Clock01Icon}
                size={18}
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Processing time
                </span>
                <span className="text-sm font-bold text-foreground">
                  {country.processing_time || "Confirmed during consultation"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Who this service is for */}
        <section
          aria-labelledby="visa-who-heading"
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-primary uppercase">
              Who It Is For
            </span>
            <h2
              id="visa-who-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Who this service is for
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Whatever brings you to {country.name}, start with a consultation
              and a specialist will tailor the guidance to your purpose of
              travel.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {purposes.map((purpose, index) => (
              <div
                key={purpose}
                className="flex items-start gap-3.5 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs transition-colors hover:border-foreground/20"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-sm leading-relaxed font-medium text-foreground">
                  {purpose}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* What Alphaa helps with */}
        <section
          aria-labelledby="visa-help-heading"
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-emerald-600 uppercase">
              Transparent Support
            </span>
            <h2
              id="visa-help-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              What Alphaa helps with
            </h2>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-8">
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {WHAT_ALPHAA_HELPS_WITH.map((item) => (
                <li
                  key={item.title}
                  className="flex items-start gap-3 text-sm text-foreground"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <HugeiconsIcon
                      icon={Tick01Icon}
                      size={13}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="leading-relaxed font-bold">
                      {item.title}
                    </span>
                    <span className="text-xs leading-relaxed font-normal text-muted-foreground">
                      {item.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        {visaFaqGroup && visaFaqGroup.faqs.length > 0 && (
          <section
            aria-labelledby="visa-faq-heading"
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Good to Know
              </span>
              <h2
                id="visa-faq-heading"
                className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                {country.name} visa questions
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visaFaqGroup.faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6"
                >
                  <h3 className="flex items-start gap-2 text-sm font-bold text-foreground sm:text-base">
                    <HugeiconsIcon
                      icon={InformationCircleIcon}
                      size={18}
                      className="mt-0.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span>{faq.question}</span>
                  </h3>
                  <p className="pl-6.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href="/faq#faq-visa"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <span>Read all visa FAQs</span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={14}
                aria-hidden="true"
              />
            </Link>
          </section>
        )}
      </div>

      {/* 5. Consultation Section at the Bottom */}
      <section
        id="book-now"
        aria-label={`Start a visa consultation for ${country.name}`}
        className="scroll-mt-20 pt-6"
      >
        <div id="consultation" className="scroll-mt-20">
          <VisaConsultationForm
            countryId={country.id}
            countryName={country.name}
            countrySlug={country.slug}
            consultationFee={country.consultation_fee}
          />
        </div>
      </section>

      {/* 6. Human support CTA */}
      <section
        aria-labelledby="visa-support-heading"
        className="rounded-3xl bg-secondary p-8 text-secondary-foreground sm:p-12"
      >
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex max-w-xl flex-col gap-2">
            <h2
              id="visa-support-heading"
              className="text-2xl font-bold tracking-tight text-balance text-white"
            >
              Prefer to talk it through first?
            </h2>
            <p className="text-sm leading-relaxed text-white/80">
              Not sure what visa support you need? Start with a conversation — a
              specialist will point you at the right next step for{" "}
              {country.name}.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
            <TrackLink
              event="support_click"
              eventProps={{
                context: `a ${country.name} visa consultation`,
              }}
              href={getSupportWhatsAppUrl(
                `a ${country.name} visa consultation`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: "lg" }),
                "justify-center bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={18}
                aria-hidden="true"
              />
              <span>Chat on WhatsApp</span>
            </TrackLink>
            <ButtonLink
              href="/visa"
              variant="outline"
              size="lg"
              className="justify-center border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <span>Compare countries</span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                aria-hidden="true"
              />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* 7. Mobile Floating Action Bar */}
      <VisaMobileBar
        consultationFee={country.consultation_fee}
        countryName={country.name}
      />
    </div>
  )
}
