import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
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
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-12 sm:px-6 lg:px-8">
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
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-12 sm:px-6 md:gap-16 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />

      <div className="flex max-w-3xl flex-col gap-4">
        <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Visa Assistance
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
          Planning to travel? Get help with the visa process.
        </h1>
        <p className="text-base leading-relaxed break-words text-muted-foreground">
          Pick your destination below to see the consultation fee and typical
          processing time. Starting a consultation is paid — a specialist then
          guides your documents, process, and interview prep. No account needed.
        </p>
        <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
          {countries.length} {countries.length === 1 ? "country" : "countries"} supported
        </p>
      </div>

      {countries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-foreground">No visa countries published yet.</p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            New countries land regularly. Tell us where you want to go and a
            specialist will advise on the visa path.
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
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Ask about a visa</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((country) => (
            <VisaCountryCard key={country.slug} country={country} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold text-foreground">Not sure what visa support you need?</h2>
          <p className="text-xs text-muted-foreground">
            Start with a conversation — a specialist will point you at the right country page.
          </p>
        </div>
        <Button render={<Link href="/faq#faq-visa" />} variant="outline">
          <span>Read visa FAQs</span>
        </Button>
      </div>

      <TerminalCta
        title="Visa questions? Start with a consultation."
        description="Pick a country above to see the fee and begin, or describe your trip on WhatsApp and a specialist will guide you to the right application."
        context="visa assistance"
        primaryHref="/faq#faq-visa"
        primaryLabel="Read visa FAQs"
      />
    </div>
  );
}
