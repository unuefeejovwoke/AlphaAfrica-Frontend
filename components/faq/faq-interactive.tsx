"use client"

import * as React from "react"
import { Accordion } from "@base-ui/react/accordion"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  Cancel01Icon,
  ArrowDown01Icon,
  WhatsappIcon,
  HelpCircleIcon,
} from "@hugeicons/core-free-icons"
import type { FaqGroup } from "@/lib/content/faqs"
import { getSupportWhatsAppUrl } from "@/lib/content/company"
import { TrackLink } from "@/components/analytics/track-link"

interface FaqInteractiveProps {
  groups: FaqGroup[]
}

export function FaqInteractive({ groups }: FaqInteractiveProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  // Default to empty array so all questions start collapsed, allowing visitors to scan questions first.
  const [openItems, setOpenItems] = React.useState<string[]>([])

  // Filter logic: apply search query
  const filteredGroups = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return groups

    return groups
      .map((group) => {
        const matchingFaqs = group.faqs.filter(
          (faq) =>
            faq.question.toLowerCase().includes(q) ||
            faq.answer.toLowerCase().includes(q)
        )
        return {
          ...group,
          faqs: matchingFaqs,
        }
      })
      .filter((group) => group.faqs.length > 0)
  }, [groups, searchQuery])

  const totalMatchingFaqs = React.useMemo(() => {
    return filteredGroups.reduce((acc, group) => acc + group.faqs.length, 0)
  }, [filteredGroups])

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      {/* Search Bar */}
      <div className="flex flex-col gap-4">
        {/* Apple-style Search Capsule */}
        <div className="relative mx-auto w-full max-w-2xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground">
            <HugeiconsIcon icon={Search01Icon} size={18} aria-hidden="true" />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics, questions, or keywords…"
            className="w-full rounded-full border border-foreground/15 bg-background/80 py-3.5 pr-11 pl-11 text-sm text-foreground shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all duration-200 placeholder:text-muted-foreground hover:border-foreground/25 focus:border-foreground/40 focus:ring-2 focus:ring-primary/20 focus:outline-none"
            aria-label="Search frequently asked questions"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear search input"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Search feedback row */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {totalMatchingFaqs} question
              {totalMatchingFaqs === 1 ? "" : "s"} matching &ldquo;{searchQuery}
              &rdquo;
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="font-medium text-primary hover:underline"
            >
              Reset search
            </button>
          </div>
        )}
      </div>

      {/* Accordion Groups or Empty State */}
      {filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/80 bg-muted/20 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <HugeiconsIcon icon={HelpCircleIcon} size={24} aria-hidden="true" />
          </div>
          <div className="flex max-w-md flex-col gap-1.5">
            <h3 className="text-base font-semibold text-foreground">
              No matching answers found
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              We couldn&apos;t find an answer for &ldquo;{searchQuery}&rdquo;.
              Connect directly with a travel specialist on WhatsApp for instant
              assistance.
            </p>
          </div>
          <TrackLink
            event="support_click"
            eventProps={{ context: `FAQ search for "${searchQuery}"` }}
            href={getSupportWhatsAppUrl(`FAQ search for "${searchQuery}"`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:bg-primary/90 active:scale-95"
          >
            <HugeiconsIcon icon={WhatsappIcon} size={15} aria-hidden="true" />
            <span>Ask a Specialist on WhatsApp</span>
          </TrackLink>
        </div>
      ) : (
        <div className="flex flex-col gap-10 sm:gap-12">
          {filteredGroups.map((group) => (
            <section
              key={group.id}
              id={`faq-${group.id}`}
              aria-labelledby={`faq-heading-${group.id}`}
              className="scroll-mt-28"
            >
              <div className="mb-4 flex flex-col gap-1">
                <h2
                  id={`faq-heading-${group.id}`}
                  className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                >
                  {group.title}
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {group.description}
                </p>
              </div>

              {/* Base UI Accordion */}
              <Accordion.Root
                value={openItems}
                onValueChange={(val) => setOpenItems(val as string[])}
                multiple
                className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-xs backdrop-blur-xs"
              >
                {group.faqs.map((faq) => (
                  <Accordion.Item
                    key={faq.id}
                    value={faq.id}
                    className="group flex flex-col transition-colors duration-150"
                  >
                    <Accordion.Header className="m-0 p-0">
                      <Accordion.Trigger className="flex w-full touch-manipulation items-center justify-between p-5 text-left transition-colors duration-150 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-6">
                        <span className="pr-4 text-sm font-semibold tracking-tight text-foreground sm:text-base">
                          {faq.question}
                        </span>
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/80 text-muted-foreground transition-all duration-300 ease-brand group-data-[panel-open]:rotate-180 group-data-[panel-open]:border-foreground/20 group-data-[panel-open]:bg-muted group-data-[panel-open]:text-foreground">
                          <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            size={14}
                            aria-hidden="true"
                          />
                        </div>
                      </Accordion.Trigger>
                    </Accordion.Header>

                    {/* Opacity-only reveal: animating height here re-ran
                        layout every frame for the whole document below the
                        panel, while opacity composites on the GPU. */}
                    <Accordion.Panel className="overflow-hidden transition-opacity duration-300 ease-brand data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
                      <div className="flex flex-col gap-3 px-5 pb-5 sm:px-6 sm:pb-6">
                        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm sm:leading-relaxed">
                          {faq.answer}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground/75">
                          <TrackLink
                            event="support_click"
                            eventProps={{
                              context: `Question: ${faq.question}`,
                            }}
                            href={getSupportWhatsAppUrl(
                              `Question: ${faq.question}`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            <span>Have more questions? Ask on WhatsApp</span>
                            <span aria-hidden="true">&rarr;</span>
                          </TrackLink>
                        </div>
                      </div>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
