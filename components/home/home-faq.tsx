"use client"

import * as React from "react"
import Link from "next/link"
import { Accordion } from "@base-ui/react/accordion"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  WhatsappIcon,
  HelpCircleIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { getHomepageFaqs } from "@/lib/content/faqs"
import { getSupportWhatsAppUrl } from "@/lib/content/company"
import { MOTION_DURATIONS, MOTION_EASINGS } from "@/lib/motion/tokens"
import { TrackLink } from "@/components/analytics/track-link"

/** Disclosure-tier transition for the chevron rotation. */
const FAQ_PANEL_TRANSITION = {
  duration: MOTION_DURATIONS.standard,
  ease: MOTION_EASINGS.brand,
} as const

function ConciergeCard() {
  return (
    <div className="rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs sm:p-2">
      <div className="flex flex-col gap-4 rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HugeiconsIcon icon={HelpCircleIcon} size={20} />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span>Support Desk Live</span>
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
            Rather just ask someone?
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Our travel consultants can walk you through itineraries, visas, and
            bookings — on WhatsApp or by phone.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2.5 pt-1 sm:flex-row sm:items-center">
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
  )
}

export function HomeFaq() {
  // ponytail: curated 5-item list with single expansion ceiling; upgrade to search-filtered category tabs if question count exceeds 8.
  const [openItem, setOpenItem] = React.useState<string[]>([])
  const items = React.useMemo(() => getHomepageFaqs(), [])

  return (
    <section
      aria-labelledby="home-faq-heading"
      className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
        {/* Left Column: Context, Heading & Desktop Concierge Support Card */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:col-span-5">
          <div className="flex flex-col items-start gap-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
              <HugeiconsIcon
                icon={SparklesIcon}
                size={13}
                className="shrink-0"
              />
              <span>Help &amp; Information</span>
            </span>
            <h2
              id="home-faq-heading"
              className="text-3xl leading-[1.15] font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Frequently Asked Questions
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              Clear answers about booking domestic &amp; international flights,
              hotel reservations, Paystack payment methods, and travel
              guidelines with Alphaa Africa.
            </p>
          </div>

          {/* Desktop only: rendered in sticky left column below heading */}
          <div className="hidden lg:block">
            <ConciergeCard />
          </div>
        </div>

        {/* Right Column: Interactive Single-Open Collapsible Accordion & Mobile Concierge Card */}
        <div className="flex w-full flex-col gap-6 sm:gap-8 lg:col-span-7">
          <Accordion.Root
            value={openItem}
            onValueChange={(val) => setOpenItem(val as string[])}
            className="flex flex-col gap-3.5 sm:gap-4"
          >
            {items.map((item) => {
              const open = openItem.includes(item.id)
              return (
                <Accordion.Item
                  key={item.id}
                  value={item.id}
                  className="group relative flex reveal flex-col rounded-3xl border border-border/80 bg-muted/40 p-1 shadow-xs transition-all duration-300 ease-brand hover:border-foreground/20 hover:shadow-md data-[panel-open]:border-primary/40 data-[panel-open]:bg-primary/[0.03] data-[panel-open]:shadow-md sm:p-1.5"
                >
                  <div className="flex flex-1 flex-col overflow-hidden rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
                    <Accordion.Header className="m-0 p-0">
                      <Accordion.Trigger className="flex w-full touch-manipulation items-center justify-between p-5 text-left transition-colors duration-150 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-6">
                        <div className="flex flex-col gap-2 pr-3 text-left sm:flex-row sm:items-center sm:gap-3">
                          <span className="w-fit shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                            {item.category}
                          </span>
                          <span className="text-sm leading-snug font-semibold tracking-tight text-foreground sm:text-base">
                            {item.question}
                          </span>
                        </div>
                        <motion.span
                          animate={{ rotate: open ? 180 : 0 }}
                          transition={FAQ_PANEL_TRANSITION}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/80 text-muted-foreground data-[open]:border-primary/30 data-[open]:bg-primary/10 data-[open]:text-primary"
                          data-open={open || undefined}
                        >
                          <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            size={15}
                            aria-hidden="true"
                          />
                        </motion.span>
                      </Accordion.Trigger>
                    </Accordion.Header>

                    {/* Opacity-only reveal, same as the FAQ page accordion:
                        animating height here re-ran layout every frame for the
                        whole document below the panel, while opacity
                        composites on the GPU. */}
                    <Accordion.Panel className="overflow-hidden transition-opacity duration-300 ease-brand data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
                      <div className="px-5 pt-1 pb-5 sm:px-6 sm:pb-6">
                        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                          {item.answer}
                        </p>
                      </div>
                    </Accordion.Panel>
                  </div>
                </Accordion.Item>
              )
            })}
          </Accordion.Root>

          {/* Mobile only: rendered below the FAQ accordion */}
          <div className="block lg:hidden">
            <ConciergeCard />
          </div>
        </div>
      </div>
    </section>
  )
}
