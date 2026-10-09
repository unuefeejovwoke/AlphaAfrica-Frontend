"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  AlertCircleIcon,
  Cancel01Icon,
  Clock01Icon,
  Message01Icon,
} from "@hugeicons/core-free-icons"
import { Button, ButtonLink, buttonVariants } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import {
  confirmFlightPrice,
  describePriceOutcome,
  extractOpaqueOfferBlob,
  getFlightSupportWhatsAppUrl,
  isOfferExpiredError,
  resolvePriceConfirmation,
  type FlightOffer,
  type FlightOfferDisplay,
  type FlightTripContext,
  type PriceConfirmOutcome,
} from "@/lib/api/flights"
import type { BookingBranch } from "@/lib/api/domestic"
import { formatNaira } from "@/lib/format"
import { cn } from "@/lib/utils"
import { track } from "@/lib/analytics"
import { TrackLink } from "@/components/analytics/track-link"
import { backdropFadeVariants, modalScaleVariants } from "@/lib/motion/variants"

type ConfirmPhase = "confirming" | "changed" | "expired" | "error" | "domestic"

type ChangedOutcome = Extract<PriceConfirmOutcome, { status: "changed" }>

export interface FareConfirmDialogProps {
  open: boolean
  /** Raw selected Flight Offer / Domestic Flight Card (opaque blob included). */
  offer: FlightOffer | null
  /** Normalized display for the summary — never used as the request payload. */
  display: FlightOfferDisplay | null
  branch: BookingBranch
  onOpenChange: (open: boolean) => void
  /** Parent persists the Confirmed Offer and navigates to Traveller entry. */
  onContinue: (confirmedOffer: FlightOffer | null) => void
}

const PHASE_COPY: Record<ConfirmPhase, { title: string; description: string }> =
  {
    confirming: {
      title: "Confirming live fare…",
      description:
        "Airlines are rechecking this price. This usually takes a few seconds.",
    },
    changed: {
      title: "The airline updated this fare",
      description:
        "The price changed after your search. Review it and continue only if you accept it.",
    },
    expired: {
      title: "This fare is no longer available",
      description:
        "The airline withdrew this offer before we could confirm it. Nothing was booked and no payment was taken.",
    },
    error: {
      title: "We could not confirm this fare",
      description:
        "No booking was made and no payment was taken. Your selected flight is kept — retry or talk to Alphaa.",
    },
    domestic: {
      title: "Confirm your domestic flight",
      description: "",
    },
  }

/**
 * Fare confirmation dialog on the results page (Wakanow-style). Reads the
 * selected offer from memory via props, revalidates through the same-origin
 * price endpoint, and renders one branch: unchanged fare proceeds straight to
 * Traveller entry; changed fare needs explicit consent; expired fares never
 * book silently; Domestics skip Amadeus revalidation entirely.
 *
 * The opaque blob stays out of URLs and analytics, and the in-flight request
 * aborts on close or unmount.
 */
