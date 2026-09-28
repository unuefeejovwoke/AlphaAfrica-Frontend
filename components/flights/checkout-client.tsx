"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  InformationCircleIcon,
  LockIcon,
  Message01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckoutTripSummary } from "@/components/flights/checkout-trip-summary"
import { TravellerDetailsForm } from "@/components/flights/traveller-details-form"
import { TrackLink } from "@/components/analytics/track-link"
import { getHumanErrorMessage, getPaymentSafetyCopy } from "@/lib/api/client"
import {
  createFlightBooking,
  findReusableBooking,
  hashBookingKey,
  readPendingBooking,
  resolveCreatePriceReview,
  savePaymentReference,
  savePendingBooking,
  type CreatePriceReview,
} from "@/lib/api/flight-bookings"
import { isDomesticSearch } from "@/lib/api/domestic"
import {
  clearTravellersDraft,
  extractOpaqueOfferBlob,
  getFlightSupportWhatsAppUrl,
  isConfirmedOfferStale,
  isOfferExpiredError,
  normalizeFlightOffer,
  readConfirmedOffer,
  readConfirmedOfferSavedAt,
  clearConfirmedOffer,
  readSelectedParty,
  readTravellersDraft,
  saveTravellersDraft,
  type FlightOffer,
  type FlightOfferDisplay,
  type FlightTripContext,
} from "@/lib/api/flights"
import { getSupportWhatsAppUrl } from "@/lib/content/company"
import { track } from "@/lib/analytics"
import { formatNaira } from "@/lib/format"
import { notifyPaymentFailed } from "@/lib/toast"
import {
  draftToTravellerFormValues,
  totalTravellers,
  type BookingTravellersPayload,
  type TravellerComposition,
  type TravellerFormValues,
} from "@/lib/schemas/travel"

type CheckoutPhase =
  | "idle"
  | "creating"
  | "redirecting"
  | "review"
  | "failed"
  | "expired"

interface LoadedCheckout {
  offer: FlightOffer
  display: FlightOfferDisplay
  party: TravellerComposition
  isInternational: boolean
  /** Restored draft matching the party, or null when nothing matched. */
  initialValues: TravellerFormValues | null
}

type CheckoutSession =
  | { kind: "missing" }
  | { kind: "expired" }
  | { kind: "ready"; data: LoadedCheckout }

/** Changed fare discovered at Pending Booking creation — never redirected silently. */
interface PriceReviewState {
  review: Extract<CreatePriceReview, { status: "changed" }>
  reference: string
  authorization_url: string
  bookingKey: string
  travellers: number
}

/** One Paystack handoff: what to persist and where to send the guest. */
interface PaystackHandoff {
  reference: string
  authorization_url: string
  bookingKey: string
  travellers: number
}

/**
 * Resolve the session-backed checkout inputs exactly once after hydration.
 * The URL party (when the search step forwarded one) wins; the session party
 * covers the retired /checkout/payment redirect and direct visits.
 */
function loadCheckoutSession(
  urlParty: TravellerComposition | null
): CheckoutSession {
  try {
    const offer = readConfirmedOffer()
    if (!offer) return { kind: "missing" }
    const display = normalizeFlightOffer(offer, 0)
    const party = urlParty ??
      readSelectedParty() ?? { adults: 1, children: 0, infants: 0 }
    const isInternational = !isDomesticSearch(
      display.origin,
      display.destination
    )
    // QuickAir `search_id` windows are short: a stale domestic offer must
    // re-search instead of booking a dead fare.
    if (!isInternational && isConfirmedOfferStale(readConfirmedOfferSavedAt())) {
      return { kind: "expired" }
    }
    const draft = readTravellersDraft()
    return {
      kind: "ready",
      data: {
        offer,
        display,
        party,
        isInternational,
        initialValues: draft ? draftToTravellerFormValues(party, draft) : null,
      },
    }
  } catch {
    return { kind: "missing" }
  }
}

const emptySubscribe = () => () => {}

/**
 * False during SSR and the first hydration render, true afterwards. Session
 * storage is client-only, so rendering it before hydration would produce a
 * server/client mismatch (vercel: rendering-hydration-no-flicker).
 */
function useHydrated(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

/** Layout-matching placeholder for SSR, Suspense, and pre-hydration. */
export function CheckoutSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading checkout"
      className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  )
}

export interface CheckoutClientProps {
  /** Party validated on the server from the URL, when present. */
  urlParty: TravellerComposition | null
}

