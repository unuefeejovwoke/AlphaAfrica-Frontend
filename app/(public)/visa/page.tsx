import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { RetryButton } from "@/components/home/retry-button";
import { VisaCountryCard } from "@/components/visa/visa-country-card";
import { TerminalCta } from "@/components/shared/terminal-cta";
import { TrackLink } from "@/components/analytics/track-link";
import { getVisaCountries } from "@/lib/api/visa";
import { canonicalUrl, getSiteUrl, organizationJsonLd } from "@/lib/seo";
import { sortFeaturedFirst, visaCountryListJsonLd } from "@/lib/listings";
import { getSupportWhatsAppUrl } from "@/lib/content/company";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const title = "Visa Assistance | Alphaa Africa";
  const description =
    "Planning to travel? Get help with the visa process. Browse countries with clear consultation fees and processing times, then start a paid consultation.";
  const url = canonicalUrl("/visa");
  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Alphaa Africa",
      locale: "en_NG",
      type: "website",
      images: [
        {
          url: `${getSiteUrl()}/android-chrome-512x512.png`,
          alt: "Alphaa Africa — visa assistance",
        },
      ],
    },
  };
}

/**
 * `/visa` (RSC, ISR 3600): country grid of Visa Consultation cards —
 * flag, country, consultation fee, processing time, featured state —
 * featured first. Covers loading (skeleton), empty, and error+retry (§12).
 */
export default async function VisaPage() {
  let countries;
  try {
    const page = await getVisaCountries();
    countries = sortFeaturedFirst(page.results);
  } catch (error) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load visa countries right now."
        />
        <RetryButton label="Retry loading visa countries" />
      </div>
    );
  }

  const jsonLd = visaCountryListJsonLd(
    countries.map((country) => ({
      name: country.name,
      slug: country.slug,
      consultation_fee: country.consultation_fee,
      processing_time: country.processing_time,
      flag_image: country.flag_image,
    })),
  );

  return (
    <div className="flex flex-col gap-14 sm:gap-18 pb-20 sm:pb-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />

      {/* 1. Hero: Clean Header */}
      <section className="pt-10 sm:pt-14 md:pt-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-start gap-4 max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            Visa Assistance
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            Planning to travel? Get help with the visa process.
          </h1>
        </div>
      </section>

      {/* 2. Supported Countries Grid */}
      <section aria-label="Supported visa destinations" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col gap-5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-1" aria-live="polite">
          <span className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-primary" />
            {countries.length} {countries.length === 1 ? "destination" : "destinations"} available
          </span>
        </div>

        {countries.length === 0 ? (
          <div className="relative rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs dark:bg-zinc-900/40 dark:border-white/10">
            <div className="flex flex-col items-center gap-4 rounded-[calc(1.5rem-2px)] bg-card p-10 sm:p-14 text-center border border-black/[0.04] dark:border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <h2 className="text-xl font-semibold text-foreground">No visa countries published yet</h2>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                New countries land regularly. Tell us where you want to go and our specialists will advise on the visa path.
              </p>
              <Button
                render={
                  <TrackLink
                    event="support_click"
                    eventProps={{ context: "visa assistance" }}
                    href={getSupportWhatsAppUrl("visa assistance")}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
              >
                <HugeiconsIcon icon={WhatsappIcon} size={16} aria-hidden="true" />
                <span>Talk to Alphaa on WhatsApp</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((country) => (
              <VisaCountryCard key={country.slug} country={country} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Terminal Support Hatch */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <TerminalCta
          title="Visa questions? Start with a consultation."
          description="Pick a country above to see the fee and begin, or talk with our team for guidance on the right application."
          eyebrow="Visa Concierge"
          primaryHref="/contact"
          primaryLabel="Contact Us"
        />
      </section>
    </div>
  );
}
