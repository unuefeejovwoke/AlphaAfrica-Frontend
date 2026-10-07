"use client"

import * as React from "react"
import { Accordion } from "@base-ui/react/accordion"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, Tick01Icon } from "@hugeicons/core-free-icons"

/**
 * Document checklist + consultation timeline disclosures for `/visa/[slug]`.
 * Base UI Accordion with the repo-standard opacity-only CSS panel (FAQ
 * pattern): composited opacity, zero layout animation, `keepMounted` so the
 * copy stays server-rendered and crawlable. Copy is deliberately generic —
 * the backend exposes no per-country requirements, so exact lists are
 * confirmed by the specialist during the consultation, never asserted here.
 */
const TYPICAL_DOCUMENTS = [
  {
    title: "Valid passport",
    body: "Usually valid well beyond your travel dates with blank pages. Your specialist confirms the exact validity window.",
  },
  {
    title: "Passport photographs",
    body: "Recent photos meeting the embassy's size and background rules — confirmed on your call.",
  },
  {
    title: "Financial evidence",
    body: "Bank statements or sponsorship proof showing you can fund the trip. The required months vary by purpose.",
  },
  {
    title: "Purpose proof",
    body: "Admission letters for study, invite letters for business or family visits, bookings for tourism — matched to your travel purpose.",
  },
  {
    title: "Travel history & ties",
    body: "Previous visas, employment or enrolment letters, and anything showing ties back home. Your specialist prioritises what matters most.",
  },
] as const

const CONSULTATION_STEPS = [
  {
    title: "Pay the consultation fee",
    body: "Secure Paystack checkout below — no account needed. Your reference is verified instantly.",
  },
  {
    title: "Specialist reviews your case",
    body: "A visa specialist contacts you, checks your purpose of travel, and confirms the exact document list for your situation.",
  },
  {
    title: "Document check",
    body: "Your supporting documents are reviewed against the requirements before anything is submitted.",
  },
  {
    title: "Interview preparation",
    body: "Practice the questions consular officers actually ask, with feedback on clear, honest answers.",
  },
] as const

function DisclosureItem({
  value,
  eyebrow,
  title,
  children,
}: {
  value: string
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <Accordion.Item
      value={value}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs transition-colors duration-150 data-[panel-open]:border-primary/40"
    >
      <Accordion.Header className="m-0 p-0">
        <Accordion.Trigger className="flex w-full touch-manipulation items-center justify-between gap-3 p-5 text-left transition-colors duration-150 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-6">
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
              {eyebrow}
            </span>
            <span className="text-sm font-bold tracking-tight text-foreground sm:text-base">
              {title}
            </span>
          </span>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/80 text-muted-foreground transition-[transform,color,background-color,border-color] duration-300 ease-brand group-data-[panel-open]:rotate-180 group-data-[panel-open]:border-primary/30 group-data-[panel-open]:bg-primary/10 group-data-[panel-open]:text-primary">
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={15}
              aria-hidden="true"
            />
          </span>
        </Accordion.Trigger>
      </Accordion.Header>

      {/* Opacity-only reveal: animating height here re-ran layout every frame
          for the whole document below the panel, while opacity composites. */}
      <Accordion.Panel
        keepMounted
        className="overflow-hidden transition-opacity duration-300 ease-brand data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
      >
        {children}
      </Accordion.Panel>
    </Accordion.Item>
  )
}

export function VisaDetailDisclosures({
  countryName,
}: {
  countryName: string
}) {
  const [openItems, setOpenItems] = React.useState<string[]>([])

  return (
    <Accordion.Root
      value={openItems}
      onValueChange={(val) => setOpenItems(val as string[])}
      className="flex flex-col gap-3.5 sm:gap-4"
    >
      <DisclosureItem
        value="documents"
        eyebrow="Before you apply"
        title={`${countryName} documents checklist`}
      >
        <div className="flex flex-col gap-1 px-5 pb-5 sm:px-6 sm:pb-6">
          <ol className="flex flex-col">
            {TYPICAL_DOCUMENTS.map((doc, index) => (
              <li
                key={doc.title}
                className="flex items-start gap-3 border-b border-border/40 py-3 last:border-b-0 last:pb-0"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    size={13}
                    aria-hidden="true"
                  />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-bold text-foreground">
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {doc.title}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {doc.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
            Embassy requirements differ by purpose of travel — the exact list
            for {countryName} is confirmed with your specialist, not assumed
            here.
          </p>
        </div>
      </DisclosureItem>

      <DisclosureItem
        value="timeline"
        eyebrow="How it works"
        title="Consultation step by step"
      >
        <ol className="flex flex-col gap-0 px-5 pb-5 sm:px-6 sm:pb-6">
          {CONSULTATION_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="relative flex gap-3.5 pb-4 last:pb-0"
            >
              {index < CONSULTATION_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-8 bottom-0 left-[13px] w-px bg-border"
                />
              ) : null}
              <span className="z-10 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                <span className="text-sm font-bold text-foreground">
                  {step.title}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {step.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </DisclosureItem>
    </Accordion.Root>
  )
}
