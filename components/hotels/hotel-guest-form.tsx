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
import { track } from "@/lib/analytics"
import {
  ApiError,
  getHumanErrorMessage,
  getPaymentSafetyCopy,
} from "@/lib/api/client"
import {
  buildHotelBookingParams,
  buildHotelBookingPayload,
  calculateNights,
  checkRoomCapacity,
  createHotelBooking,
  findReusableHotelBooking,
  getHotelSupportWhatsAppUrl,
  hashHotelBookingKey,
  hotelGuestSchema,
  readPendingHotelBooking,
  saveHotelPaymentReference,
  savePendingHotelBooking,
  type HotelGuestInput,
  type RoomType,
} from "@/lib/api/hotels"

export interface HotelGuestStay {
  check_in: string
  check_out: string
  guests: number
  rooms: number
}

type Phase = "idle" | "creating" | "redirecting" | "failed"

/** Backend field names that map onto Hotel Guest inputs; stay-level fields
 *  surface as the form-level alert with a way back instead. */
const GUEST_FIELD_MAP: Record<
  string,
  "guest_name" | "guest_email" | "guest_phone"
> = {
  guest_name: "guest_name",
  guest_email: "guest_email",
  guest_phone: "guest_phone",
  phone: "guest_phone",
  email: "guest_email",
  name: "guest_name",
}

/**
 * Hotel Guest details plus Paystack handoff (Phase 4, ticket 05).
 *
 * Guest Booking with no account gate: one full name plus email plus phone
 * (Nigerian formats accepted, normalized before submission), validated on
 * blur plus on submit plus pre-payment. The stay (Room Type, dates, rooms,
 * guests) is revalidated against the capacity and date rules before any
 * payment step. A single-flight guard disables submit and pay actions while
 * creation runs and persists the Payment Reference, so double-taps and
 * retries never create duplicates. Success hands off to the backend-owned
 * Paystack authorization URL; failures map to customer-safe copy with field
 * errors inline and never raw.
 */
export function HotelGuestForm({
  hotel,
  room,
  stay,
  backHref,
}: {
  hotel: { id: number; slug: string; name: string; city: string }
  room: RoomType
  stay: HotelGuestStay
  /** Way back to the Hotel detail preserving the stay choice. */
  backHref: string
}) {
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [failure, setFailure] = React.useState<string | null>(null)
  const [redirectUrl, setRedirectUrl] = React.useState<string | null>(null)
  // Transient in-flight marker: drops double taps without a rerender while
  // the disabled button covers the visual state.
  const creationRef = React.useRef<string | null>(null)

  const form = useForm<HotelGuestInput>({
    resolver: zodResolver(hotelGuestSchema),
    defaultValues: { guest_name: "", guest_email: "", guest_phone: "" },
    mode: "onTouched",
    shouldFocusError: true,
  })

  const nights = calculateNights(stay.check_in, stay.check_out)

  const supportHref = getHotelSupportWhatsAppUrl(
    `the ${hotel.name} Hotel stay in ${hotel.city}`,
    {
      destination: `${hotel.name}, ${hotel.city}`,
      check_in: stay.check_in,
      check_out: stay.check_out,
      guests: stay.guests,
      rooms: stay.rooms,
    }
  )

  const handleSubmit = form.handleSubmit((values) => {
    if (creationRef.current) return
    setFailure(null)
    form.clearErrors("root")

    // Pre-payment revalidation: the stay is re-checked against the capacity
    // and date rules before anything reaches the backend (spec story 22 —
    // the charged total is backend-authoritative, but an invalid stay never
    // leaves the device).
    const verdict = checkRoomCapacity({
      maxGuests: room.max_guests,
      numGuests: stay.guests,
      numRooms: stay.rooms,
    })
    if (!verdict.ok) {
      form.setError("root", { type: "validate", message: verdict.guidance })
      return
    }
    if (nights === null) {
      form.setError("root", {
        type: "validate",
        message: "Review your stay dates on the Hotel page, then continue.",
      })
      return
    }

    let payload
    try {
      payload = buildHotelBookingPayload({
        hotel_id: hotel.id,
        room_type_id: room.id,
        check_in: stay.check_in,
        check_out: stay.check_out,
        num_rooms: stay.rooms,
        num_guests: stay.guests,
        guest_name: values.guest_name,
        guest_email: values.guest_email,
        guest_phone: values.guest_phone,
      })
    } catch {
      form.setError("root", {
        type: "validate",
        message: "Some details need attention before we can continue.",
      })
      return
    }

    const key = hashHotelBookingKey(payload)
    const reusable = findReusableHotelBooking(readPendingHotelBooking(), key)
    // Funnel: currency plus stay length only — never the reference, guest
    // PII, or the authorization URL (ticket 07).
    const initiatedProps = { currency: "NGN", nights } as const
    if (reusable) {
      creationRef.current = reusable.reference
      saveHotelPaymentReference(reusable.reference)
      setRedirectUrl(reusable.authorization_url)
      setPhase("redirecting")
      track("hotel_payment_initiated", { ...initiatedProps })
      window.location.href = reusable.authorization_url
      return
    }

    creationRef.current = "in-flight"
    setPhase("creating")
    void (async () => {
      try {
        const result = await createHotelBooking(payload)
        creationRef.current = result.reference
        savePendingHotelBooking({
          key,
          reference: result.reference,
          authorization_url: result.authorization_url,
        })
        saveHotelPaymentReference(result.reference)
        setRedirectUrl(result.authorization_url)
        setPhase("redirecting")
        track("hotel_payment_initiated", { currency: "NGN", nights })
        window.location.href = result.authorization_url
      } catch (error) {
        creationRef.current = null
        setPhase("failed")
        if (error instanceof ApiError) {
          if (error.reference) saveHotelPaymentReference(error.reference)
          let mapped = false
          if (error.fieldErrors) {
            for (const [field, messages] of Object.entries(error.fieldErrors)) {
              const target = GUEST_FIELD_MAP[field]
              if (target && messages.length > 0) {
                form.setError(target, {
                  type: "server",
                  message: messages[0],
                })
                mapped = true
              }
            }
          }
          setFailure(
            mapped
              ? "Some details need attention before we can continue."
              : getHumanErrorMessage(error)
          )
        } else {
          setFailure(getHumanErrorMessage(error))
        }
      }
    })()
  })

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
          Your Hotel Booking is reserved and your Payment Reference is saved.
          Complete payment on the secure Paystack page to confirm your stay.
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
      aria-label="Hotel Guest details"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-foreground">Who is staying?</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          One Hotel Guest per Hotel Booking — the contact and stay
          representative. No account needed.
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
            helperText="Pick your country code, then type your number — WhatsApp-ready."
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
              ? "Reserving your stay…"
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
          <span>Back to Hotel</span>
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

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Secured by Paystack. Card details are entered on Paystack — never here.
      </p>
    </form>
  )
}

/** Stay handoff back to the Hotel detail, preserving the choice. */
export function buildHotelBackHref(
  slug: string,
  stay: HotelGuestStay,
  roomTypeId: number
): string {
  return `/hotels/${slug}?${buildHotelBookingParams({
    room_type_id: roomTypeId,
    check_in: stay.check_in,
    check_out: stay.check_out,
    guests: stay.guests,
    rooms: stay.rooms,
  })}`
}