/**
 * Checkout — Traveller details, Trip and price summary, and payment in one
 * step (PRD §8.3, revised flow). Fare confirmation already happened on the
 * results page, so Pay validates the form, reuses or creates the Pending
 * Booking, and hands off to Paystack without another screen.
 *
 * Money-path guarantees:
 * - The duplicate-prevention key covers the offer, travellers, and contact,
 *   so edited details never reuse a Pending Booking created for other people.
 * - A fare that changes during creation opens a consent panel instead of a
 *   silent Paystack redirect (when the backend returns the final amount).
 * - The success redirect uses `location.replace`, so Back cannot return to a
 *   checkout that has already handed off.
 */
export function CheckoutClient({ urlParty }: CheckoutClientProps) {
  const hydrated = useHydrated()
  const session = React.useMemo(
    () => (hydrated ? loadCheckoutSession(urlParty) : null),
    [hydrated, urlParty]
  )
  const [phase, setPhase] = React.useState<CheckoutPhase>("idle")
  const [failure, setFailure] = React.useState<string | null>(null)
  const [priceReview, setPriceReview] = React.useState<PriceReviewState | null>(
    null
  )
  const [clearedDraft, setClearedDraft] = React.useState(false)
  const [submittedValues, setSubmittedValues] =
    React.useState<TravellerFormValues | null>(null)
  // Transient in-flight marker: refs avoid a rerender per tap while the
  // disabled button covers the visual state (vercel: rerender-use-ref-transient-values).
  const inFlightRef = React.useRef(false)
  const checkoutStartedRef = React.useRef(false)

  const isReady = session?.kind === "ready"
  const data = isReady ? session.data : null

  // Checkout started: fire once per ready session with coarse counts only.
  // Deliberately gated on a real Confirmed Offer — an empty-state visit is not
  // a started checkout (the retired traveller component counted it anyway).
  React.useEffect(() => {
    if (!data || checkoutStartedRef.current) return
    checkoutStartedRef.current = true
    track("flight_checkout_started", {
      travellers: String(totalTravellers(data.party)),
      is_international: data.isInternational ? "true" : "false",
    })
  }, [data])

  /**
   * Single Paystack handoff: persist the attempt, fire the funnel event, and
   * leave with replace() so Back never returns to a checkout that already
   * handed off.
   */
  const handOffToPaystack = React.useCallback(
    (handoff: PaystackHandoff) => {
      savePendingBooking({
        key: handoff.bookingKey,
        reference: handoff.reference,
        authorization_url: handoff.authorization_url,
      })
      savePaymentReference(handoff.reference)
      track("flight_payment_initiated", {
        currency: data?.display.currency || "NGN",
        travellers: String(handoff.travellers),
      })
      setPhase("redirecting")
      window.location.replace(handoff.authorization_url)
    },
    [data]
  )

  const handlePay = React.useCallback(
    async (payload: BookingTravellersPayload) => {
      if (!data || inFlightRef.current) return
      inFlightRef.current = true
      setFailure(null)
      // Persist first: a failed creation plus a refresh must never lose what
      // the guest typed (the draft also prefills the form on remount).
      saveTravellersDraft(payload)
      setSubmittedValues(draftToTravellerFormValues(data.party, payload))

      const bookingKey = hashBookingKey(
        data.offer,
        payload.travellers,
        payload.customer
      )
      const resumable = findReusableBooking(readPendingBooking(), bookingKey)
      if (resumable) {
        handOffToPaystack({
          reference: resumable.reference,
          authorization_url: resumable.authorization_url,
          bookingKey,
          travellers: payload.travellers.length,
        })
        return
      }

      setPhase("creating")
      try {
        const result = await createFlightBooking({
          // The backend re-prices the Amadeus offer on create; send the opaque
          // blob (`raw_offer`), never the normalized display card. Domestic
          // cards carry no blob, so the QuickAir card itself is the payload —
          // the apidoc does not yet document that shape (regression-tested).
          flight_offer: extractOpaqueOfferBlob(data.offer),
          travelers: payload.travellers,
          customer: payload.customer,
        })
        const review = resolveCreatePriceReview({
          confirmedTotal: data.display.price,
          result,
        })
        if (review.status === "changed") {
          // Nothing was charged: hold the redirect and ask for consent. The
          // Pending Booking is stored only on acceptance, so a declined price
          // can never be silently resumed later.
          setPriceReview({
            review,
            reference: result.reference,
            authorization_url: result.authorization_url,
            bookingKey,
            travellers: payload.travellers.length,
          })
          setPhase("review")
          inFlightRef.current = false
          return
        }
        handOffToPaystack({
          reference: result.reference,
          authorization_url: result.authorization_url,
          bookingKey,
          travellers: payload.travellers.length,
        })
      } catch (error) {
        // The airline withdrew the fare (or the QuickAir search window
        // lapsed): the dead card is dropped so it can never be resubmitted —
        // the guest re-searches for a fresh fare instead.
        if (isOfferExpiredError(error)) {
          clearConfirmedOffer()
          setPhase("expired")
          inFlightRef.current = false
          return
        }
        const message = getHumanErrorMessage(error)
        setPhase("failed")
        setFailure(message)
        // The inline alert sits above a long form; the toast guarantees the
        // guest sees the failure wherever they are on the page.
        notifyPaymentFailed(message)
        inFlightRef.current = false
      }
    },
    [data, handOffToPaystack]
  )

  const handleAcceptChangedPrice = React.useCallback(() => {
    if (!priceReview) return
    handOffToPaystack({
      reference: priceReview.reference,
      authorization_url: priceReview.authorization_url,
      bookingKey: priceReview.bookingKey,
      travellers: priceReview.travellers,
    })
  }, [priceReview, handOffToPaystack])

  const handleDeclineChangedPrice = React.useCallback(() => {
    // The Pending Booking stays unstored and uncharged; a later Pay creates a
    // fresh one, so the declined fare is never resumed silently.
    setPriceReview(null)
    setPhase("idle")
  }, [])

  const handleClearDraft = React.useCallback(() => {
    clearTravellersDraft()
    setClearedDraft(true)
  }, [])

  if (!hydrated || !session) return <CheckoutSkeleton />

  if (session.kind === "expired" || phase === "expired") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
          <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-extrabold text-foreground">
          This fare has expired — search again for a fresh price
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          The airline released this fare before booking completed, so it can
          no longer be reserved. No booking was made and no payment was taken.
          Run a fresh search — live fares refresh every few minutes.
        </p>
        <div className="flex flex-col items-center gap-2 pt-1 sm:flex-row">
          <Button render={<Link href="/flights" />}>
            <span>Search flights again</span>
          </Button>
          <Button
            variant="outline"
            render={
              <TrackLink
                event="support_click"
                eventProps={{
                  context: "a flight fare that expired before booking",
                  channel: "whatsapp",
                }}
                href={getSupportWhatsAppUrl("a flight fare that expired")}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <span>Talk to Alphaa</span>
          </Button>
        </div>
      </div>
    )
  }

  if (session.kind === "missing") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-extrabold text-foreground">
          We could not find your booking details
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Your selected flight or traveller details did not carry over. No
          booking was made and no payment was taken. Start a new search or talk
          to Alphaa and we will help you through it.
        </p>
        <div className="flex flex-col items-center gap-2 pt-1 sm:flex-row">
          <Button render={<Link href="/flights" />}>
            <span>Search flights again</span>
          </Button>
          <Button
            variant="outline"
            render={
              <TrackLink
                event="support_click"
                eventProps={{
                  context: "a flight payment that could not start",
                  channel: "whatsapp",
                }}
                href={getSupportWhatsAppUrl(
                  "a flight payment I could not start"
                )}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <span>Talk to Alphaa</span>
          </Button>
        </div>
      </div>
    )
  }

  const { display, party, isInternational } = session.data
  const total = formatNaira(display.price)
  const tripContext: FlightTripContext = {
    origin: display.origin,
    destination: display.destination,
    amount: display.price === "—" ? null : total,
    adults: party.adults,
    children: party.children,
    infants: party.infants,
  }
  const restoredNotice =
    session.data.initialValues !== null &&
    !clearedDraft &&
    submittedValues === null
  const initialValues = clearedDraft
    ? null
    : (submittedValues ?? session.data.initialValues)
  const submitting = phase === "creating" || phase === "redirecting"
  const showConsent = phase === "review" && priceReview !== null

  return (
    <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
      <div className="flex min-w-0 flex-col gap-5">
        {restoredNotice ? (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-relaxed text-foreground"
          >
            <span className="flex min-w-0 items-start gap-2.5">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                size={18}
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span>
                We restored the traveller details you entered earlier. Clear
                them if this is a different booking.
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearDraft}
            >
              <span>Clear</span>
            </Button>
          </div>
        ) : null}

        {phase === "failed" && failure ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm leading-relaxed text-foreground"
          >
            <HugeiconsIcon
              icon={AlertCircleIcon}
              size={18}
              className="mt-0.5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-semibold">Your booking was not created.</p>
              <p>{failure}</p>
              <p className="text-muted-foreground">{getPaymentSafetyCopy()}</p>
            </div>
          </div>
        ) : null}

        {showConsent && priceReview ? (
          <ChangedFarePanel
            review={priceReview.review}
            display={display}
            total={total}
            trip={tripContext}
            onAccept={handleAcceptChangedPrice}
            onDecline={handleDeclineChangedPrice}
          />
        ) : (
          <>
            {phase === "redirecting" ? (
              <p
                role="status"
                aria-live="polite"
                className="text-center text-sm font-semibold text-primary"
              >
                Taking you to Paystack to complete payment…
              </p>
            ) : null}
            <TravellerDetailsForm
              key={clearedDraft ? "cleared" : "restored"}
              party={party}
              isInternational={isInternational}
              initialValues={initialValues}
              onSubmit={handlePay}
              isSubmitting={submitting}
              submitLabel={
                phase === "failed"
                  ? `Try again · ${total}`
                  : `Pay ${total} securely`
              }
              submittingLabel={
                phase === "redirecting"
                  ? "Taking you to Paystack…"
                  : "Creating your booking…"
              }
              stickyNotice="The final amount is confirmed on Paystack before any charge."
              trip={tripContext}
            />
          </>
        )}
      </div>

      <aside aria-label="Trip and price summary" className="min-w-0">
        <CheckoutTripSummary
          display={display}
          party={party}
          contactName={initialValues?.customer.name ?? null}
        />
      </aside>
    </div>
  )
}

