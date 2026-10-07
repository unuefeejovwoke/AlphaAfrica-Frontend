"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  LockIcon,
  Mail01Icon,
  Message01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { Button, ButtonLink } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneField } from "@/components/ui/phone-field"
import { LegalNotice } from "@/components/legal/legal-notice"
import { track } from "@/lib/analytics"
import {
  ApiError,
  getHumanErrorMessage,
  getPaymentSafetyCopy,
} from "@/lib/api/client"
import {
  carGuestBooking,
  hotelGuestBooking,
  mapGuestFieldErrors,
  NEEDS_ATTENTION_COPY,
  type CarGuestBookingData,
  type HotelGuestBookingData,
} from "@/lib/api/guest-booking"
import {
  findReusableBookingRecord,
  hashPayloadKey,
  readSessionRecord,
  saveSessionRecord,
  saveSessionString,
} from "@/lib/api/shared"
import {
  guestContactSchema,
  type GuestContactInput,
} from "@/lib/api/validation"

type Phase = "idle" | "creating" | "redirecting" | "failed"

export type GuestBookingFormProps =
  | ({ kind: "hotel"; backHref: string } & HotelGuestBookingData)
  | ({ kind: "car"; backHref: string } & CarGuestBookingData)

/**
 * The one Guest Booking form for Hotel and Car (production hardening, 16).
 *
 * Guest Booking with no account gate: one full name plus email plus phone,
 * validated on blur plus on submit plus pre-payment. One phase machine, one
 * field set, one validation and error-handling path, and one payment
 * reassurance voice serve both booking types; only the booking-specific
 * payload building, creation, reuse keys, analytics, and vocabulary differ,
 * and those arrive as data ({@link GuestBookingFormProps} resolves to its
 * setup in `lib/api/guest-booking.ts`). A single-flight guard disables
 * submit and pay actions while creation runs and persists the Payment
 * Reference, so double-taps and retries never create duplicates. Success
 * hands off to the backend-owned Paystack authorization URL; failures map
 * to customer-safe copy with field errors inline and never raw.
 */
