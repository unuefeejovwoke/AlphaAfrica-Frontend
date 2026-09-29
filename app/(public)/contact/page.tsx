import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  WhatsappIcon,
  Call02Icon,
  Mail01Icon,
  Location01Icon,
  Clock01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { company, getOfficeMapEmbedUrl } from "@/lib/content/company"
import { contact } from "@/lib/content/contact"
import { faqs } from "@/lib/content/faqs"
import { canonicalUrl, getSiteUrl, organizationJsonLd } from "@/lib/seo"

export const revalidate = 3600

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
  }
}

const CHANNEL_ICONS = {
  whatsapp: WhatsappIcon,
  phone: Call02Icon,
  email: Mail01Icon,
  office: Location01Icon,
} as const

export default function ContactPage() {
  const teaserGroups = faqs.groups.filter(
    (group) => group.id === "general" || group.id === "payments"
  )
  const teaserFaqs = teaserGroups.flatMap((group) => group.faqs).slice(0, 3)

  return (
    <div className="flex flex-col gap-14 pb-20 sm:gap-20 sm:pb-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd()),
        }}
      />

      {/* 1. Hero: Clean Header */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 md:pt-16 lg:px-8">
        <div className="flex max-w-3xl flex-col items-start gap-4">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
            Contact
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Need help with a trip? Reach a real person.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Message on WhatsApp, call, or email. A travel specialist will help
            with flights, hotels, packages, visas, and cars — wherever you are.
          </p>
        </div>
      </section>

      {/* 2. Channels: 3-column Grid (WhatsApp, Phone, Email) */}
      <section
        aria-label="Contact channels"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {contact.channels
            .filter((channel) => channel.id !== "office")
            .map((channel) => {
              const isWhatsApp = channel.id === "whatsapp"

              return (
                <a
                  key={channel.id}
                  href={channel.href}
                  target={isWhatsApp ? "_blank" : undefined}
                  rel={isWhatsApp ? "noopener noreferrer" : undefined}
                  className="group relative rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md sm:p-2"
                >
                  <div className="flex h-full flex-col justify-between rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-7">
                    <div className="flex flex-col gap-5">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-muted/60 text-foreground transition-all duration-300 group-hover:scale-105 group-hover:bg-primary/10 group-hover:text-primary">
                        <HugeiconsIcon
                          icon={CHANNEL_ICONS[channel.id]}
                          size={22}
                          aria-hidden="true"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">
                          {channel.label}
                        </h2>
                        <p className="text-sm font-medium break-words text-foreground/90">
                          {channel.value}
                        </p>
                        <p className="pt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                          {channel.note}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-6 text-xs font-semibold text-foreground transition-colors group-hover:text-primary sm:pt-8">
                      <span>
                        {channel.id === "whatsapp"
                          ? "Start a chat"
                          : channel.id === "phone"
                            ? "Call the specialist line"
                            : "Send an email"}
                      </span>
                      <span className="flex size-8 items-center justify-center rounded-full bg-muted/70 text-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-primary group-hover:text-primary-foreground">
                        <HugeiconsIcon
                          icon={ArrowUpRight01Icon}
                          size={15}
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </div>
                </a>
              )
            })}
        </div>
      </section>

      {/* 3. Office & map */}
      <section
        aria-labelledby="contact-map-heading"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-8">
          <div className="flex max-w-2xl flex-col gap-2.5">
            <span className="text-xs font-semibold text-primary">Visit us</span>
            <h2
              id="contact-map-heading"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Come see us in person
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Prefer face-to-face? Bring your dates, documents, or booking
              reference and we&apos;ll work through it with you.
            </p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
            {/* Office Details Card */}
            <div className="rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs sm:p-2 lg:col-span-5">
              <div className="flex h-full flex-col justify-between gap-6 rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-6 sm:p-8">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Office Address
                    </span>
                    <p className="text-sm leading-snug font-semibold text-foreground sm:text-base">
                      {company.office.address}
                    </p>
                  </div>

                  <div className="h-px w-full bg-border/60" />

                  <div className="flex flex-col gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        size={15}
                        aria-hidden="true"
                      />
                      Visiting Hours
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {contact.hours.label}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {contact.hours.detail}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Timezone: {contact.hours.timezone}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <ButtonLink
                    href={`https://maps.google.com/maps?q=${encodeURIComponent(company.office.mapQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="default"
                    size="sm"
                    className="rounded-full font-semibold"
                  >
                    <span>Get Directions</span>
                    <HugeiconsIcon
                      icon={ArrowUpRight01Icon}
                      size={15}
                      aria-hidden="true"
                    />
                  </ButtonLink>
                  <ButtonLink
                    href={company.phone.href}
                    variant="outline"
                    size="sm"
                    className="rounded-full font-semibold"
                  >
                    <HugeiconsIcon
                      icon={Call02Icon}
                      size={15}
                      aria-hidden="true"
                    />
                    <span>Call before you visit</span>
                  </ButtonLink>
                </div>
              </div>
            </div>

            {/* Framed Map Card */}
            <div className="min-h-[340px] rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs sm:min-h-[400px] sm:p-2 lg:col-span-7">
              <div className="relative h-full min-h-[340px] w-full overflow-hidden rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card sm:min-h-[400px]">
                <iframe
                  title="Map showing the Alphaa Africa Abuja office location"
                  src={getOfficeMapEmbedUrl()}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full min-h-[340px] w-full border-0 sm:min-h-[400px]"
                  allowFullScreen
                />
                <div className="pointer-events-none absolute right-4 bottom-4 left-4 sm:right-auto">
                  <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-card/95 px-4 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-md">
                    <HugeiconsIcon
                      icon={Location01Icon}
                      size={15}
                      className="text-primary"
                      aria-hidden="true"
                    />
                    <span>Central Business District · Abuja</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Frequently Asked Questions Preview */}
      <section
        aria-labelledby="faq-teaser-heading"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs sm:p-2">
          <div className="flex flex-col gap-8 rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-6 sm:p-12">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-primary">
                  Before you call
                </span>
                <h2
                  id="faq-teaser-heading"
                  className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                >
                  Answers before you reach out
                </h2>
              </div>
              <ButtonLink
                href="/faq"
                variant="outline"
                className="shrink-0 rounded-full font-semibold"
              >
                <span>See all FAQs</span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={15}
                  aria-hidden="true"
                />
              </ButtonLink>
            </div>

            <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-3">
              {teaserFaqs.map((faq) => (
                <div
                  key={faq.id}
                  className="flex flex-col gap-2.5 rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6"
                >
                  <h3 className="text-sm leading-snug font-semibold text-foreground">
                    {faq.question}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