/**
 * Changed-fare consent shown when creation re-prices above/below the approved
 * total. Mirrors the results-page fare dialog branches: nothing is charged
 * until the guest accepts, and declining returns to an editable checkout.
 */
function ChangedFarePanel({
  review,
  display,
  total,
  trip,
  onAccept,
  onDecline,
}: {
  review: Extract<CreatePriceReview, { status: "changed" }>
  display: FlightOfferDisplay
  total: string
  trip: FlightTripContext
  onAccept: () => void
  onDecline: () => void
}) {
  const differenceLabel = review.increased
    ? `+${formatNaira(review.difference)} increase`
    : `−${formatNaira(review.difference)} decrease`
  return (
    <section
      aria-label="Updated fare"
      className="flex flex-col gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6"
    >
      <div role="status" className="flex flex-col gap-2">
        <h2 className="text-xl font-extrabold text-foreground">
          The airline updated this fare
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The price changed while we were creating your booking. Review the new
          fare and continue only if you accept it. Nothing has been charged yet.
        </p>
      </div>
      <dl className="grid min-w-0 grid-cols-1 gap-3 rounded-xl bg-card/70 p-4 sm:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Approved fare
          </dt>
          <dd className="font-variant-numeric mt-1 text-base font-bold text-muted-foreground tabular-nums line-through">
            {formatNaira(review.previousTotal)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            New fare
          </dt>
          <dd className="font-variant-numeric mt-1 text-base font-extrabold text-foreground tabular-nums">
            {formatNaira(review.newTotal)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Difference
          </dt>
          <dd
            className={
              review.increased
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
          onClick={onAccept}
          className="flex-1 justify-center"
        >
          <HugeiconsIcon icon={LockIcon} size={16} aria-hidden="true" />
          <span>Continue with {formatNaira(review.newTotal)}</span>
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={onDecline}
          className="flex-1 justify-center"
        >
          <span>Back to checkout</span>
        </Button>
      </div>
      <Button
        size="lg"
        variant="ghost"
        className="w-full justify-center"
        render={
          <TrackLink
            event="support_click"
            eventProps={{
              context: "a flight fare that changed before payment",
              channel: "whatsapp",
            }}
            href={getFlightSupportWhatsAppUrl(
              "a flight fare that changed before payment",
              { ...trip, amount: formatNaira(review.newTotal) }
            )}
            target="_blank"
            rel="noopener noreferrer"
          />
        }
      >
        <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
        <span>Ask Alphaa</span>
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Prices are in {review.currency}. {display.airline}{" "}
        {display.airportsLabel} · approved total {total}.
      </p>
    </section>
  )
}
