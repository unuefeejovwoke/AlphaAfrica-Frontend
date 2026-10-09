"use client"

import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Search01Icon,
  Tick01Icon,
  Ticket01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { backdropFadeVariants } from "@/lib/motion/variants"

export const FLIGHT_JOURNEY_STEPS = [
  { key: "search", label: "Search", icon: Search01Icon },
  { key: "compare", label: "Compare", icon: Airplane01Icon },
  { key: "checkout", label: "Checkout", icon: Wallet01Icon },
  { key: "confirmed", label: "Confirmed", icon: Ticket01Icon },
] as const

export type FlightJourneyStepKey = (typeof FLIGHT_JOURNEY_STEPS)[number]["key"]

export interface FlightJourneyHeaderProps {
  /** 1-based current step (1=Search … 4=Confirmed). */
  current: 1 | 2 | 3 | 4
  className?: string
}

/**
 * Four-step flights journey header (Search, Compare, Checkout, Confirmed).
 * Fare confirmation happens in the results-page modal as part of Compare →
 * Checkout, so it is not a separate step. Ordered list with
 * `aria-current="step"` so screen readers announce progress; decorative icons
 * hidden; compact and horizontally scrollable on small screens; sticky-safe
 * (no overlay).
 */
export function FlightJourneyHeader({
  current,
  className,
}: FlightJourneyHeaderProps) {
  return (
    <nav
      aria-label="Flight booking progress"
      className={cn("min-w-0", className)}
    >
      <ol className="flex min-w-0 items-start gap-1 overflow-x-auto overscroll-contain pb-1">
        {FLIGHT_JOURNEY_STEPS.map((step, index) => {
          const stepNumber = index + 1
          const isCurrent = stepNumber === current
          const isDone = stepNumber < current
          return (
            <li
              key={step.key}
              aria-current={isCurrent ? "step" : undefined}
              className="flex min-w-0 flex-1 basis-0 items-start"
            >
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                {/* Badge state glides via CSS transition-colors; the icon
                    cross-fades with a remount fade-in (no exit gap, so the
                    badge never blinks empty). `current` is static per route,
                    so a shared layoutId pill would be speculative machinery
                    for a transition that never runs in-page. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : isDone
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                  )}
                >
                  <motion.span
                    key={isDone ? "done" : step.key}
                    initial="hidden"
                    animate="visible"
                    variants={backdropFadeVariants}
                    className="inline-flex"
                  >
                    {isDone ? (
                      <HugeiconsIcon icon={Tick01Icon} size={14} />
                    ) : (
                      <HugeiconsIcon icon={step.icon} size={14} />
                    )}
                  </motion.span>
                </span>
                <span
                  className={cn(
                    "max-w-full truncate text-[11px] leading-tight font-semibold",
                    isCurrent
                      ? "text-foreground"
                      : isDone
                        ? "text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
                <span className="sr-only">
                  {isCurrent
                    ? ` (current step, step ${stepNumber} of 4)`
                    : isDone
                      ? ` (completed, step ${stepNumber} of 4)`
                      : ` (step ${stepNumber} of 4)`}
                </span>
              </div>
              {index < FLIGHT_JOURNEY_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-1 mt-4 h-px min-w-3 flex-1",
                    stepNumber < current ? "bg-primary/50" : "bg-border"
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
      <p aria-live="polite" className="sr-only">
        Step {current} of 4: {FLIGHT_JOURNEY_STEPS[current - 1].label}
      </p>
    </nav>
  )
}
