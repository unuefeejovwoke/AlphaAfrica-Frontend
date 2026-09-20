"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TravellerStepper } from "@/components/ui/traveller-stepper";
import { LoadingState } from "@/components/feedback/loading-state";
import { ErrorState } from "@/components/feedback/error-state";
import { CardSkeleton, InputSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import {
  notifyBookingActionFailed,
  notifyCallbackRequested,
  notifyEnquirySent,
  notifySearchStarted,
} from "@/lib/toast";
import type { TravellerComposition } from "@/lib/schemas/travel";

const fareExample = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
}).format(250000);

export default function FoundationShowcasePage() {
  const [travellers, setTravellers] = React.useState<TravellerComposition>({
    adults: 2,
    children: 1,
    infants: 0,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex max-w-3xl flex-col gap-4">
        <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Phase 1 · Foundation
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
          Foundation Showcase
        </h1>
        <p className="min-w-0 text-base leading-relaxed break-words text-muted-foreground">
          Verify every Phase 1 primitive in one view — brand tokens, buttons, form
          controls, traveller composition, travel-aware loading and error states,
          skeletons, toasts, and Assisted Service. Use this page before starting a
          Guest Booking or submitting an Enquiry…
        </p>
      </div>

      <section aria-labelledby="showcase-typography" className="mt-12">
        <h2 id="showcase-typography" className="text-2xl font-bold tracking-tight text-pretty text-foreground">
          Typography & Brand Tokens
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold text-foreground">Editorial Headings</h3>
            <p className="mt-2 text-sm break-words text-muted-foreground">
              Headings use Title Case and balanced wrapping for rapid scanning.
            </p>
            <div className="mt-4 flex min-w-0 flex-col gap-2">
              <p className="truncate text-xl font-bold text-foreground">Search Flights With Confidence</p>
              <p className="truncate text-base font-semibold text-foreground">Hotels, Packages & Visa Help</p>
              <p className="min-w-0 break-words text-sm text-muted-foreground">
                Body copy stays in second person and names fares like {fareExample} with tabular numerals:{" "}
                <span className="font-variant-numeric font-semibold tabular-nums text-foreground">2 Adults · 1 Child</span>
              </p>
            </div>
          </div>
          <div className="min-w-0 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold text-foreground">Brand Palette</h3>
            <ul className="mt-4 grid min-w-0 grid-cols-2 gap-3 text-xs">
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="size-8 shrink-0 rounded-lg bg-primary" />
                <span className="min-w-0 break-words">Primary <span className="font-variant-numeric tabular-nums">#FF6738</span></span>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="size-8 shrink-0 rounded-lg bg-secondary" />
                <span className="min-w-0 break-words">Plum <span className="font-variant-numeric tabular-nums">#571563</span></span>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="size-8 shrink-0 rounded-lg border border-border bg-background" />
                <span className="min-w-0 break-words">Surface <span className="font-variant-numeric tabular-nums">#FAF9F7</span></span>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="size-8 shrink-0 rounded-lg bg-foreground" />
                <span className="min-w-0 break-words">Ink <span className="font-variant-numeric tabular-nums">#171217</span></span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="showcase-buttons" className="mt-12">
        <h2 id="showcase-buttons" className="text-2xl font-bold tracking-tight text-pretty text-foreground">
          Button Variants
        </h2>
        <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-6">
          <Button type="button">Book a Trip</Button>
          <Button type="button" variant="secondary">Speak With a Specialist</Button>
          <Button type="button" variant="outline">Explore Packages</Button>
          <Button type="button" variant="ghost">View Destinations</Button>
          <Button type="button" variant="destructive">Cancel Booking</Button>
          <Button type="button" variant="link">Read Travel Policies</Button>
          <Button type="button" size="sm">Small Action</Button>
          <Button type="button" size="lg">Large Action</Button>
          <Button render={<Link href="/checkout" />} variant="outline" size="sm">
            Go to Secure Checkout
          </Button>
        </div>
      </section>

      <section aria-labelledby="showcase-forms" className="mt-12">
        <h2 id="showcase-forms" className="text-2xl font-bold tracking-tight text-pretty text-foreground">
          Form Controls & Traveller Composition
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold text-foreground">Customer Enquiry Fields</h3>
            <Input
              label="Email Address"
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="you@example.com…"
              helperText="We reply within one business day."
              defaultValue=""
            />
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+234 800 000 0000…"
              error="Enter a valid phone number so we can reach you."
              defaultValue="abc"
            />
            <Textarea
              label="Travel Plans"
              name="message"
              autoComplete="off"
              placeholder="2 travellers to London in July, budget…"
              helperText="Share dates, destination, and party size."
              defaultValue=""
            />
          </div>
          <div className="min-w-0">
            <TravellerStepper value={travellers} onChange={setTravellers} />
            <p className="mt-2 text-xs break-words text-muted-foreground">
              Traveller (not passenger) counts stay within industry bounds — max 9 per Booking, max 1 infant per adult.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="showcase-loading" className="mt-12">
        <h2 id="showcase-loading" className="text-2xl font-bold tracking-tight text-pretty text-foreground">
          Travel-Aware Loading States
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <LoadingState preset="flights" />
          <LoadingState preset="hotels" />
          <LoadingState preset="price" />
          <LoadingState preset="payment" />
        </div>
      </section>

      <section aria-labelledby="showcase-errors" className="mt-12">
        <h2 id="showcase-errors" className="text-2xl font-bold tracking-tight text-pretty text-foreground">
          Error Recovery With Human Escalation
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ErrorState preset="timeout" onRetry={() => notifySearchStarted("Flights", Promise.resolve())} retryLabel="Retry Search" />
          <ErrorState preset="payment-failed" onRetry={() => notifyBookingActionFailed()} retryLabel="Check Payment" />
        </div>
      </section>

      <section aria-labelledby="showcase-skeletons" className="mt-12">
        <h2 id="showcase-skeletons" className="text-2xl font-bold tracking-tight text-pretty text-foreground">
          Skeleton Placeholders
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <CardSkeleton />
          <InputSkeleton />
          <TableSkeleton rows={3} />
        </div>
      </section>

      <section aria-labelledby="showcase-toasts" className="mt-12">
        <h2 id="showcase-toasts" className="text-2xl font-bold tracking-tight text-pretty text-foreground">
          Toast Notifications
        </h2>
        <div className="mt-4 flex min-w-0 flex-wrap gap-3 rounded-2xl border border-border bg-card p-6">
          <Button type="button" variant="outline" size="sm" onClick={() => notifyEnquirySent("Dubai")}>
            Send Test Enquiry
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => notifyCallbackRequested()}>
            Request Test Callback
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => notifyBookingActionFailed(() => notifyEnquirySent())}
          >
            Simulate Failed Action
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              notifySearchStarted(
                "Hotels",
                new Promise((resolve) => setTimeout(resolve, 1200))
              )
            }
          >
            Start Test Search
          </Button>
        </div>
      </section>

      <section aria-labelledby="showcase-support" className="mt-12">
        <h2 id="showcase-support" className="text-2xl font-bold tracking-tight text-pretty text-foreground">
          Assisted Service Interactions
        </h2>
        <div className="mt-4 min-w-0 rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-bold text-foreground">Talk to a Human Specialist</h3>
          <p className="mt-2 max-w-2xl min-w-0 text-sm leading-relaxed break-words text-muted-foreground">
            The persistent “Need Help?” trigger sits at the bottom-right of every public
            page. Open it to start WhatsApp chat with trip context, call the Abuja desk,
            or request a callback for your Enquiry…
          </p>
          <div className="mt-4 flex min-w-0 flex-wrap gap-3">
            <Button
              render={
                <a
                  href="https://wa.me/2348000000000?text=Hello%20Alphaa%2C%20I%20need%20assistance%20with%20travel%20planning."
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              variant="secondary"
              size="sm"
            >
              Chat on WhatsApp
            </Button>
            <Button render={<a href="tel:+2348000000000" />} variant="outline" size="sm">
              Call Abuja Desk
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
