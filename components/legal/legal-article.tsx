import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Shield01Icon } from "@hugeicons/core-free-icons"
import { company, getSupportWhatsAppUrl } from "@/lib/content/company"
import type { LegalDocument } from "@/lib/content/legal"

/**
 * Reusable long-form legal article renderer for `/privacy` and `/terms`.
 * Server component: semantic `article` + anchor-addressable sections,
 * sticky table of contents on desktop, stacked index on mobile.
 */
export function LegalArticle({ document }: { document: LegalDocument }) {
  const related =
    document.slug === "privacy"
      ? {
          href: "/terms",
          label: "Terms & Conditions",
          note: "Booking, payment, refund, and liability terms.",
        }
      : {
          href: "/privacy",
          label: "Privacy Policy",
          note: "How we collect, use, and protect your data.",
        }

  return (
    <div className="flex flex-col gap-12 pb-20 sm:gap-16 sm:pb-28">
      {/* Hero */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 md:pt-16 lg:px-8">
        <div className="flex max-w-3xl flex-col items-start gap-4">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
            {document.eyebrow}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl md:text-5xl">
            {document.title}
          </h1>
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">
            Effective date: {document.effectiveDate} · {company.legalName} ·
            Abuja, Nigeria
          </p>
          <div className="flex max-w-none flex-col gap-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {document.intro.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Body: TOC + article */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Table of contents */}
          <nav
            aria-label={`Contents of the ${document.title}`}
            className="lg:col-span-4"
          >
            <div className="rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs sm:p-2 lg:sticky lg:top-24">
              <div className="rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-5 sm:p-6">
                <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  On this page
                </h2>
                <ol className="mt-4 flex flex-col gap-1">
                  {document.sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="block rounded-lg px-3 py-2 text-[13px] leading-snug font-medium text-foreground/80 transition-colors hover:bg-muted/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </nav>

          {/* Article */}
          <article className="lg:col-span-8">
            <div className="flex flex-col gap-10">
              {document.sections.map((section) => (
                <section
                  key={section.id}
                  aria-labelledby={`${section.id}-heading`}
                  className="scroll-mt-28"
                >
                  <h2
                    id={`${section.id}-heading`}
                    className="text-xl font-semibold tracking-tight text-balance text-foreground sm:text-2xl"
                  >
                    <a
                      href={`#${section.id}`}
                      id={section.id}
                      className="scroll-mt-28 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {section.title}
                    </a>
                  </h2>
                  <div className="mt-3 flex flex-col gap-3">
                    {section.paragraphs.map((paragraph, index) => (
                      <p
                        key={index}
                        className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]"
                      >
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets ? (
                      <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-primary">
                        {section.bullets.map((bullet, index) => (
                          <li
                            key={index}
                            className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]"
                          >
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {section.closing ? (
                      <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                        {section.closing}
                      </p>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>

            {/* Support + related */}
            <div className="mt-12 flex flex-col gap-4 rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs sm:p-2">
              <div className="flex flex-col gap-4 rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-6 sm:p-8">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <HugeiconsIcon
                      icon={Shield01Icon}
                      size={18}
                      aria-hidden="true"
                    />
                  </span>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">
                    Questions about this document?
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Our travel specialists answer privacy and booking-term
                  questions on WhatsApp, by email at {company.email}, or at our
                  Abuja office. Quote the section heading so we can respond
                  precisely.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={getSupportWhatsAppUrl(
                      `the ${document.title.toLowerCase()}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span>Ask on WhatsApp</span>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={15}
                      aria-hidden="true"
                    />
                  </Link>
                  <Link
                    href={related.href}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span>Read the {related.label}</span>
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground/80">
                  {related.note}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
