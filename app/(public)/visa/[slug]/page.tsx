import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Clock01Icon,
  Tick01Icon,
  Message01Icon,
  ArrowRight01Icon,
  Passport01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { RetryButton } from "@/components/home/retry-button";
import { VisaConsultationForm } from "@/components/visa/visa-consultation-form";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { TrackLink } from "@/components/analytics/track-link";
import { getVisaCountries, getVisaCountryDetail, TRAVEL_PURPOSE_LABELS } from "@/lib/api/visa";
import { ApiError } from "@/lib/api/client";
import { formatNaira } from "@/lib/format";
import { canonicalUrl, faqPageJsonLd, getSiteUrl, organizationJsonLd } from "@/lib/seo";
import { humanizeSlug, resolveListingImageUrl, visaCountryDetailJsonLd } from "@/lib/listings";
import { getSupportWhatsAppUrl } from "@/lib/content/company";
import { faqs } from "@/lib/content/faqs";

export const revalidate = 3600;
export const dynamicParams = true;

type DetailParams = { slug: string };

export async function generateStaticParams(): Promise<DetailParams[]> {
  try {
    const page = await getVisaCountries();
    return page.results.map((country) => ({ slug: country.slug }));
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
  const url = canonicalUrl(`/visa/${slug}`);
  try {
    const country = await getVisaCountryDetail(slug);
    const description =
      country.description.length > 0
        ? country.description.slice(0, 155)
        : `${country.name} visa consultation — ${formatNaira(country.consultation_fee)} fee with human guidance from Alphaa Africa.`;
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
    };
  } catch {
    const name = humanizeSlug(slug);
    return {
      metadataBase: new URL(getSiteUrl()),
      title: `${name} Visa Assistance | Alphaa Africa`,
      description: `Paid visa consultation for ${name} with human guidance from Alphaa Africa.`,
      alternates: { canonical: url },
    };
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
] as const;

/**
 * `/visa/[slug]` (RSC, ISR 3600): the 9 PRD §8.7 sections — country hero,
 * assistance overview, consultation fee, processing time, who this service
 * is for, what Alphaa helps with, inline Consultation form, FAQ, and a
 * human support CTA — with Service + FAQPage JSON-LD.
 */
export default async function VisaCountryDetailPage({
  params,
}: {
  params: Promise<DetailParams>;
}) {
  const { slug } = await params;

  let country;
  try {
    country = await getVisaCountryDetail(slug);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not-found") notFound();
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-12 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load this visa country right now."
        />
        <RetryButton label="Retry loading visa country" />
      </div>
    );
  }

  const visaFaqGroup = faqs.groups.find((group) => group.id === "visa");
  const jsonLd = visaCountryDetailJsonLd({
    name: country.name,
    slug: country.slug,
    consultation_fee: country.consultation_fee,
    processing_time: country.processing_time,
    flag_image: country.flag_image,
    description: country.description,
  });
  const faqJsonLd = visaFaqGroup ? faqPageJsonLd([visaFaqGroup]) : null;

  const purposes = Object.values(TRAVEL_PURPOSE_LABELS);
  const overview =
    country.description.length > 0
      ? country.description
      : `Planning a trip to ${country.name}? Start with a paid consultation: a specialist reviews your documents, walks you through the process, and prepares you for the interview. The embassy makes the final decision — we make sure your application is as strong as it can be.`;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-12 sm:px-6 md:gap-16 lg:px-8">
      <ViewTracker event="visa_country_viewed" props={{ slug: country.slug }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}

      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/visa" className="font-medium hover:text-primary hover:underline">
          Visa Assistance
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="truncate font-semibold text-foreground">
          {country.name}
        </span>
      </nav>

      {/* 1. Country hero */}
      <section aria-labelledby="visa-heading" className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="relative">
          <img
            src={resolveListingImageUrl(country.flag_image)}
            alt={`Flag of ${country.name} — visa consultation`}
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
              <HugeiconsIcon icon={Passport01Icon} size={14} aria-hidden="true" />
              Visa consultation
            </span>
            <h1 id="visa-heading" className="text-3xl font-extrabold tracking-tight text-balance text-white sm:text-5xl">
              {country.name}
            </h1>
            <p className="text-sm font-medium text-white/85">
              Consultation fee{" "}
              <span className="font-semibold text-white">{formatNaira(country.consultation_fee)}</span>
              {country.processing_time && (
                <>
                  {" "}· Processing: <span className="font-semibold text-white">{country.processing_time}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* 2–4. Overview, fee, processing */}
      <section aria-labelledby="visa-overview-heading" className="flex max-w-3xl flex-col gap-4">
        <h2 id="visa-overview-heading" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Visa assistance overview
        </h2>
        <p className="text-sm leading-relaxed break-words text-muted-foreground md:text-base">
          {overview}
        </p>
        <dl className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
          <div className="flex items-start gap-2.5">
            <HugeiconsIcon icon={Tick01Icon} size={18} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
            <div className="flex flex-col">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Consultation fee
              </dt>
              <dd className="text-sm font-bold text-foreground">{formatNaira(country.consultation_fee)}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <HugeiconsIcon icon={Clock01Icon} size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex flex-col">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Processing time
              </dt>
              <dd className="text-sm font-bold text-foreground">
                {country.processing_time || "Confirmed during consultation"}
              </dd>
            </div>
          </div>
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-10">
          {/* 5. Who this service is for */}
          <section aria-labelledby="visa-who-heading">
            <h2 id="visa-who-heading" className="text-2xl font-bold tracking-tight text-foreground">
              Who this service is for
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Whatever brings you to {country.name}, start with a consultation and a
              specialist will tailor the guidance to your purpose of travel.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {purposes.map((purpose) => (
                <li
                  key={purpose}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground"
                >
                  {purpose}
                </li>
              ))}
            </ul>
          </section>

          {/* 6. What Alphaa helps with */}
          <section aria-labelledby="visa-help-heading">
            <h2 id="visa-help-heading" className="text-2xl font-bold tracking-tight text-foreground">
              What Alphaa helps with
            </h2>
            <ol className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {WHAT_ALPHAA_HELPS_WITH.map((item, index) => (
                <li key={item.title} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
                  <span className="font-variant-numeric text-xs font-bold tabular-nums text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* 8. FAQ */}
          {visaFaqGroup && visaFaqGroup.faqs.length > 0 && (
            <section aria-labelledby="visa-faq-heading">
              <h2 id="visa-faq-heading" className="text-2xl font-bold tracking-tight text-foreground">
                {country.name} visa questions
              </h2>
              <div className="mt-4 flex flex-col divide-y divide-border/60 rounded-2xl border border-border bg-card">
                {visaFaqGroup.faqs.map((faq) => (
                  <article key={faq.id} className="flex flex-col gap-2 p-5 sm:p-6">
                    <h3 className="text-sm font-bold text-foreground">{faq.question}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{faq.answer}</p>
                  </article>
                ))}
              </div>
              <Link
                href="/faq#faq-visa"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <span>Read all visa FAQs</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} aria-hidden="true" />
              </Link>
            </section>
          )}
        </div>

        {/* 7. Consultation form (sticky on desktop) */}
        <aside aria-label="Visa consultation" className="min-w-0">
          <div id="consultation" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
            <VisaConsultationForm
              countryId={country.id}
              countryName={country.name}
              countrySlug={country.slug}
              consultationFee={country.consultation_fee}
            />
          </div>
        </aside>
      </div>

      {/* 9. Human support CTA */}
      <section
        aria-labelledby="visa-support-heading"
        className="rounded-3xl bg-secondary p-8 text-secondary-foreground sm:p-12"
      >
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 id="visa-support-heading" className="text-2xl font-bold tracking-tight text-balance text-white">
              Prefer to talk it through first?
            </h2>
            <p className="text-sm leading-relaxed text-white/80">
              Not sure what visa support you need? Start with a conversation — a
              specialist will point you at the right next step for {country.name}.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{ context: `a ${country.name} visa consultation` }}
                  href={getSupportWhatsAppUrl(`a ${country.name} visa consultation`)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              size="lg"
              className="justify-center bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <HugeiconsIcon icon={Message01Icon} size={18} aria-hidden="true" />
              <span>Chat on WhatsApp</span>
            </Button>
            <Button
              render={<Link href="/visa" />}
              variant="outline"
              size="lg"
              className="justify-center border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <span>Compare countries</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