export function GuestBookingForm(props: GuestBookingFormProps) {
  const { backHref } = props
  const { booking, copy, supportHref } =
    props.kind === "hotel"
      ? hotelGuestBooking({
          hotel: props.hotel,
          room: props.room,
          stay: props.stay,
        })
      : carGuestBooking({ vehicle: props.vehicle, hire: props.hire })

  const [phase, setPhase] = React.useState<Phase>("idle")
  const [failure, setFailure] = React.useState<string | null>(null)
  const [redirectUrl, setRedirectUrl] = React.useState<string | null>(null)
  // Transient in-flight marker: drops double taps without a rerender while
  // the disabled button covers the visual state.
  const creationRef = React.useRef<string | null>(null)

  const form = useForm<GuestContactInput>({
    resolver: zodResolver(guestContactSchema),
    defaultValues: { guest_name: "", guest_email: "", guest_phone: "" },
    mode: "onTouched",
    shouldFocusError: true,
  })

  // Smooth focus shift to the first missing field on invalid submit.
  // `shouldFocusError` (above) already focuses the field — this only swaps
  // the instant jump for a glide by lending the document smooth scrolling
  // for the duration of the focus scroll, then reverting. Reduced-motion
  // visitors keep the instant jump via the document-wide backstop.
  const handleInvalid = React.useCallback(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof document === "undefined"
    )
      return
    const root = document.documentElement
    const previous = root.style.scrollBehavior
    root.style.scrollBehavior = "smooth"
    window.setTimeout(() => {
      root.style.scrollBehavior = previous
    }, 600)
  }, [])

  const handleSubmit = form.handleSubmit((values) => {
    if (creationRef.current) return
    setFailure(null)
    form.clearErrors("root")

    // Pre-payment gate: booking-specific revalidation before anything
    // reaches the backend (an invalid stay or hire never leaves the device).
    const blocked = booking.prePaymentIssue?.() ?? null
    if (blocked !== null) {
      form.setError("root", { type: "validate", message: blocked })
      return
    }

    let payload: object
    try {
      payload = booking.buildPayload(values)
    } catch {
      form.setError("root", {
        type: "validate",
        message: NEEDS_ATTENTION_COPY,
      })
      return
    }

    const key = hashPayloadKey(payload)
    const reusable = findReusableBookingRecord(
      readSessionRecord(booking.pendingSessionKey),
      key
    )
    // Funnel: currency plus stay/hire length only — never the reference,
    // guest PII, or the authorization URL (ticket 07).
    if (reusable) {
      creationRef.current = reusable.reference
      saveSessionString(booking.referenceSessionKey, reusable.reference)
      setRedirectUrl(reusable.authorization_url)
      setPhase("redirecting")
      track(booking.analyticsEvent, booking.analyticsProps)
      window.location.href = reusable.authorization_url
      return
    }

    creationRef.current = "in-flight"
    setPhase("creating")
    void (async () => {
      try {
        const result = await booking.createBooking(payload)
        creationRef.current = result.reference
        saveSessionRecord(booking.pendingSessionKey, {
          key,
          reference: result.reference,
          authorization_url: result.authorization_url,
        })
        saveSessionString(booking.referenceSessionKey, result.reference)
        setRedirectUrl(result.authorization_url)
        setPhase("redirecting")
        track(booking.analyticsEvent, booking.analyticsProps)
        window.location.href = result.authorization_url
      } catch (error) {
        creationRef.current = null
        setPhase("failed")
        if (error instanceof ApiError) {
          if (error.reference)
            saveSessionString(booking.referenceSessionKey, error.reference)
          const fieldErrors =
            error.fieldErrors === null
              ? []
              : mapGuestFieldErrors(error.fieldErrors)
          for (const { field, message } of fieldErrors) {
            form.setError(field, { type: "server", message })
          }
          setFailure(
            fieldErrors.length > 0
              ? NEEDS_ATTENTION_COPY
              : getHumanErrorMessage(error)
          )
        } else {
          setFailure(getHumanErrorMessage(error))
        }
      }
    })()
  }, handleInvalid)

  const busy = phase === "creating" || phase === "redirecting"
  const rootError =
    (form.formState.errors.root?.message as string | undefined) ?? null

  if (phase === "redirecting") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-xs sm:p-8">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={LockIcon} size={24} aria-hidden="true" />
        </span>
        <h2 className="text-xl font-extrabold text-foreground">
          Taking you to Paystack…
        </h2>
        <p
          role="status"
          aria-live="polite"
          className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground"
        >
          {copy.redirectBody}
        </p>
        {redirectUrl ? (
          <ButtonLink
            href={redirectUrl}
            size="lg"
            className="w-full justify-center"
          >
            <span>Continue to Paystack</span>
          </ButtonLink>
        ) : null}
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label={copy.ariaLabel}
      // Buttons compress via `active:scale-[0.98]` in `ui/button`; invalid
      // submits glide to the first missing field through `handleInvalid`.
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-foreground">{copy.heading}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {copy.intro}
        </p>
      </div>

      <Input
        label="Full name"
        placeholder="e.g. Adaeze Okonkwo"
        autoComplete="name"
        startIcon={
          <HugeiconsIcon icon={UserIcon} size={15} aria-hidden="true" />
        }
        error={form.formState.errors.guest_name?.message}
        {...form.register("guest_name")}
      />
      <Input
        label="Email address"
        placeholder="you@example.com"
        type="email"
        autoComplete="email"
        startIcon={
          <HugeiconsIcon icon={Mail01Icon} size={15} aria-hidden="true" />
        }
        error={form.formState.errors.guest_email?.message}
        {...form.register("guest_email")}
      />
      <Controller
        name="guest_phone"
        control={form.control}
        render={({ field }) => (
          <PhoneField
            label="Phone number"
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder="803 123 4567"
            error={form.formState.errors.guest_phone?.message}
          />
        )}
      />

      {rootError || failure ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 p-3.5 text-xs leading-relaxed text-foreground"
        >
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={16}
            className="mt-0.5 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span>{rootError ?? failure}</span>
            {phase === "failed" ? (
              <span className="text-muted-foreground">
                {getPaymentSafetyCopy()}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          size="lg"
          isLoading={phase === "creating"}
          disabled={busy}
          className="w-full justify-center"
        >
          <HugeiconsIcon icon={LockIcon} size={16} aria-hidden="true" />
          <span>
            {phase === "creating"
              ? copy.submitPendingLabel
              : "Continue to payment"}
          </span>
        </Button>
        <ButtonLink
          href={backHref}
          variant="ghost"
          size="sm"
          aria-disabled={busy || undefined}
          className="w-full justify-center"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} aria-hidden="true" />
          <span>{copy.backLabel}</span>
        </ButtonLink>
        <ButtonLink
          href={supportHref}
          target="_blank"
          rel="noopener noreferrer"
          variant="ghost"
          size="sm"
          className="w-full justify-center"
        >
          <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
          <span>Talk to Alphaa</span>
        </ButtonLink>
      </div>

      <LegalNotice />
    </form>
  )
}
