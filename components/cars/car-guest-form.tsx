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
  buildCarBookingPayload,
  createCarBooking,
  getCarSupportWhatsAppUrl,
  carGuestSchema,
  CAR_PAYMENT_REFERENCE_SESSION_KEY,
  PENDING_CAR_BOOKING_SESSION_KEY,
  type CarGuestInput,
  type VehicleDetail,
} from "@/lib/api/cars"
import {
  findReusableBookingRecord,
  hashPayloadKey,
  readSessionRecord,
  saveSessionRecord,
  saveSessionString,
} from "@/lib/api/shared"

export interface CarGuestHire {
  pickup_location: string
  dropoff_location: string
  pickup_datetime: string
  pickup_date: string
  pickup_time: string
  num_hours: number
}

type Phase = "idle" | "creating" | "redirecting" | "failed"

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
 * Car guest details plus Paystack handoff.
 * Guest booking, no account gate. Single-flight guard + persisted
 * reference so double-taps never create duplicates.
 */
export function CarGuestForm({
  vehicle,
  hire,
  backHref,
}: {
  vehicle: VehicleDetail
  hire: CarGuestHire
  backHref: string
}) {
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [failure, setFailure] = React.useState<string | null>(null)
  const [redirectUrl, setRedirectUrl] = React.useState<string | null>(null)
  const creationRef = React.useRef<string | null>(null)

  const form = useForm<CarGuestInput>({
    resolver: zodResolver(carGuestSchema),
    defaultValues: { guest_name: "", guest_email: "", guest_phone: "" },
    mode: "onTouched",
    shouldFocusError: true,
  })

  const supportHref = getCarSupportWhatsAppUrl(`the ${vehicle.name} hire`, {
    vehicle_name: vehicle.name,
    pickup_location: hire.pickup_location,
    num_hours: hire.num_hours,
  })

  const handleSubmit = form.handleSubmit((values) => {
    if (creationRef.current) return
    setFailure(null)
    form.clearErrors("root")

    let payload
    try {
      payload = buildCarBookingPayload({
        vehicle_id: vehicle.id,
        pickup_location: hire.pickup_location,
        dropoff_location: hire.dropoff_location,
        pickup_datetime: hire.pickup_datetime,
        num_hours: hire.num_hours,
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

    const key = hashPayloadKey(payload)
    const reusable = findReusableBookingRecord(
      readSessionRecord(PENDING_CAR_BOOKING_SESSION_KEY),
      key
    )
    if (reusable) {
      creationRef.current = reusable.reference
      saveSessionString(CAR_PAYMENT_REFERENCE_SESSION_KEY, reusable.reference)
      setRedirectUrl(reusable.authorization_url)
      setPhase("redirecting")
      track("car_payment_initiated", { currency: "NGN", hours: hire.num_hours })
      window.location.href = reusable.authorization_url
      return
    }

    creationRef.current = "in-flight"
    setPhase("creating")
    void (async () => {
      try {
        const result = await createCarBooking(payload)
        creationRef.current = result.reference
        saveSessionRecord(PENDING_CAR_BOOKING_SESSION_KEY, {
          key,
          reference: result.reference,
          authorization_url: result.authorization_url,
        })
        saveSessionString(CAR_PAYMENT_REFERENCE_SESSION_KEY, result.reference)
        setRedirectUrl(result.authorization_url)
        setPhase("redirecting")
        track("car_payment_initiated", {
          currency: "NGN",
          hours: hire.num_hours,
        })
        window.location.href = result.authorization_url
      } catch (error) {
        creationRef.current = null
        setPhase("failed")
        if (error instanceof ApiError) {
          if (error.reference)
            saveSessionString(
              CAR_PAYMENT_REFERENCE_SESSION_KEY,
              error.reference
            )
          let mapped = false
          if (error.fieldErrors) {
            for (const [field, messages] of Object.entries(error.fieldErrors)) {
              const target = GUEST_FIELD_MAP[field]
              if (target && messages.length > 0) {
                form.setError(target, { type: "server", message: messages[0] })
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
          Your car booking is reserved and your payment reference is saved.
          Complete payment on the secure Paystack page to confirm your hire.
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
      aria-label="Guest details for car hire"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-foreground">Who is hiring?</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          One contact per booking — the person the driver meets. No account
          needed.
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
            helperText="Pick your country code, then type your number — the driver meets this contact."
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
              ? "Reserving your car…"
              : "Continue to payment"}
          </span>
        </Button>
        <ButtonLink
          href={backHref}
          variant="ghost"
          size="sm"
          className="w-full justify-center"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} aria-hidden="true" />
          <span>Back to vehicle</span>
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
