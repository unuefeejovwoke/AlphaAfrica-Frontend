import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  WhatsappIcon,
  Call02Icon,
  Mail01Icon,
  Location01Icon,
  Clock01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { company, getOfficeMapEmbedUrl } from "@/lib/content/company";
import { contact } from "@/lib/content/contact";
import { faqs } from "@/lib/content/faqs";
import { canonicalUrl, getSiteUrl, organizationJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: contact.seo.title,
    description: contact.seo.description,
    alternates: { canonical: canonicalUrl("/contact") },
    openGraph: {
      title: contact.seo.title,
      description: contact.seo.description,
      url: canonicalUrl("/contact"),
      siteName: company.brandName,
      locale: "en_NG",
      type: "website",
    },
  };
}

const CHANNEL_ICONS = {
  whatsapp: WhatsappIcon,
  phone: Call02Icon,
  email: Mail01Icon,
  office: Location01Icon,
} as const;

export default function ContactPage() {
  const teaserGroups = faqs.groups.filter(
    (group) => group.id === "general" || group.id === "payments"
  );
  const teaserFaqs = teaserGroups.flatMap((group) => group.faqs).slice(0, 3);

  return (
    <div className="flex flex-col gap-14 sm:gap-20 pb-20 sm:pb-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />

      {/* 1. Hero: Clean Header */}
      <section className="pt-10 sm:pt-14 md:pt-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-start gap-4 max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            Contact Us
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            Talk directly to our travel specialists.
          </h1>
        </div>
      </section>

      {/* 2. Channels: 3-column Grid (WhatsApp, Phone, Email) */}
      <section aria-label="Contact channels" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {contact.channels
            .filter((channel) => channel.id !== "office")
            .map((channel) => {
              const isWhatsApp = channel.id === "whatsapp";

              return (
                <a
                  key={channel.id}
                  href={channel.href}
                  target={isWhatsApp ? "_blank" : undefined}
                  rel={isWhatsApp ? "noopener noreferrer" : undefined}
                  className="group relative rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md dark:bg-zinc-900/40 dark:border-white/10"
                >
                  <div className="flex flex-col justify-between h-full rounded-[calc(1.5rem-2px)] bg-card p-6 sm:p-7 border border-black/[0.04] dark:border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                    <div className="flex flex-col gap-5">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-muted/60 text-foreground transition-all duration-300 group-hover:scale-105 group-hover:bg-primary/10 group-hover:text-primary">
                        <HugeiconsIcon icon={CHANNEL_ICONS[channel.id]} size={22} aria-hidden="true" />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">
                          {channel.label}
                        </h2>
                        <p className="text-sm font-medium text-foreground/90 break-words">
                          {channel.value}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
                          {channel.note}
                        </p>
                      </div>
                    </div>

                    <div className="pt-6 sm:pt-8 mt-auto flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      <span>
                        {channel.id === "whatsapp"
                          ? "Message on WhatsApp"
                          : channel.id === "phone"
                            ? "Call Specialist Line"
                            : "Send an Email"}
                      </span>
                      <span className="flex size-8 items-center justify-center rounded-full bg-muted/70 text-foreground transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                        <HugeiconsIcon icon={ArrowUpRight01Icon} size={15} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
        </div>
      </section>

      {/* 3. Experience Centre: Abuja Flagship & Lazy Map */}
      <section aria-labelledby="contact-map-heading" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2.5 max-w-2xl">
            <span className="text-xs font-semibold text-primary">
              Flagship Experience Centre
            </span>
            <h2 id="contact-map-heading" className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Find the Abuja office
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Visit our specialists in person for itinerary curation, ticket printing, and visa document consultations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            {/* Office Details Card */}
            <div className="lg:col-span-5 rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs dark:bg-zinc-900/40 dark:border-white/10">
              <div className="flex flex-col justify-between h-full rounded-[calc(1.5rem-2px)] bg-card p-6 sm:p-8 border border-black/[0.04] dark:border-white/[0.06] gap-6">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">Office Address</span>
                    <p className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                      {company.office.address}
                    </p>
                  </div>

                  <div className="h-px w-full bg-border/60" />

                  <div className="flex flex-col gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <HugeiconsIcon icon={Clock01Icon} size={15} aria-hidden="true" />
                      Visiting Hours
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {contact.hours.label}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {contact.hours.detail}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Timezone: {contact.hours.timezone}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    render={
                      <a
                        href={`https://maps.google.com/maps?q=${encodeURIComponent(company.office.mapQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                    variant="default"
                    size="sm"
                    className="rounded-full font-semibold"
                  >
                    <span>Get Directions</span>
                    <HugeiconsIcon icon={ArrowUpRight01Icon} size={15} aria-hidden="true" />
                  </Button>
                  <Button
                    render={<a href={company.phone.href} />}
                    variant="outline"
                    size="sm"
                    className="rounded-full font-semibold"
                  >
                    <HugeiconsIcon icon={Call02Icon} size={15} aria-hidden="true" />
                    <span>Call Front Desk</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Framed Map Card */}
            <div className="lg:col-span-7 rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs dark:bg-zinc-900/40 dark:border-white/10 min-h-[340px] sm:min-h-[400px]">
              <div className="relative w-full h-full rounded-[calc(1.5rem-2px)] overflow-hidden bg-card border border-black/[0.04] dark:border-white/[0.06] min-h-[340px] sm:min-h-[400px]">
                <iframe
                  title="Map showing the Alphaa Africa Abuja office location"
                  src={getOfficeMapEmbedUrl()}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full min-h-[340px] sm:min-h-[400px] border-0"
                  allowFullScreen
                />
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto pointer-events-none">
                  <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-card/95 px-4 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-md">
                    <HugeiconsIcon icon={Location01Icon} size={15} className="text-primary" aria-hidden="true" />
                    <span>Central Business District · Abuja</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Frequently Asked Questions Preview */}
      <section aria-labelledby="faq-teaser-heading" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs dark:bg-zinc-900/40 dark:border-white/10">
          <div className="flex flex-col gap-8 rounded-[calc(1.5rem-2px)] bg-card p-6 sm:p-12 border border-black/[0.04] dark:border-white/[0.06]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-primary">
                  Before you call
                </span>
                <h2 id="faq-teaser-heading" className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  Quick answers to common questions
                </h2>
              </div>
              <Button
                render={<Link href="/faq" />}
                variant="outline"
                className="rounded-full font-semibold shrink-0"
              >
                <span>Browse all FAQs</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={15} aria-hidden="true" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {teaserFaqs.map((faq) => (
                <div
                  key={faq.id}
                  className="flex flex-col gap-2.5 rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6"
                >
                  <h3 className="text-sm font-semibold text-foreground leading-snug">
                    {faq.question}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
