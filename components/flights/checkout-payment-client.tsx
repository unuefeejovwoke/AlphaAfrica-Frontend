"use client";

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, LockIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  getFlightSupportWhatsAppUrl,
  normalizeFlightOffer,
  readConfirmedOffer,
  readTravellersDraft,
  type FlightOffer,
  type FlightOfferDisplay,
} from "@/lib/api/flights";
import {
  ApiError,
  getHumanErrorMessage,
  getPaymentSafetyCopy,
} from "@/lib/api/client";
import {
  createFlightBooking,
  findReusableBooking,
  hashBookingKey,
  readPendingBooking,
  savePaymentReference,
  savePendingBooking,
} from "@/lib/api/flight-bookings";
import { track } from "@/lib/analytics";
import { TrackLink } from "@/components/analytics/track-link";
import { getSupportWhatsAppUrl } from "@/lib/content/company";
import { formatNaira } from "@/lib/format";
import {
  pluralize,
  type BookingTravellersPayload,
  type TravellerComposition,
} from "@/lib/schemas/travel";

type Phase = "idle" | "creating" | "redirecting" | "failed";

interface LoadedBooking {
  offer: FlightOffer;
  display: FlightOfferDisplay;
  draft: BookingTravellersPayload;
  party: TravellerComposition;
  bookingKey: string;
  resumable: { reference: string; authorization_url: string } | null;
}

function partyFromTravelers(
  travelers: BookingTravellersPayload["travellers"],
): TravellerComposition {
  let adults = 0;
  let children = 0;
  let infants = 0;
  for (const traveler of travelers) {
    if (traveler.traveler_type === "CHILD") children += 1;
    else if (traveler.traveler_type === "HELD_INFANT") infants += 1;
    else adults += 1;
  }
  return { adults, children, infants };
}

function loadBooking(): LoadedBooking | null {
  try {
    const offer = readConfirmedOffer();
    const draft = readTravellersDraft();
    if (!offer || !draft || draft.travellers.length === 0) return null;
    const display = normalizeFlightOffer(offer, 0);
    const party = partyFromTravelers(draft.travellers);
    const bookingKey = hashBookingKey(offer, party);
    return {
      offer,
      display,
      draft,
      party,
      bookingKey,
      resumable: findReusableBooking(readPendingBooking(), bookingKey),
    };
  } catch {
    return null;
  }
}

/**
 * Checkout Step 2 — Pending Booking creation and Paystack handoff.
 * - Persistent trip and price summary (route, dates, party, fare, total, NGN)
 *   stays visible while creation runs and after failure.
 * - Single-flight guard: the pay action is disabled while creating or
 *   redirecting, and a ref marker (vercel: rerender-use-ref-transient-values)
 *   drops double taps without a rerender. An identical retry reuses the
 *   stored pending reference instead of creating a duplicate booking.
 * - Success persists the Payment Reference in sessionStorage (the verify
 *   route in ticket 08 reads it from the return-URL query param built by
 *   buildFlightVerifyUrl) and hands off to the backend-owned Paystack
 *   authorization URL with a full-page redirect — card details are never
 *   collected or stored here. Guest Booking: no login required, and only
 *   the reference travels in URLs — never tokens or sensitive data.
 * - Failure renders human copy plus payment-safety reassurance with retry
 *   and Talk to Alphaa; a return is never treated as success (ticket 08
 *   verifies idempotently).
 */
