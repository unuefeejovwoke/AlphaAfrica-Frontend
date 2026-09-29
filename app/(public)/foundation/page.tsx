"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, ButtonLink } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { RadioGroup } from "@/components/ui/radio-group"
import { Select } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog } from "@/components/ui/dialog"
import { Sheet } from "@/components/ui/sheet"
import { Popover } from "@/components/ui/popover"
import { Tooltip } from "@/components/ui/tooltip"
import { Alert } from "@/components/ui/alert"
import { TravellerStepper } from "@/components/ui/traveller-stepper"
import { LoadingState } from "@/components/feedback/loading-state"
import { ErrorState } from "@/components/feedback/error-state"
import {
  CardSkeleton,
  InputSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton"
import {
  notifyBookingActionFailed,
  notifyCallbackRequested,
  notifyEnquirySent,
  notifySearchStarted,
} from "@/lib/toast"
import {
  contactEnquirySchema,
  type ContactEnquiry,
  type TravellerComposition,
} from "@/lib/schemas/travel"
import { company, getSupportWhatsAppUrl } from "@/lib/content/company"

const fareExample = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
}).format(250000)

export default function FoundationShowcasePage() {
  const [travellers, setTravellers] = React.useState<TravellerComposition>({
    adults: 2,
    children: 1,
    infants: 0,
  })
  const [service, setService] = React.useState("flights")
  const [travelClass, setTravelClass] = React.useState("economy")
  const [flexibleDates, setFlexibleDates] = React.useState(true)
  const [agreeTerms, setAgreeTerms] = React.useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactEnquiry>({
    resolver: zodResolver(contactEnquirySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: "flights",
      message: "",
    },
    mode: "onTouched",
    shouldFocusError: true,
  })

  const onEnquirySubmit = handleSubmit((data) => {
    notifyEnquirySent(data.service === "general" ? undefined : data.service)
  })

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
          Verify every Phase 1 primitive in one view — brand tokens, buttons,
          form controls, traveller composition, travel-aware loading and error
          states, skeletons, toasts, and Assisted Service. Use this page before
          starting a Guest Booking or submitting an Enquiry…
        </p>
      </div>

      <section aria-labelledby="showcase-typography" className="mt-12">
        <h2
          id="showcase-typography"
          className="text-2xl font-bold tracking-tight text-pretty text-foreground"
        >
          Typography & Brand Tokens
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold text-foreground">
              Editorial Headings
            </h3>
            <p className="mt-2 text-sm break-words text-muted-foreground">
              Headings use Title Case and balanced wrapping for rapid scanning.
            </p>
            <div className="mt-4 flex min-w-0 flex-col gap-2">
              <p className="truncate text-xl font-bold text-foreground">
                Search Flights With Confidence
              </p>
              <p className="truncate text-base font-semibold text-foreground">
                Hotels, Packages & Visa Help
              </p>
              <p className="min-w-0 text-sm break-words text-muted-foreground">
                Body copy stays in second person and names fares like{" "}
                {fareExample} with tabular numerals:{" "}
                <span className="font-variant-numeric font-semibold text-foreground tabular-nums">
                  2 Adults · 1 Child
                </span>
              </p>
            </div>
          </div>
          <div className="min-w-0 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold text-foreground">Brand Palette</h3>
            <ul className="mt-4 grid min-w-0 grid-cols-2 gap-3 text-xs">
              <li className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-8 shrink-0 rounded-lg bg-primary"
                />
                <span className="min-w-0 break-words">
                  Primary{" "}
                  <span className="font-variant-numeric tabular-nums">
                    #FF6738
                  </span>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-8 shrink-0 rounded-lg bg-secondary"
                />
                <span className="min-w-0 break-words">
                  Plum{" "}
                  <span className="font-variant-numeric tabular-nums">
                    #571563
                  </span>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-8 shrink-0 rounded-lg border border-border bg-background"
                />
                <span className="min-w-0 break-words">
                  Surface{" "}
                  <span className="font-variant-numeric tabular-nums">
                    #FAF9F7
                  </span>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-8 shrink-0 rounded-lg bg-foreground"
                />
                <span className="min-w-0 break-words">
                  Ink{" "}
                  <span className="font-variant-numeric tabular-nums">
                    #171217
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="showcase-buttons" className="mt-12">
        <h2
          id="showcase-buttons"
          className="text-2xl font-bold tracking-tight text-pretty text-foreground"
        >
          Button Variants
        </h2>
        <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-6">
          <Button type="button">Book a Trip</Button>
          <Button type="button" variant="secondary">
            Speak With a Specialist
          </Button>
          <Button type="button" variant="outline">
            Explore Packages
          </Button>
          <Button type="button" variant="ghost">
            View Destinations
          </Button>
          <Button type="button" variant="destructive">
            Cancel Booking
          </Button>
          <Button type="button" variant="link">
            Read Travel Policies
          </Button>
          <Button type="button" size="sm">
            Small Action
          </Button>
          <Button type="button" size="lg">
            Large Action
          </Button>
          <Button type="button" isLoading>
            Saving…
          </Button>
          <ButtonLink href="/checkout" variant="outline" size="sm">
            Go to Secure Checkout
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="showcase-forms" className="mt-12">
        <h2
          id="showcase-forms"
          className="text-2xl font-bold tracking-tight text-pretty text-foreground"
        >
          Form Controls & Traveller Composition
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <form
            noValidate
            onSubmit={onEnquirySubmit}
            className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-6"
          >
            <h3 className="text-lg font-bold text-foreground">
              Customer Enquiry Fields
            </h3>
            <Input
              label="Full Name"
              type="text"
              autoComplete="name"
              placeholder="Adaeze Obi…"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="you@example.com…"
              helperText="We reply within one business day."
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Phone Number"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              spellCheck={false}
              placeholder={`${company.phone.display}…`}
              error={errors.phone?.message}
              {...register("phone")}
            />
            <Controller
              name="service"
              control={control}
              render={({ field }) => (
                <Select
                  label="Service Needed"
                  placeholder="Choose a service…"
                  options={[
                    { value: "flights", label: "Flights" },
                    { value: "hotels", label: "Hotels" },
                    { value: "packages", label: "Packages" },
                    { value: "visa", label: "Visa Assistance" },
                    { value: "cars", label: "Car Rentals" },
                    { value: "general", label: "General Guidance" },
                  ]}
                  value={field.value}
                  onValueChange={field.onChange}
                  error={errors.service?.message}
                />
              )}
            />
            <Textarea
              label="Travel Plans"
              autoComplete="off"
              placeholder="2 travellers to London in July, budget…"
              helperText="Share dates, destination, and party size."
              error={errors.message?.message}
              {...register("message")}
            />
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full justify-center"
            >
              Send Enquiry
            </Button>
          </form>
          <div className="min-w-0">
            <TravellerStepper value={travellers} onChange={setTravellers} />
            <p className="mt-2 text-xs break-words text-muted-foreground">
              Traveller (not passenger) counts stay within industry bounds — max
              9 per Booking, max 1 infant per adult.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="showcase-advanced-forms" className="mt-12">
        <h2
          id="showcase-advanced-forms"
          className="text-2xl font-bold tracking-tight text-pretty text-foreground"
        >
          Select, Checkbox, Radio, Switch & Date Picker
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <Select
              label="Travel Service"
              name="service"
              value={service}
              onValueChange={setService}
              placeholder="Choose a service…"
              helperText="Used to route your Enquiry to the right desk."
              options={[
                { value: "flights", label: "Flights" },
                { value: "hotels", label: "Hotels" },
                { value: "packages", label: "Holiday Packages" },
                { value: "visa", label: "Visa Assistance" },
                { value: "cars", label: "Car Rentals" },
              ]}
            />
            <DatePicker
              label="Preferred Departure Date"
              name="departureDate"
              helperText="Flexible dates get more fare options."
            />
            <RadioGroup
              label="Travel Class"
              name="travelClass"
              value={travelClass}
              onValueChange={setTravelClass}
              options={[
                {
                  value: "economy",
                  label: "Economy",
                  description: "Best value fares",
                },
                {
                  value: "business",
                  label: "Business",
                  description: "Extra comfort & flexibility",
                },
              ]}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <Checkbox
              label="Email me fare alerts for this route"
              name="fareAlerts"
              helperText="One email per day at most."
            />
            <Switch
              label="Flexible dates (±3 days)"
              name="flexibleDates"
              checked={flexibleDates}
              onCheckedChange={setFlexibleDates}
              helperText="We compare nearby dates for lower fares."
            />
            <Checkbox
              label="I agree to the Terms & Conditions"
              name="agreeTerms"
              checked={agreeTerms}
              onCheckedChange={setAgreeTerms}
            />
            <Alert
              tone="info"
              title="Assisted Service Available"
              description="Prefer human help? Open the Need Help widget for WhatsApp or callback support."
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="showcase-overlays" className="mt-12">
        <h2
          id="showcase-overlays"
          className="text-2xl font-bold tracking-tight text-pretty text-foreground"
        >
          Dialog, Sheet, Popover & Tooltip
        </h2>
        <div className="mt-4 flex min-w-0 flex-wrap gap-3 rounded-2xl border border-border bg-card p-6">
          <Dialog
            title="Visa Document Checklist"
            description="Bring these to your Abuja appointment for faster review."
            triggerLabel="Open Dialog"
          >
            <p className="text-sm break-words text-muted-foreground">
              Passport, photos, bank statements, and invitation letter where
              applicable.
            </p>
          </Dialog>
          <Sheet
            title="Fare Conditions"
            description="Side-sheet summary before you commit to payment."
            triggerLabel="Open Sheet"
          >
            <p className="text-sm break-words text-muted-foreground">
              Changes allowed with fee. Refunds per airline policy. Confirm in
              NGN on checkout.
            </p>
          </Sheet>
          <Popover triggerLabel="Fare Help">
            Fares include taxes and carrier fees. Final total shows before
            payment — no hidden markups.
          </Popover>
          <Tooltip
            label="Verified fares"
            content="Checked against live airline inventory in the last hour."
          >
            <span>Verified fares</span>
          </Tooltip>
        </div>
      </section>

      <section aria-labelledby="showcase-loading" className="mt-12">
        <h2
          id="showcase-loading"
          className="text-2xl font-bold tracking-tight text-pretty text-foreground"
        >
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
        <h2
          id="showcase-errors"
          className="text-2xl font-bold tracking-tight text-pretty text-foreground"
        >
          Error Recovery With Human Escalation
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ErrorState
            preset="timeout"
            onRetry={() => notifySearchStarted("Flights", Promise.resolve())}
            retryLabel="Retry Search"
          />
          <ErrorState
            preset="payment-failed"
            onRetry={() => notifyBookingActionFailed()}
            retryLabel="Check Payment"
          />
        </div>
      </section>

      <section aria-labelledby="showcase-skeletons" className="mt-12">
        <h2
          id="showcase-skeletons"
          className="text-2xl font-bold tracking-tight text-pretty text-foreground"
        >
          Skeleton Placeholders
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <CardSkeleton />
          <InputSkeleton />
          <TableSkeleton rows={3} />
        </div>
      </section>

      <section aria-labelledby="showcase-toasts" className="mt-12">
        <h2
          id="showcase-toasts"
          className="text-2xl font-bold tracking-tight text-pretty text-foreground"
        >
          Toast Notifications
        </h2>
        <div className="mt-4 flex min-w-0 flex-wrap gap-3 rounded-2xl border border-border bg-card p-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => notifyEnquirySent("Dubai")}
          >
            Send Test Enquiry
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => notifyCallbackRequested()}
          >
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
        <h2
          id="showcase-support"
          className="text-2xl font-bold tracking-tight text-pretty text-foreground"
        >
          Assisted Service Interactions
        </h2>
        <div className="mt-4 min-w-0 rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-bold text-foreground">
            Talk to a Human Specialist
          </h3>
          <p className="mt-2 max-w-2xl min-w-0 text-sm leading-relaxed break-words text-muted-foreground">
            The persistent “Need Help?” trigger sits at the bottom-right of
            every public page. Open it to start WhatsApp chat with trip context,
            call the Abuja desk, or request a callback for your Enquiry…
          </p>
          <div className="mt-4 flex min-w-0 flex-wrap gap-3">
            <ButtonLink
              href={getSupportWhatsAppUrl("travel planning")}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              size="sm"
            >
              Chat on WhatsApp
            </ButtonLink>
            <ButtonLink
              href={`tel:${company.phone.e164}`}
              variant="outline"
              size="sm"
            >
              Call Abuja Desk
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  )
}
