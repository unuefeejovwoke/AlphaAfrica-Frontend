import type { Metadata } from "next";
import { faqs } from "@/lib/content/faqs";
import { company, getSupportWhatsAppUrl } from "@/lib/content/company";
import { canonicalUrl, faqPageJsonLd, getSiteUrl } from "@/lib/seo";
import { FaqInteractive } from "@/components/faq/faq-interactive";
import { TerminalCta } from "@/components/shared/terminal-cta";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: faqs.seo.title,
    description: faqs.seo.description,
    alternates: { canonical: canonicalUrl("/faq") },
    openGraph: {
      title: faqs.seo.title,
      description: faqs.seo.description,
      url: canonicalUrl("/faq"),
      siteName: company.brandName,
      locale: "en_NG",
      type: "website",
    },
  };
}

export default function FaqPage() {
  return (
    <div className="flex flex-col gap-14 sm:gap-20 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(faqs.groups)) }}
      />

      {/* Hero Section */}
      <section className="pt-12 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center text-center gap-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            Help Centre &amp; FAQs
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] text-balance">
            Questions, answered plainly.
          </h1>

          {/* Crawlable anchor-accessible index for SEO (draft verification status) */}
          <nav aria-label="FAQ direct anchors" className="sr-only">
            {faqs.groups.map((group) => (
              <a key={group.id} href={`#faq-${group.id}`} id={`faq-${group.id}`}>
                {group.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Interactive Accordion + Search Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <FaqInteractive groups={faqs.groups} />
      </section>

      {/* Reusable High-End Terminal Call to Action */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <TerminalCta
          title="Still have questions about your upcoming trip?"
          description="Our team is always ready to guide you with flights, stays, holiday packages, and visa advice."
          context="a question from the FAQ page"
          eyebrow="Direct Concierge Help"
          backgroundImage="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=2000&q=80"
        />
      </section>
    </div>
  );
}
