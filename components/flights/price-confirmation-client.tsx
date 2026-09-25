"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  AlertCircleIcon,
  Clock01Icon,
  Message01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import {
  buildCheckoutPartyQuery,
  confirmFlightPrice,
  getFlightSupportWhatsAppUrl,
  isOfferExpiredError,
  normalizeFlightOffer,
  readSelectedOffer,
  readSelectedParty,
  resolvePriceConfirmation,
  saveConfirmedOffer,
  type FlightOffer,
  type FlightTripContext,
  type PriceConfirmOutcome,
} from "@/lib/api/flights"
import {
  normalizeDomesticCard,
  readSelectedDomesticCard,
  resolveBookingBranch,
  saveConfirmedDomesticCard,
  type DomesticFlightCard,
} from "@/lib/api/domestic"
import { formatNaira } from "@/lib/format"
import { track } from "@/lib/analytics"
import { TrackLink } from "@/components/analytics/track-link"

type ConfirmPhase =
  | "loading"
  | "missing"
  | "confirmed"
  | "changed"
  | "expired"
  | "error"
  | "domestic"

type ChangedOutcome = Extract<PriceConfirmOutcome, { status: "changed" }>

/**
 * Fare-confirmation step (Phase 3, ticket 05) inside the distraction-free
 * checkout shell (ADR-0001). Reads the selected Flight Offer blob from memory
 * (state) with a sessionStorage backup, revalidates via centralized apiPost,
 * and renders one branch: same → traveller entry, changed → fare-diff consent,
 * expired → re-search + Talk to Alphaa. Never books silently.
 *
 * Domestic Flight Cards take an explicit domestic branch: no Amadeus-style
 * revalidation is ever attempted on a card carrying no opaque blob — the
 * card is confirmed as-is and continues to Traveller entry.
 */