export function FareConfirmDialog({
  open,
  offer,
  display,
  branch,
  onOpenChange,
  onContinue,
}: FareConfirmDialogProps) {
  const [phase, setPhase] = React.useState<ConfirmPhase>("confirming")
  const [changedOutcome, setChangedOutcome] =
    React.useState<ChangedOutcome | null>(null)
  const [confirmedOffer, setConfirmedOffer] =
    React.useState<FlightOffer | null>(null)
  const [error, setError] = React.useState<unknown>(null)
  const [retryKey, setRetryKey] = React.useState(0)

  // When the dialog body is replaced (fare changed, expired, or errored),
  // move focus to the new heading so keyboard and screen-reader Customers
  // land on the news instead of the stale confirming copy.
  const titleRef = React.useRef<HTMLHeadingElement | null>(null)
  React.useEffect(() => {
    if (!open) return
    if (phase === "changed" || phase === "expired" || phase === "error") {
      titleRef.current?.focus()
    }
  }, [open, phase])

  React.useEffect(() => {
    if (!open || !offer || !display) return
    if (branch === "domestic") {
      setPhase("domestic")
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setPhase("confirming")
    setChangedOutcome(null)
    setConfirmedOffer(null)
    setError(null)

    void (async () => {
      try {
        const revalidated = await confirmFlightPrice(
          extractOpaqueOfferBlob(offer),
          { signal: controller.signal }
        )
        if (cancelled || controller.signal.aborted) return
        const outcome = resolvePriceConfirmation({
          selected_offer: offer,
          revalidated_offer: revalidated,
        })
        if (outcome.status === "same") {
          onContinue(revalidated)
          return
        }
        if (outcome.status === "changed") {
          setConfirmedOffer(revalidated)
          setChangedOutcome(outcome)
          track("flight_price_changed", {
            direction: outcome.increased ? "increased" : "decreased",
            currency: outcome.currency,
          })
          setPhase("changed")
          return
        }
        setPhase("expired")
      } catch (e) {
        if (cancelled || controller.signal.aborted) return
        if (isOfferExpiredError(e)) {
          setPhase("expired")
          return
        }
        setError(e)
        setPhase("error")
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [open, offer, display, branch, onContinue, retryKey])

  if (!display) return null

  const copy = PHASE_COPY[phase]
  const fareAnnouncement =
    phase === "changed" && changedOutcome
      ? describePriceOutcome(changedOutcome)
      : phase === "expired"
        ? describePriceOutcome({ status: "expired" })
        : null
  const tripContext: FlightTripContext = {
    origin: display.origin,
    destination: display.destination,
    amount: display.price === "—" ? null : formatNaira(display.price),
  }
  const differenceLabel = changedOutcome
    ? changedOutcome.increased
      ? `+${formatNaira(changedOutcome.difference)} increase`
      : `−${formatNaira(changedOutcome.difference)} decrease`
    : ""

  let body: React.ReactNode
  if (phase === "confirming") {
    body = (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
        >
          <HugeiconsIcon
            icon={Clock01Icon}
            size={16}
            className="animate-pulse motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span>Confirming live fare… airlines are rechecking this price…</span>
        </p>
        <div aria-hidden="true" className="flex flex-col gap-3">
          <div className="h-16 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
          <div className="h-9 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          No booking is made and no payment is taken at this step.
        </p>
      </div>
    )
  } else if (phase === "changed" && changedOutcome) {
    body = (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {display.airline} {display.airportsLabel} — the price changed after
          your search. Review the new fare and continue only if you accept it.
        </p>
        <dl className="grid min-w-0 grid-cols-1 gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Previous fare
            </dt>
            <dd className="font-variant-numeric mt-1 text-base font-bold text-muted-foreground tabular-nums line-through">
              {formatNaira(changedOutcome.previousTotal)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              New fare
            </dt>
            <dd className="font-variant-numeric mt-1 text-base font-extrabold text-foreground tabular-nums">
              {formatNaira(changedOutcome.newTotal)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Difference
            </dt>
            <dd
              className={
                changedOutcome.increased
                  ? "font-variant-numeric mt-1 text-base font-extrabold text-amber-700 tabular-nums"
                  : "font-variant-numeric mt-1 text-base font-extrabold text-emerald-700 tabular-nums"
              }
            >
              {differenceLabel}
            </dd>
          </div>
        </dl>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            size="lg"
            onClick={() => onContinue(confirmedOffer)}
            className="flex-1 justify-center"
          >
            <span>Continue with {formatNaira(changedOutcome.newTotal)}</span>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 justify-center"
          >
            <span>Back to results</span>
          </Button>
        </div>
        <TrackLink
          event="support_click"
          eventProps={{
            context: "a flight fare that changed before payment",
            channel: "whatsapp",
          }}
          href={getFlightSupportWhatsAppUrl(
            "a flight fare that changed before payment",
            { ...tripContext, amount: formatNaira(changedOutcome.newTotal) }
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "ghost", size: "lg" }),
            "w-full justify-center"
          )}
        >
          <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
          <span>Ask Alphaa</span>
        </TrackLink>
        <p className="text-center text-xs text-muted-foreground">
          Prices are in Naira ({changedOutcome.currency}). Continuing takes you
          to traveller details.
        </p>
      </div>
    )
  } else if (phase === "expired") {
    body = (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
        </div>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Search again for fresh live fares, or talk to Alphaa and a specialist
          will check alternatives with you.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ButtonLink href="/flights" size="lg" className="justify-center">
            <span>Search again</span>
          </ButtonLink>
          <TrackLink
            event="support_click"
            eventProps={{
              context: "a flight fare that expired before confirmation",
              channel: "whatsapp",
            }}
            href={getFlightSupportWhatsAppUrl(
              "a flight fare that expired before confirmation",
              tripContext
            )}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "justify-center border-emerald-600/30 text-emerald-700 hover:bg-emerald-50"
            )}
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </TrackLink>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="min-h-11 touch-manipulation px-4 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Back to results
        </button>
      </div>
    )
  } else if (phase === "error") {
    body = (
      <ErrorState
        preset="general"
        title="We could not confirm this fare."
        error={error}
        onRetry={() => setRetryKey((key) => key + 1)}
        retryLabel="Retry confirmation"
        supportContext={`confirming a live flight fare${display ? ` (${display.airportsLabel})` : ""}`}
      />
    )
  } else {
    // Domestic branch: no Amadeus revalidation — the card already carries
    // live QuickAir facts. Flight summary + total fare only, then straight
    // to checkout. No process notes, no support links.
    const firstSegment = display.journeys[0]?.segments[0]
    const routeMeta = [
      display.duration !== "—" ? display.duration : null,
      display.stopsLabel,
    ]
      .filter((part): part is string => Boolean(part))
      .join(" · ")
    body = (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-muted/50 p-4">
          <p className="text-sm font-bold text-foreground">
            {display.airline}
            {firstSegment?.flightNumber ? (
              <span className="font-semibold text-muted-foreground">
                {" "}
                · {firstSegment.flightNumber}
              </span>
            ) : null}
          </p>
          <p className="font-variant-numeric mt-1 text-2xl font-extrabold text-foreground tabular-nums">
            {display.departureAt} → {display.arrivalAt}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {display.origin} → {display.destination} · {routeMeta}
          </p>
          <div className="mt-3 border-t border-border/60 pt-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Total fare
            </p>
            <p className="font-variant-numeric mt-1 text-lg font-extrabold text-foreground tabular-nums">
              {formatNaira(display.price)} · {display.currency}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            size="lg"
            onClick={() => onContinue(null)}
            className="flex-1 justify-center"
          >
            <span>Continue to checkout</span>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 justify-center"
          >
            <span>Cancel</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false)
      }}
    >
      {/* Conditional Portal inside AnimatePresence: Base UI drops the dialog
          the moment `open` flips, which would cut the Motion exit short —
          holding the Portal for one exit pass lets the backdrop fade and
          popup scale-out actually play on close. */}
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal key="fare-confirm-portal">
            <DialogPrimitive.Backdrop
              render={
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={backdropFadeVariants}
                />
              }
              className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-xs"
            />
            <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
              <DialogPrimitive.Popup
                render={
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={modalScaleVariants}
                  />
                }
                aria-busy={phase === "confirming"}
                className="w-full max-w-lg overscroll-contain rounded-3xl border border-border bg-card p-5 text-foreground shadow-2xl sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <DialogPrimitive.Title
                      ref={titleRef}
                      tabIndex={-1}
                      className="flex items-center gap-2 text-lg font-bold text-balance text-foreground focus:outline-none"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <HugeiconsIcon
                          icon={Airplane01Icon}
                          size={18}
                          aria-hidden="true"
                        />
                      </span>
                      {copy.title}
                    </DialogPrimitive.Title>
                    {copy.description ? (
                      <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {copy.description}
                      </DialogPrimitive.Description>
                    ) : null}
                  </div>
                  <DialogPrimitive.Close
                    aria-label="Close fare confirmation"
                    className="flex size-9 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={18}
                      aria-hidden="true"
                    />
                  </DialogPrimitive.Close>
                </div>
                <div className="mt-4 min-w-0">
                  {fareAnnouncement ? (
                    <p role="alert" className="sr-only">
                      {fareAnnouncement}
                    </p>
                  ) : null}
                  {/* Phase cross-dissolve: exit-before-enter, opacity only, so the
                  dialog container never collapses or twitches between
                  verifying / changed / expired / confirmed states. */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={phase}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={backdropFadeVariants}
                    >
                      {body}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </DialogPrimitive.Popup>
            </DialogPrimitive.Viewport>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
