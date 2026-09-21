import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message01Icon,
  Call02Icon,
  Mail01Icon,
  Location01Icon,
  Clock01Icon,
  AlertCircleIcon,
  ArrowRight01Icon,
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
  whatsapp: Message01Icon,
  phone: Call02Icon,
  email: Mail01Icon,
  office: Location01Icon,
} as const;

export default function ContactPage() {
  const teaserGroups = faqs.groups.filter((group) => group.id === "general" || group.id === "payments");
  const teaserFaqs = teaserGroups.flatMap((group) => group.faqs).slice(0, 3);

  return (
    <div className="flex flex-col gap-16 md:gap-20 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />

      {/* Hero */}
      <section className="pt-12 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-4 max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Contact</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Talk to a real travel specialist.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            WhatsApp, phone, email, or visit our Abuja office — {contact.hours.label}. No forms, no
            queues: pick the channel that suits you.
          </p>
        </div>
      </section>

      {/* Channels */}
      <section aria-label="Contact channels" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {contact.channels.map((channel) => (
            <a
              key={channel.id}
              href={channel.href}
              target={channel.id === "whatsapp" || channel.id === "office" ? "_blank" : undefined}
              rel={channel.id === "whatsapp" || channel.id === "office" ? "noopener noreferrer" : undefined}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-colors"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <HugeiconsIcon icon={CHANNEL_ICONS[channel.id]} size={22} aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-sm font-bold text-foreground">{channel.label}</span>
                <span className="text-xs text-foreground/80 break-words font-medium">{channel.value}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">{channel.note}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Hours + emergency */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-8">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <HugeiconsIcon icon={Clock01Icon} size={16} aria-hidden="true" />
              Desk hours
            </span>
            <h2 className="text-xl font-bold text-foreground">{contact.hours.label}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{contact.hours.detail}</p>
            <p className="text-xs text-muted-foreground">{contact.hours.timezone}</p>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border border-destructive/20 bg-card p-8">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-destructive">
              <HugeiconsIcon icon={AlertCircleIcon} size={16} aria-hidden="true" />
              Emergency
            </span>
            <h2 className="text-xl font-bold text-foreground">{contact.emergency.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{contact.emergency.description}</p>
            <div>
              <Button render={<a href={contact.emergency.phoneHref} />} variant="outline" size="sm">
                <HugeiconsIcon icon={Call02Icon} size={16} aria-hidden="true" />
                <span>Call {contact.emergency.phoneDisplay}</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Office map */}
      <section aria-labelledby="contact-map-heading" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-3 max-w-2xl mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {company.office.label}
          </span>
          <h2 id="contact-map-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Find the Abuja office
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{company.office.address}</p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-border">
          <iframe
            title="Map showing the Alphaa Africa Abuja office location"
            src={getOfficeMapEmbedUrl()}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="aspect-video w-full border-0"
            allowFullScreen
          />
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12">
          <div className="flex flex-col gap-3 max-w-2xl mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Before you call
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Quick answers
            </h2>
          </div>
          <ul className="flex flex-col gap-4 mb-8">
            {teaserFaqs.map((faq) => (
              <li key={faq.id} className="flex flex-col gap-1 border-b border-border/60 pb-4 last:border-0 last:pb-0">
                <span className="text-sm font-bold text-foreground">{faq.question}</span>
                <span className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{faq.answer}</span>
              </li>
            ))}
          </ul>
          <Button render={<Link href="/faq" />} variant="outline">
            <span>Browse all FAQs</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
          </Button>
        </div>
      </section>
    </div>
  );
}