export function PriceConfirmationClient() {
  const router = useRouter()
  const [phase, setPhase] = React.useState<ConfirmPhase>("loading")
  const [selectedOffer, setSelectedOffer] = React.useState<FlightOffer | null>(
    null
  )
  const [domesticCard, setDomesticCard] =
    React.useState<DomesticFlightCard | null>(null)
  const [confirmedOffer, setConfirmedOffer] =
    React.useState<FlightOffer | null>(null)
  const [changedOutcome, setChangedOutcome] =
    React.useState<ChangedOutcome | null>(null)
  const [error, setError] = React.useState<unknown | null>(null)

  // Party query forwarded to Traveller entry so the slot count matches the
  // search even though the opaque blob carries no party. Safe counts only.
  const checkoutHref = React.useCallback(() => {
    const party = readSelectedParty()
    return party ? `/checkout?${buildCheckoutPartyQuery(party)}` : "/checkout"
  }, [])

  const runConfirmation = React.useCallback(
    async (selected: FlightOffer) => {
      try {
        const revalidated = await confirmFlightPrice(
          selected.flight_offer ?? selected
        )
        const outcome = resolvePriceConfirmation({
          selected_offer: selected,
          revalidated_offer: revalidated,
        })
        if (outcome.status === "same") {
          saveConfirmedOffer(revalidated)
          setConfirmedOffer(revalidated)
          setPhase("confirmed")
          router.replace(checkoutHref())
        } else if (outcome.status === "changed") {
          setConfirmedOffer(revalidated)
          setChangedOutcome(outcome)
          track("flight_price_changed", {
            direction: outcome.increased ? "increased" : "decreased",
            currency: outcome.currency,
          })
          setPhase("changed")
        } else {
          setPhase("expired")
        }
      } catch (e) {
        if (isOfferExpiredError(e)) {
          setPhase("expired")
        } else {
          setError(e)
          setPhase("error")
        }
      }
    },
    [router, checkoutHref]
  )

  // Mount-only fetch: the opaque blob is client-side (sessionStorage), so the
  // server cannot revalidate. Guarded against StrictMode double-invoke.
  // Domestic cards are checked first and never enter Amadeus revalidation.
  const didRun = React.useRef(false)
  React.useEffect(() => {
    if (didRun.current) return
    didRun.current = true
    const domesticSelected = readSelectedDomesticCard()
    if (domesticSelected) {
      setDomesticCard(domesticSelected)
      // Persist for travellers/payment without ever calling the price endpoint.
      saveConfirmedDomesticCard(domesticSelected)
      saveConfirmedOffer(domesticSelected as unknown as FlightOffer)
      setPhase("domestic")
      return
    }
    const selected = readSelectedOffer()
    if (!selected) {
      setPhase("missing")
      return
    }
    // Defensive: a domestic-shaped blob saved via the legacy key still takes
    // the domestic branch — card fields are never submitted as an opaque blob.
    if (resolveBookingBranch(null, selected) === "domestic") {
      const card = selected as unknown as DomesticFlightCard
      setDomesticCard(card)
      saveConfirmedDomesticCard(card)
      setPhase("domestic")
      return
    }
    setSelectedOffer(selected)
    void runConfirmation(selected)
  }, [runConfirmation])

  const handleRetry = React.useCallback(() => {
    if (domesticCard) {
      setPhase("domestic")
      return
    }
    const selected = selectedOffer ?? readSelectedOffer()
    if (!selected) {
      setPhase("missing")
      return
    }
    setSelectedOffer(selected)
    setError(null)
    setChangedOutcome(null)
    setPhase("loading")
    void runConfirmation(selected)
  }, [selectedOffer, domesticCard, runConfirmation])

  const handleContinue = React.useCallback(() => {
    if (domesticCard) {
      saveConfirmedDomesticCard(domesticCard)
      saveConfirmedOffer(domesticCard as unknown as FlightOffer)
      router.push(checkoutHref())
      return
    }
    if (!confirmedOffer) return
    saveConfirmedOffer(confirmedOffer)
    router.push(checkoutHref())
  }, [confirmedOffer, domesticCard, router, checkoutHref])

  const handleBackToResults = React.useCallback(() => {
    router.back()
  }, [router])

  // Derived during render, not effects (vercel: rerender-derived-state).
  const selectedSummary = React.useMemo(
    () =>
      domesticCard
        ? normalizeDomesticCard(domesticCard, 0)
        : selectedOffer
          ? normalizeFlightOffer(selectedOffer, 0)
          : null,
    [domesticCard, selectedOffer]
  )
  // Trip context for support hatches — route from the selected offer.
  const tripContext = React.useMemo<FlightTripContext>(
    () => ({
      origin: selectedSummary?.origin ?? null,
      destination: selectedSummary?.destination ?? null,
    }),
    [selectedSummary?.origin, selectedSummary?.destination]
  )
  const differenceLabel = changedOutcome
    ? changedOutcome.increased
      ? `+${formatNaira(changedOutcome.difference)} increase`
      : `−${formatNaira(changedOutcome.difference)} decrease`
    : ""

  let content: React.ReactNode
  if (phase === "loading") {
    content = (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HugeiconsIcon icon={Airplane01Icon} size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight text-balance text-foreground">
              Confirming live fare…
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <HugeiconsIcon icon={Clock01Icon} size={14} aria-hidden="true" />
              <span>
                Confirming live fare… airlines are rechecking this price…
              </span>
            </p>
          </div>
        </div>
        <div aria-hidden="true" className="flex min-w-0 flex-col gap-3">
          <div className="h-16 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
          <div className="h-9 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          This usually takes a few seconds. No booking is made and no payment is
          taken at this step.
        </p>
      </div>
    )
  } else if (phase === "confirmed") {
    content = (
      <div
        role="status"
        aria-live="polite"
        className="flex min-w-0 flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-xs"
      >
        <h1 className="text-lg font-extrabold tracking-tight text-foreground">
          Fare confirmed — taking you to traveller details…
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          The airline held this price. You will enter traveller details next.
        </p>
      </div>
    )
  } else if (phase === "changed" && changedOutcome) {
    const changedSupportUrl = getFlightSupportWhatsAppUrl(
      "a flight fare that changed before payment",
      { ...tripContext, amount: formatNaira(changedOutcome.newTotal) }
    )
    content = (
      <div
        role="status"
        aria-live="polite"
        className="flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <span className="w-fit rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
            Airline-updated fare
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-balance text-foreground">
            The airline updated this fare
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {selectedSummary
              ? `${selectedSummary.airline} ${selectedSummary.airportsLabel} — the price changed after your search. `
              : "The price changed after your search. "}
            Review the new fare and continue only if you accept it. No booking
            has been made and no payment has been taken.
          </p>
        </div>

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
                  ? "font-variant-numeric mt-1 text-base font-extrabold text-amber-700 tabular-nums dark:text-amber-400"
                  : "font-variant-numeric mt-1 text-base font-extrabold text-emerald-700 tabular-nums dark:text-emerald-400"
              }
            >
              {differenceLabel}
            </dd>
          </div>
        </dl>

        <div className="sticky bottom-4 flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row">
          <Button
            type="button"
            size="lg"
            onClick={handleContinue}
            className="flex-1 justify-center"
          >
            <span>Continue with {formatNaira(changedOutcome.newTotal)}</span>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={handleBackToResults}
            className="flex-1 justify-center"
          >
            <span>Back to results</span>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="flex-1 justify-center"
            render={
              <TrackLink
                event="support_click"
                eventProps={{
                  context: "a flight fare that changed before payment",
                  channel: "whatsapp",
                }}
                href={changedSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Ask Alphaa</span>
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Prices are in Naira ({changedOutcome.currency}). Continuing takes you
          to traveller details.
        </p>
      </div>
    )
  } else if (phase === "expired") {
    content = (
      <div className="flex min-w-0 flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-balance text-foreground">
          This fare is no longer available
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          The airline withdrew this offer before we could confirm it, so nothing
          was booked and no payment was taken. Search again for fresh live
          fares, or talk to Alphaa and a specialist will check alternatives with
          you.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button render={<Link href="/flights" />} size="lg">
            <span>Search again</span>
          </Button>
          <Button
            render={
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
              />
            }
            variant="outline"
            size="lg"
            className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </Button>
        </div>
        <button
          type="button"
          onClick={handleBackToResults}
          className="min-h-11 touch-manipulation px-4 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Back to results
        </button>
      </div>
    )
  } else if (phase === "error") {
    content = (
      <div className="flex min-w-0 flex-col gap-4">
        <ErrorState
          preset="general"
          title="We could not confirm this fare."
          error={error}
          onRetry={handleRetry}
          retryLabel="Retry confirmation"
          supportContext={`confirming a live flight fare${selectedSummary ? ` (${selectedSummary.airportsLabel})` : ""}`}
        />
        <p className="text-center text-xs text-muted-foreground">
          No booking was made and no payment was taken. Your selected flight is
          kept — retry, or talk to Alphaa for help.
        </p>
      </div>
    )
  } else if (phase === "domestic" && domesticCard && selectedSummary) {
    const domesticSupportUrl = getFlightSupportWhatsAppUrl(
      "a domestic flight I want to book",
      { ...tripContext, amount: formatNaira(selectedSummary.price) }
    )
    content = (
      <div
        role="status"
        aria-live="polite"
        className="flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Domestic flight · Economy
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-balance text-foreground">
            Your domestic flight is ready
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {selectedSummary.airline} {selectedSummary.airportsLabel} ·{" "}
            {selectedSummary.departureAt} → {selectedSummary.arrivalAt} ·{" "}
            {selectedSummary.stopsLabel}. Domestic fares are confirmed
            directly with the airline at booking — no separate revalidation
            step is needed, and nothing has been booked or charged yet.
          </p>
        </div>
        <dl className="grid min-w-0 grid-cols-1 gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Total fare
            </dt>
            <dd className="font-variant-numeric mt-1 text-base font-extrabold text-foreground tabular-nums">
              {formatNaira(selectedSummary.price)} · {selectedSummary.currency}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Route
            </dt>
            <dd className="mt-1 text-base font-bold text-foreground">
              {selectedSummary.airportsLabel}
            </dd>
          </div>
        </dl>
        <div className="sticky bottom-4 flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row">
          <Button
            type="button"
            size="lg"
            onClick={handleContinue}
            className="flex-1 justify-center"
          >
            <span>Continue to traveller details</span>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={handleBackToResults}
            className="flex-1 justify-center"
          >
            <span>Back to results</span>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="flex-1 justify-center"
            render={
              <TrackLink
                event="support_click"
                eventProps={{
                  context: "a domestic flight I want to book",
                  channel: "whatsapp",
                }}
                href={domesticSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Ask Alphaa</span>
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Prices are in Naira. Continuing takes you to traveller details.
        </p>
      </div>
    )
  } else {
    content = (
      <div className="flex min-w-0 flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <HugeiconsIcon icon={Airplane01Icon} size={24} aria-hidden="true" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-balance text-foreground">
          No flight selected
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Choose a flight from the search results first — this step needs a
          selected offer to confirm its live fare.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button render={<Link href="/flights" />} size="lg">
            <span>Back to flights</span>
          </Button>
          <Button
            render={
              <TrackLink
                event="support_click"
                eventProps={{
                  context: "selecting a flight to confirm",
                  channel: "whatsapp",
                }}
                href={getFlightSupportWhatsAppUrl(
                  "selecting a flight to confirm",
                  tripContext
                )}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            variant="outline"
            size="lg"
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <section
      aria-labelledby="fare-confirm-heading"
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10 sm:px-6"
    >
      <span id="fare-confirm-heading" className="sr-only">
        Fare confirmation
      </span>
      <p className="text-center text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        Secure checkout · Confirm live fare
      </p>
      {content}
      <p className="text-center text-xs text-muted-foreground">
        Guest Booking — no account needed. Amounts are in Naira.
      </p>
    </section>
  )
}
