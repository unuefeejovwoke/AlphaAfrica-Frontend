"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Search01Icon,
  Tick01Icon,
  UserIcon,
  Ticket01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export const FLIGHT_JOURNEY_STEPS = [
  { key: "search", label: "Search", icon: Search01Icon },
  { key: "compare", label: "Compare", icon: Airplane01Icon },
  { key: "confirm", label: "Confirm fare", icon: Tick01Icon },
  { key: "travellers", label: "Travellers", icon: UserIcon },
  { key: "pay", label: "Pay", icon: Wallet01Icon },
  { key: "booking", label: "Booking", icon: Ticket01Icon },
] as const

export type FlightJourneyStepKey = (typeof FLIGHT_JOURNEY_STEPS)[number]["key"]

export interface FlightJourneyHeaderProps {
  /** 1-based current step (1=Search … 6=Booking). */
  current: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
}

/**
 * Six-step flights journey header (Search, Compare, Confirm fare,
 * Travellers, Pay, Booking). Ordered list with `aria-current="step"` so
 * screen readers announce progress; decorative icons hidden; compact and
 * horizontally scrollable on small screens; sticky-safe (no overlay).
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
                  {isDone ? (
                    <HugeiconsIcon icon={Tick01Icon} size={14} />
                  ) : (
                    <HugeiconsIcon icon={step.icon} size={14} />
                  )}
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
                    ? ` (current step, step ${stepNumber} of 6)`
                    : isDone
                      ? ` (completed, step ${stepNumber} of 6)`
                      : ` (step ${stepNumber} of 6)`}
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
        Step {current} of 6: {FLIGHT_JOURNEY_STEPS[current - 1].label}
      </p>
    </nav>
  )
}
