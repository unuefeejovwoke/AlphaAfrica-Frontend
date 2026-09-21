import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { faqs } from "@/lib/content/faqs";
import { company, getSupportWhatsAppUrl } from "@/lib/content/company";
import { canonicalUrl, faqPageJsonLd, getSiteUrl } from "@/lib/seo";

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
    <div className="flex flex-col gap-12 md:gap-16 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(faqs.groups)) }}
      />

      {/* Hero */}
      <section className="pt-12 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-4 max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Help centre
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Questions, answered plainly.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {faqs.seo.description} Answers below are working drafts being verified with our
            operations team — anything marked draft will be confirmed by a specialist on request.
          </p>
          <nav aria-label="FAQ categories" className="flex flex-wrap gap-2 pt-2">
            {faqs.groups.map((group) => (
              <a
                key={group.id}
                href={`#faq-${group.id}`}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground/80 hover:border-primary/50 hover:text-primary transition-colors"
              >
                {group.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Grouped questions */}
      {faqs.groups.map((group) => (
        <section
          key={group.id}
          id={`faq-${group.id}`}
          aria-labelledby={`faq-heading-${group.id}`}
          className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full scroll-mt-24"
        >
          <div className="flex flex-col gap-2 mb-6 max-w-2xl">
            <h2 id={`faq-heading-${group.id}`} className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {group.title}
            </h2>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>
          <div className="flex flex-col rounded-2xl border border-border bg-card divide-y divide-border/60">
            {group.faqs.map((faq) => (
              <article key={faq.id} className="flex flex-col gap-2 p-5 sm:p-6">
                <h3 className="text-sm sm:text-base font-bold text-foreground">{faq.question}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                <span className="text-[11px] font-medium text-muted-foreground/80">
                  Status: draft — confirm with a specialist if it affects your booking.
                </span>
              </article>
            ))}
          </div>
        </section>
      ))}

      {/* Support hatch */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 rounded-3xl bg-secondary p-8 sm:p-12">
          <div className="flex flex-col gap-2 max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight text-white">Still unsure?</h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Describe your trip and a specialist will answer directly — usually within minutes
              during desk hours.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              render={
                <a
                  href={getSupportWhatsAppUrl("a question from the FAQ page")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="justify-center"
                />
              }
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 justify-center"
            >
              <HugeiconsIcon icon={Message01Icon} size={18} aria-hidden="true" />
              <span>Ask on WhatsApp</span>
            </Button>
            <Button
              render={<Link href="/contact" className="justify-center" />}
              variant="outline"
              size="lg"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white justify-center"
            >
              <span>Contact options</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
