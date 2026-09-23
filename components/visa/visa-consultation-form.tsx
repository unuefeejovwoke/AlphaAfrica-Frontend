"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Message01Icon,
  AlertCircleIcon,
  PlusSignIcon,
  MinusSignIcon,
  LockIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import {
  TRAVEL_PURPOSE_LABELS,
  submitVisaConsultation,
  visaConsultationSchema,
  type TravelPurpose,
  type VisaConsultationInput,
} from "@/lib/api/visa"
import { ApiError, getHumanErrorMessage } from "@/lib/api/client"
import { formatNaira } from "@/lib/format"
import { track } from "@/lib/analytics"

const CONSULTATION_FIELD_NAMES = [
  "full_name",
  "email",
  "phone",
  "travel_purpose",
  "preferred_date",
  "num_applicants",
  "message",
] as const

type ConsultationFieldName = (typeof CONSULTATION_FIELD_NAMES)[number]

function isConsultationFieldName(name: string): name is ConsultationFieldName {
  return (CONSULTATION_FIELD_NAMES as readonly string[]).includes(name)
}

const TRAVEL_PURPOSE_OPTIONS = (
  Object.entries(TRAVEL_PURPOSE_LABELS) as [TravelPurpose, string][]
).map(([value, label]) => ({ value, label }))

const MAX_APPLICANTS = 30

/**
 * Inline Visa Consultation form (RHF + Zod, validated on blur and submit).
 * A Visa Consultation is a paid request for country-specific guidance:
 * submitting creates the consultation and redirects to the Paystack
 * authorization URL. Guests are welcome — no account needed.
 *
 * - Country is prefilled from the detail page and locked (read-only).
 * - Travel purpose offers the 7 API-defined values via an accessible Select.
 * - Applicant count uses a stepper clamped to 1–30 (backend parity).
 * - Duplicate submissions are prevented: the submit stays disabled while
 *   sending or redirecting, and success navigates away to payment.
 */
