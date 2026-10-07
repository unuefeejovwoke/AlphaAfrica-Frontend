"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  InformationCircleIcon,
  LockIcon,
  Message01Icon,
} from "@hugeicons/core-free-icons"
import { Button, ButtonLink, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CheckoutTripSummary } from "@/components/flights/checkout-trip-summary"
import { TravellerDetailsForm } from "@/components/flights/traveller-details-form"
import { TrackLink } from "@/components/analytics/track-link"
import { getHumanErrorMessage, getPaymentSafetyCopy } from "@/lib/api/client"
import {
  createFlightBooking,
  findReusableBooking,
  hashBookingKey,
  payFlightBooking,
  readPendingBooking,
  readReservationReference,
  resolveCreatePriceReview,
  resolveRestoredBooking,
  savePaymentReference,
  savePendingBooking,
  saveReservationReference,
  verifyFlightBooking,
  type CreatePriceReview,
  type FlightBooking,
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
import { emitVerificationEventOnce } from "@/lib/api/verification"
import { formatNaira } from "@/lib/format"
import { notifyPaymentFailed } from "@/lib/toast"
import {
  draftToTravellerFormValues,
  toTravellersDraft,
  totalTravellers,
  type BookingTravellersPayload,
  type TravellerComposition,
  type TravellerFormValues,
} from "@/lib/schemas/travel"
import type { TravellerSubmitIntent } from "@/components/flights/traveller-details-form"

import {
  ReservationConfirmation,
  getReservedPayErrorMessage,
} from "@/components/flights/reservation-confirmation"

type CheckoutPhase =
  | "idle"
  | "creating"
  | "reserving"
  | "redirecting"
  | "review"
  | "failed"
  | "expired"
  | "restoring"
  | "reserved"
  | "released"
  | "restore_failed"

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

/** Changed fare discovered at Booking creation — never redirected silently. */
interface PriceReviewState {
  review: Extract<CreatePriceReview, { status: "changed" }>
  intent: TravellerSubmitIntent
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

/**
 * One allowlisted analytics event per reservation — coarse counts only, never
 * a reference, PNR, amount, or email. Keyed by reference so a refresh or a
 * retry never double-fires. Payment initiation and completion reuse the
 * existing flight events.
 */
function emitReservationEvent(
  reference: string,
  travellers: number,
  isInternational: boolean
): void {
  emitVerificationEventOnce(
    `${reference}::flight_reservation_created`,
    "flight_reservation_created",
    {
      travellers: String(travellers),
      is_international: isInternational ? "true" : "false",
    }
  )
}

/** Specific, honest copy for a hold that is gone — never a generic error. */
function releasedCopy(booking: FlightBooking): string {
  const status = (booking.status ?? "").trim().toLowerCase()
  const head =
    status === "cancelled"
      ? "This reservation was cancelled, so the seat is no longer held."
      : status === "failed" || status === "expired"
        ? "This reservation could not be held, so the seat is no longer available."
        : "Your hold has passed its pay-by date and the airline released your seat."
  return `${head} No payment was taken. Search again for a fresh fare.`
}

/**
 * False during SSR and the first hydration render, true afterwards. Session
 * storage is client-only, so rendering it before hydration would produce a
 * server/client mismatch (vercel: rendering-hydration-no-flicker).
 */
const emptySubscribe = () => () => {}

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
 * results page, so either action validates the form, reuses or creates the
 * Booking with one identical create call, and then differs only in what
 * happens next: pay now hands off to Paystack without another screen, while
 * reserve keeps the Customer here on a terminal in-place confirmation of what
 * they hold (ADR-0007).
 *
 * Money-path guarantees:
 * - The duplicate-prevention key covers the offer, travellers, and contact,
 *   so edited details never reuse a Booking created for other people — and an
 *   identical retry reuses one Booking rather than holding a second seat.
 * - A fare that changes during creation opens a consent panel instead of a
 *   silent redirect or a silent hold (when the backend returns the final
 *   amount). Declining stores nothing, so the declined fare is never resumed.
 * - The success redirect uses `location.replace`, so Back cannot return to a
 *   checkout that has already handed off.
 * - Session storage holds the reservation reference ONLY. Every load re-reads
 *   the live Booking; nothing cached is trusted.
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
  const [reservation, setReservation] = React.useState<FlightBooking | null>(
    null
  )
  const [releasedMessage, setReleasedMessage] = React.useState<string | null>(
    null
  )
  const [payingReserved, setPayingReserved] = React.useState(false)
  const [reservedPayError, setReservedPayError] = React.useState<string | null>(
    null
  )
  const [clearedDraft, setClearedDraft] = React.useState(false)
  const [submittedValues, setSubmittedValues] =
    React.useState<TravellerFormValues | null>(null)
  // Transient in-flight marker: refs avoid a rerender per tap while the
  // disabled button covers the visual state (vercel: rerender-use-ref-transient-values).
  const inFlightRef = React.useRef(false)
  const checkoutStartedRef = React.useRef(false)
  const restoredRef = React.useRef(false)

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

  /**
   * Settle a stored reservation reference into a terminal page state: paid
   * routes to the confirmation, released reports the honest reason, reserved
   * renders the hold — and anything else (e.g. a still-settling `pending`) is
   * unsettled, which retries rather than offering a payment that cannot
   * succeed or claiming a release that never happened.
   */
  const settleReservation = React.useCallback(
    async (
      reference: string,
      analytics?: { travellers: number; isInternational: boolean },
      loadFailure?: string,
      isCancelled?: () => boolean
    ): Promise<void> => {
      const cancelled = () => isCancelled?.() ?? false
      let booking: FlightBooking
      try {
        booking = await verifyFlightBooking(reference)
      } catch {
        if (cancelled()) return
        setFailure(
          loadFailure ??
            "We could not load your reservation just now. No payment was taken — check again in a moment."
        )
        setPhase("restore_failed")
        return
      }
      if (cancelled()) return
      switch (resolveRestoredBooking(booking)) {
        case "paid":
          window.location.replace(
            `/order?reference=${encodeURIComponent(reference)}`
          )
          return
        case "released":
          setReleasedMessage(releasedCopy(booking))
          setPhase("released")
          return
        case "reserved":
          setReservation(booking)
          setPhase("reserved")
          if (analytics) {
            emitReservationEvent(
              reference,
              analytics.travellers,
              analytics.isInternational
            )
          }
          return
        case "unsettled":
          setFailure(
            "We checked with the airline and your hold is not confirmed yet. No payment was taken — check again in a moment rather than paying twice."
          )
          setPhase("restore_failed")
          return
      }
    },
    []
  )

  const handlePay = React.useCallback(
    async (payload: BookingTravellersPayload, intent: TravellerSubmitIntent) => {
      if (!data || inFlightRef.current) return
      inFlightRef.current = true
      setFailure(null)
      setReservedPayError(null)
      // Persist first: a failed creation plus a refresh must never lose what
      // the guest typed (the draft also prefills the form on remount).
      saveTravellersDraft(payload)
      setSubmittedValues(
        draftToTravellerFormValues(data.party, toTravellersDraft(payload))
      )

      const bookingKey = hashBookingKey(
        data.offer,
        payload.travellers,
        payload.customer
      )
      const resumable = findReusableBooking(readPendingBooking(), bookingKey)
      if (resumable) {
        // An identical retry reuses the one Booking — never a second seat —
        // whichever action the Customer chose this time.
        if (intent === "pay_now") {
          handOffToPaystack({
            reference: resumable.reference,
            authorization_url: resumable.authorization_url,
            bookingKey,
            travellers: payload.travellers.length,
          })
          return
        }
        saveReservationReference(resumable.reference)
        setPhase("restoring")
        await settleReservation(resumable.reference, {
          travellers: payload.travellers.length,
          isInternational: data.isInternational,
        })
        inFlightRef.current = false
        return
      }

      setPhase(intent === "reserve" ? "reserving" : "creating")
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
          // Nothing was charged: hold the outcome and ask for consent. The
          // Booking is stored only on acceptance, so a declined fare can never
          // be silently resumed later — on either action.
          setPriceReview({
            review,
            intent,
            reference: result.reference,
            authorization_url: result.authorization_url,
            bookingKey,
            travellers: payload.travellers.length,
          })
          setPhase("review")
          inFlightRef.current = false
          return
        }
        if (intent === "pay_now") {
          handOffToPaystack({
            reference: result.reference,
            authorization_url: result.authorization_url,
            bookingKey,
            travellers: payload.travellers.length,
          })
          return
        }
        // Reserve: the seat is already held by the create call. Persist the
        // attempt for duplicate prevention AND the reservation reference for
        // refresh/Back — then read back the live Booking and stay in place.
        savePendingBooking({
          key: bookingKey,
          reference: result.reference,
          authorization_url: result.authorization_url,
        })
        savePaymentReference(result.reference)
        saveReservationReference(result.reference)
        setPhase("restoring")
        await settleReservation(
          result.reference,
          {
            travellers: payload.travellers.length,
            isInternational: data.isInternational,
          },
          `Your seat was reserved under reference ${result.reference}, but we could not load its details just now. No payment was taken — refresh to see your reservation.`
        )
        inFlightRef.current = false
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
    if (!priceReview || !data || inFlightRef.current) return
    if (priceReview.intent === "pay_now") {
      handOffToPaystack({
        reference: priceReview.reference,
        authorization_url: priceReview.authorization_url,
        bookingKey: priceReview.bookingKey,
        travellers: priceReview.travellers,
      })
      return
    }
    // Reserve with the new fare: same post-creation behaviour as the
    // unchanged-fare path — persist, re-read the live Booking, stay in place.
    inFlightRef.current = true
    savePendingBooking({
      key: priceReview.bookingKey,
      reference: priceReview.reference,
      authorization_url: priceReview.authorization_url,
    })
    savePaymentReference(priceReview.reference)
    saveReservationReference(priceReview.reference)
    const reference = priceReview.reference
    const travellers = priceReview.travellers
    const isInternational = data.isInternational
    setPriceReview(null)
    setPhase("restoring")
    void settleReservation(
      reference,
      { travellers, isInternational },
      `Your seat was reserved under reference ${reference}, but we could not load its details just now. No payment was taken — refresh to see your reservation.`
    ).finally(() => {
      inFlightRef.current = false
    })
  }, [priceReview, data, handOffToPaystack, settleReservation])

  const handleDeclineChangedPrice = React.useCallback(() => {
    // The Booking stays unstored and uncharged; a later action creates a
    // fresh one, so the declined fare is never resumed silently.
    setPriceReview(null)
    setPhase("idle")
  }, [])

  // Coming back to a Reservation (refresh, Back, same device): re-read the
  // live Booking rather than trusting anything cached. Still held → the
  // confirmation; already paid → the confirmation page; released → the honest
  // reason with a route back to search, never a doomed payment.
  React.useEffect(() => {
    if (!hydrated || restoredRef.current) return
    restoredRef.current = true
    const reference = readReservationReference()
    if (!reference) return
    setPhase("restoring")
    let cancelled = false
    void settleReservation(reference, undefined, undefined, () => cancelled)
    return () => {
      cancelled = true
    }
  }, [hydrated, settleReservation])

  // Pay immediately anyway from the reservation confirmation. Completing ends
  // on the same confirmation a direct payment produces (`/order`), because the
  // Paystack return target is the order page for both routes.
  const handlePayReserved = React.useCallback(async () => {
    if (!reservation || payingReserved) return
    setPayingReserved(true)
    setReservedPayError(null)
    try {
      const result = await payFlightBooking({
        reference: reservation.reference,
      })
      if (result.kind === "checkout") {
        savePaymentReference(reservation.reference)
        window.location.replace(result.authorization_url)
        return
      }
      window.location.replace(
        `/order?reference=${encodeURIComponent(reservation.reference)}`
      )
    } catch (error) {
      setReservedPayError(getReservedPayErrorMessage(error))
      setPayingReserved(false)
    }
  }, [reservation, payingReserved])

  const handleClearDraft = React.useCallback(() => {
    clearTravellersDraft()
    setClearedDraft(true)
  }, [])

  const handleRetryRestore = React.useCallback(() => {
    const reference = readReservationReference()
    if (!reference) {
      setPhase("idle")
      return
    }
    setPhase("restoring")
    setFailure(null)
    void settleReservation(reference)
  }, [settleReservation])

  if (!hydrated || !session) return <CheckoutSkeleton />

  // The Reservation confirmation is a phase of this page, not a route: the
  // Customer stays on the checkout URL and the progress header keeps showing
  // Checkout as the current step. It renders from the Booking and survives
  // refresh and Back via the stored reference alone.
  if (phase === "restoring") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 py-8 text-center">
        <p
          role="status"
          aria-live="polite"
          className="text-sm font-semibold text-primary"
        >
          Loading your reservation…
        </p>
        <CheckoutSkeleton />
      </div>
    )
  }

  if (phase === "reserved" && reservation) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <ReservationConfirmation
          booking={reservation}
          onPayNow={handlePayReserved}
          paying={payingReserved}
          payError={reservedPayError}
        />
      </div>
    )
  }

  if (phase === "released") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
          <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-extrabold text-foreground">
          This seat is no longer held
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {releasedMessage ??
            "The airline released your seat, so it can no longer be paid for. No payment was taken."}
        </p>
        <div className="flex flex-col items-center gap-2 pt-1 sm:flex-row">
          <ButtonLink href="/flights">
            <span>Search flights again</span>
          </ButtonLink>
          <TrackLink
            event="support_click"
            eventProps={{
              context: "a flight reservation that expired",
              channel: "whatsapp",
            }}
            href={getSupportWhatsAppUrl("a flight reservation that expired")}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <span>Talk to Alphaa</span>
          </TrackLink>
        </div>
      </div>
    )
  }

  if (phase === "restore_failed") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-extrabold text-foreground">
          We couldn&apos;t load your reservation
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {failure ?? "No payment was taken."} {getPaymentSafetyCopy()}
        </p>
        <div className="flex flex-col items-center gap-2 pt-1 sm:flex-row">
          <Button type="button" onClick={handleRetryRestore}>
            <span>Try again</span>
          </Button>
          <ButtonLink href="/flights" variant="outline">
            <span>Search flights again</span>
          </ButtonLink>
        </div>
      </div>
    )
  }

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
          <ButtonLink href="/flights">
            <span>Search flights again</span>
          </ButtonLink>
          <TrackLink
            event="support_click"
            eventProps={{
              context: "a flight fare that expired before booking",
              channel: "whatsapp",
            }}
            href={getSupportWhatsAppUrl("a flight fare that expired")}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <span>Talk to Alphaa</span>
          </TrackLink>
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
          <ButtonLink href="/flights">
            <span>Search flights again</span>
          </ButtonLink>
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
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <span>Talk to Alphaa</span>
          </TrackLink>
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
  const reserving = phase === "reserving"
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
            intent={priceReview.intent}
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
              isReserving={reserving}
              submitLabel={`Pay ${total}`}
              submittingLabel={
                phase === "redirecting"
                  ? "Taking you to Paystack…"
                  : "Creating your booking…"
              }
              allowReserve={isInternational}
              reserveLabel={`Reserve — pay ${total} later`}
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
  intent,
  display,
  total,
  trip,
  onAccept,
  onDecline,
}: {
  review: Extract<CreatePriceReview, { status: "changed" }>
  intent: TravellerSubmitIntent
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
          <span>
            {intent === "reserve"
              ? `Reserve with ${formatNaira(review.newTotal)}`
              : `Continue with ${formatNaira(review.newTotal)}`}
          </span>
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
        className={cn(
          buttonVariants({ variant: "ghost", size: "lg" }),
          "w-full justify-center"
        )}
      >
        <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
        <span>Ask Alphaa</span>
      </TrackLink>
      <p className="text-center text-xs text-muted-foreground">
        Prices are in {review.currency}. {display.airline}{" "}
        {display.airportsLabel} · approved total {total}.
      </p>
    </section>
  )
}
