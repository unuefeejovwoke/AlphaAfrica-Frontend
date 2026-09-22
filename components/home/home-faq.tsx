"use client";

import * as React from "react";
import Link from "next/link";
import { Accordion } from "@base-ui/react/accordion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  WhatsappIcon,
  HelpCircleIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { getHomepageFaqs } from "@/lib/content/faqs";
import { getSupportWhatsAppUrl } from "@/lib/content/company";
import { TrackLink } from "@/components/analytics/track-link";

function ConciergeCard() {
  return (
    <div className="rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs dark:bg-zinc-900/40 dark:border-white/10">
      <div className="flex flex-col gap-4 rounded-[calc(1.5rem-2px)] bg-card border border-black/[0.04] dark:border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HugeiconsIcon icon={HelpCircleIcon} size={20} />
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Support Desk Live</span>
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
            Need personalized advice?
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Our Abuja-based travel consultants are available to walk you through itineraries, visas, and reservations.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <TrackLink
            event="support_click"
            eventProps={{ context: "Homepage FAQ Concierge" }}
            href={getSupportWhatsAppUrl("Homepage FAQ assistance")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
          >
            <HugeiconsIcon icon={WhatsappIcon} size={15} />
            <span>Chat on WhatsApp</span>
          </TrackLink>
          <Link
            href="/faq"
            className="inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-full border border-border/80 bg-background px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
          >
            <span>All FAQs</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HomeFaq() {
  // ponytail: curated 5-item list with single expansion ceiling; upgrade to search-filtered category tabs if question count exceeds 8.
  const [openItem, setOpenItem] = React.useState<string[]>([]);
  const items = React.useMemo(() => getHomepageFaqs(), []);

  return (
    <section
      aria-labelledby="home-faq-heading"
      className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-start">
        {/* Left Column: Context, Heading & Desktop Concierge Support Card */}
        <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="flex flex-col items-start gap-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
              <HugeiconsIcon icon={SparklesIcon} size={13} className="shrink-0" />
              <span>Got Questions?</span>
            </span>
            <h2
              id="home-faq-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.15]"
            >
              Frequently asked questions
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Clear answers to how our assisted booking, secure payments, and visa guidance work behind the scenes.
            </p>
          </div>

          {/* Desktop only: rendered in sticky left column below heading */}
          <div className="hidden lg:block">
            <ConciergeCard />
          </div>
        </div>

        {/* Right Column: Interactive Single-Open Collapsible Accordion & Mobile Concierge Card */}
        <div className="lg:col-span-7 w-full flex flex-col gap-6 sm:gap-8">
          <Accordion.Root
            value={openItem}
            onValueChange={(val) => setOpenItem(val as string[])}
            className="flex flex-col gap-3.5 sm:gap-4"
          >
            {items.map((item) => (
              <Accordion.Item
                key={item.id}
                value={item.id}
                className="group relative flex flex-col rounded-3xl p-1 sm:p-1.5 bg-muted/40 border border-border/80 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md dark:bg-zinc-900/40 dark:border-white/10 data-[panel-open]:border-primary/40 data-[panel-open]:bg-primary/[0.03] data-[panel-open]:shadow-md"
              >
                <div className="flex flex-1 flex-col rounded-[calc(1.5rem-2px)] bg-card border border-black/[0.04] dark:border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden">
                  <Accordion.Header className="m-0 p-0">
                    <Accordion.Trigger className="flex w-full touch-manipulation items-center justify-between p-5 sm:p-6 text-left transition-colors duration-150 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pr-3 text-left">
                        <span className="w-fit text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 shrink-0">
                          {item.category}
                        </span>
                        <span className="text-sm sm:text-base font-semibold tracking-tight text-foreground leading-snug">
                          {item.question}
                        </span>
                      </div>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/80 text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[panel-open]:rotate-180 group-data-[panel-open]:border-primary/30 group-data-[panel-open]:bg-primary/10 group-data-[panel-open]:text-primary">
                        <HugeiconsIcon icon={ArrowDown01Icon} size={15} aria-hidden="true" />
                      </div>
                    </Accordion.Trigger>
                  </Accordion.Header>

                  <Accordion.Panel className="overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0 h-[var(--accordion-panel-height)]">
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-1">
                      <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                        {item.answer}
                      </p>
                    </div>
                  </Accordion.Panel>
                </div>
              </Accordion.Item>
            ))}
          </Accordion.Root>

          {/* Mobile only: rendered below the FAQ accordion */}
          <div className="block lg:hidden">
            <ConciergeCard />
          </div>
        </div>
      </div>
    </section>
  );
}