export function CheckoutPaymentClient() {
  // Session reads plus key derivation run once (vercel: rerender-lazy-state-init).
  const [booking] = React.useState<LoadedBooking | null>(loadBooking);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [failure, setFailure] = React.useState<string | null>(null);
  // Transient in-flight marker: refs avoid a rerender per tap while the
  // disabled button covers the visual state (vercel: rerender-use-ref-transient-values).
  const creationRef = React.useRef<string | null>(null);

  const handlePay = React.useCallback(async () => {
    if (!booking || creationRef.current) return;
    setFailure(null);

    // Payment initiated: coarse funnel props only — never the reference,
    // offer blob, traveller PII, or authorization URL (sanitizer drops them).
    const initiatedProps = {
      currency: booking.display.currency || "NGN",
      travellers: String(booking.draft.travellers.length),
    } as const;

    if (booking.resumable) {
      creationRef.current = booking.resumable.reference;
      setPhase("redirecting");
      savePaymentReference(booking.resumable.reference);
      track("flight_payment_initiated", { ...initiatedProps });
      window.location.href = booking.resumable.authorization_url;
      return;
    }

    creationRef.current = "in-flight";
    setPhase("creating");
    try {
      const result = await createFlightBooking({
        flight_offer: booking.offer,
        travelers: booking.draft.travellers,
        customer: booking.draft.customer,
      });
      creationRef.current = result.reference;
      savePendingBooking({
        key: booking.bookingKey,
        reference: result.reference,
        authorization_url: result.authorization_url,
      });
      savePaymentReference(result.reference);
      track("flight_payment_initiated", { ...initiatedProps });
      setPhase("redirecting");
      window.location.href = result.authorization_url;
    } catch (error) {
      creationRef.current = null;
      setPhase("failed");
      if (error instanceof ApiError && error.reference) {
        savePaymentReference(error.reference);
      }
      setFailure(getHumanErrorMessage(error));
    }
  }, [booking]);

  if (!booking) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-extrabold text-foreground">
          We could not find your booking details
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Your selected flight or traveller details did not carry over. No booking
          was made and no payment was taken. Start a new search or talk to Alphaa
          and we will help you through it.
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
                eventProps={{ context: "a flight payment that could not start", channel: "whatsapp" }}
                href={getSupportWhatsAppUrl("a flight payment I could not start")}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <span>Talk to Alphaa</span>
          </Button>
        </div>
      </div>
    );
  }

  const total = formatNaira(booking.display.price);
  const busy = phase === "creating";
  let payLabel = booking.resumable
    ? `Resume secure payment · ${total}`
    : `Pay ${total} securely`;
  if (phase === "creating") payLabel = "Creating your booking…";
  else if (phase === "failed") payLabel = `Try again · ${total}`;
  const travellerCount = booking.draft.travellers.length;
  const hasDates =
    booking.display.departureAt !== "—" && booking.display.arrivalAt !== "—";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <section
        aria-label="Trip and price summary"
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-extrabold text-foreground">
            {booking.display.airportsLabel}
          </h2>
          <p className="text-sm text-muted-foreground">
            {booking.display.airline} · {booking.display.cabin} ·{" "}
            {pluralize(travellerCount, "traveller")} · Paying contact{" "}
            {booking.draft.customer.name}
          </p>
        </div>
        {hasDates ? (
          <p className="text-sm text-muted-foreground">
            Departs {booking.display.departureAt} · Arrives {booking.display.arrivalAt}
          </p>
        ) : null}
        <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Fare</dt>
            <dd className="font-variant-numeric font-semibold tabular-nums text-foreground">
              {total}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-base font-bold text-foreground">Total due today</dt>
            <dd className="font-variant-numeric text-base font-extrabold tabular-nums text-foreground">
              {total}{" "}
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {booking.display.currency}
              </span>
            </dd>
          </div>
        </dl>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Guest Booking — no account needed. You pay securely on Paystack; card
          details never touch Alphaa.
        </p>
      </section>

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

      {phase === "redirecting" ? (
        <p role="status" aria-live="polite" className="text-center text-sm font-semibold text-primary">
          Taking you to Paystack to complete payment…
        </p>
      ) : (
        <div className="sticky bottom-4 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              onClick={handlePay}
              isLoading={phase === "creating"}
              className="sm:flex-1"
            >
              <HugeiconsIcon icon={LockIcon} size={16} aria-hidden="true" />
              <span>{payLabel}</span>
            </Button>
            <Button
              variant="outline"
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{ context: "a flight payment that did not go through", channel: "whatsapp" }}
                  href={getFlightSupportWhatsAppUrl("a flight payment that did not go through", {
                    origin: booking.display.origin,
                    destination: booking.display.destination,
                    amount: total,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <span>Talk to Alphaa</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