export function VisaConsultationForm({
  countryId,
  countryName,
  countrySlug,
  consultationFee,
}: {
  countryId: number
  countryName: string
  countrySlug: string
  consultationFee: string
}) {
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [redirecting, setRedirecting] = React.useState(false)
  // Guards double-clicks and double-submits while the Paystack handoff runs.
  const submittedReference = React.useRef<string | null>(null)
  const startedTracked = React.useRef(false)

  // Local (device) date for the `min` attribute — UTC would be a day
  // behind West African time late at night and allow a past date.
  const today = React.useMemo(() => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 10)
  }, [])

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VisaConsultationInput>({
    resolver: zodResolver(visaConsultationSchema),
    defaultValues: {
      country_id: countryId,
      full_name: "",
      email: "",
      phone: "",
      travel_purpose: "tourism",
      preferred_date: "",
      num_applicants: 1,
      message: "",
    },
    mode: "onTouched",
    shouldFocusError: true,
  })

  const trackStarted = React.useCallback(() => {
    if (startedTracked.current) return
    startedTracked.current = true
    // Funnel "started" means submit intent, not mere focus — tabbing
    // through the form must not inflate the funnel.
    track("visa_application_started", { slug: countrySlug })
  }, [countrySlug])

  const onSubmit = handleSubmit(async (data) => {
    trackStarted()
    if (submittedReference.current) return
    setSubmitError(null)
    try {
      const result = await submitVisaConsultation({
        ...data,
        country_id: countryId,
      })
      submittedReference.current = result.reference
      track("visa_payment_initiated", {
        slug: countrySlug,
        applicants: String(data.num_applicants ?? 1),
      })
      // Paystack handoff is a full-page redirect (backend-owned checkout —
      // card details are never collected or stored here).
      setRedirecting(true)
      window.location.href = result.authorization_url
    } catch (error) {
      // Map backend field errors onto the matching inputs (human copy only).
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (isConsultationFieldName(field) && messages.length > 0) {
            setError(field, { type: "server", message: messages[0] })
          }
        }
      }
      setSubmitError(getHumanErrorMessage(error))
    }
  })

  const busy = isSubmitting || redirecting

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label={`Start a visa consultation for ${countryName}`}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-foreground">
          Start your consultation
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Consultation fee{" "}
          <span className="font-semibold text-foreground">
            {formatNaira(consultationFee)}
          </span>{" "}
          · pay securely via Paystack, then a specialist takes it from there.
        </p>
      </div>

      {submitError && (
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
          <span>{submitError}</span>
        </div>
      )}

      <div className="w-full space-y-1.5">
        <label
          htmlFor="visa-consultation-country"
          className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
        >
          Country
        </label>
        <div className="relative">
          <input
            id="visa-consultation-country"
            type="text"
            readOnly
            value={countryName}
            aria-describedby="visa-consultation-country-helper"
            className="flex h-10 w-full rounded-xl border border-input bg-muted/40 px-3.5 py-2 pr-10 text-sm font-semibold text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
          <HugeiconsIcon
            icon={LockIcon}
            size={16}
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <p
          id="visa-consultation-country-helper"
          className="text-xs text-muted-foreground"
        >
          Locked to this country — open another country page to change it.
        </p>
      </div>

      <Input
        label="Full name"
        type="text"
        autoComplete="name"
        placeholder="Adaeze Obi"
        error={errors.full_name?.message}
        {...register("full_name")}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Phone / WhatsApp"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          spellCheck={false}
          placeholder="0803 123 4567"
          helperText="Nigerian or international formats accepted."
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      <Controller
        name="travel_purpose"
        control={control}
        render={({ field, fieldState }) => (
          <Select
            label="Travel purpose"
            options={TRAVEL_PURPOSE_OPTIONS}
            value={field.value}
            onValueChange={field.onChange}
            error={fieldState.error?.message}
            helperText="Choose the reason for this trip."
          />
        )}
      />

      <Input
        label="Preferred date (optional)"
        type="date"
        min={today}
        error={errors.preferred_date?.message}
        {...register("preferred_date")}
      />

      <Controller
        name="num_applicants"
        control={control}
        render={({ field, fieldState }) => {
          const count = typeof field.value === "number" ? field.value : 1
          const decrease = () => field.onChange(Math.max(1, count - 1))
          const increase = () =>
            field.onChange(Math.min(MAX_APPLICANTS, count + 1))
          return (
            <div className="w-full space-y-1.5">
              <span
                id="visa-applicants-label"
                className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
              >
                Applicants
              </span>
              <div
                role="group"
                aria-labelledby="visa-applicants-label"
                className="flex touch-manipulation items-center justify-between rounded-xl border border-input bg-card px-3.5 py-2 shadow-xs"
              >
                <button
                  type="button"
                  onClick={decrease}
                  disabled={count <= 1 || busy}
                  aria-label="Fewer applicants"
                  className="flex size-10 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <HugeiconsIcon
                    icon={MinusSignIcon}
                    size={16}
                    aria-hidden="true"
                  />
                </button>
                <span
                  aria-live="polite"
                  className="font-variant-numeric text-sm font-bold text-foreground tabular-nums"
                >
                  {count} {count === 1 ? "applicant" : "applicants"}
                </span>
                <button
                  type="button"
                  onClick={increase}
                  disabled={count >= MAX_APPLICANTS || busy}
                  aria-label="More applicants"
                  className="flex size-10 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <HugeiconsIcon
                    icon={PlusSignIcon}
                    size={16}
                    aria-hidden="true"
                  />
                </button>
              </div>
              {fieldState.error?.message ? (
                <p className="text-xs font-medium text-destructive">
                  {fieldState.error.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  One consultation covers up to {MAX_APPLICANTS} applicants
                  travelling together.
                </p>
              )}
            </div>
          )
        }}
      />

      <Textarea
        label="Message (optional)"
        autoComplete="off"
        placeholder="Studying in September, one applicant, need document guidance…"
        helperText="Travel dates, party details, and worries help us reply faster."
        error={errors.message?.message}
        {...register("message")}
      />

      <Button
        type="submit"
        isLoading={busy}
        disabled={busy}
        className="w-full touch-manipulation justify-center"
      >
        <span>
          {redirecting
            ? "Redirecting to secure payment…"
            : isSubmitting
              ? "Starting consultation…"
              : `Pay ${formatNaira(consultationFee)} & continue`}
        </span>
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-muted-foreground">
        <HugeiconsIcon icon={Message01Icon} size={12} aria-hidden="true" />
        <span>
          No account needed. Payment is handled by Paystack — we never see card
          details.
        </span>
      </p>
    </form>
  )
}
