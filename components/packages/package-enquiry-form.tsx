"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Tick01Icon,
  AlertCircleIcon,
  PlusSignIcon,
  MinusSignIcon,
  Copy01Icon,
} from "@hugeicons/core-free-icons"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  packageEnquirySchema,
  submitPackageEnquiry,
  type PackageEnquiryInput,
  type PackageEnquiryResult,
} from "@/lib/api/packages"
import { ApiError, getHumanErrorMessage } from "@/lib/api/client"
import { getWhatsAppUrl } from "@/lib/content/company"
import { notifyEnquirySent } from "@/lib/toast"
import { track } from "@/lib/analytics"
import { TrackLink } from "@/components/analytics/track-link"
import { toast } from "sonner"

const ENQUIRY_FIELD_NAMES = [
  "full_name",
  "email",
  "phone",
  "preferred_date",
  "num_adults",
  "num_children",
  "message",
] as const

type EnquiryFieldName = (typeof ENQUIRY_FIELD_NAMES)[number]

function isEnquiryFieldName(name: string): name is EnquiryFieldName {
  return (ENQUIRY_FIELD_NAMES as readonly string[]).includes(name)
}

export interface PackageEnquiryFormProps {
  packageSlug: string
  packageTitle: string
  destinationName: string
  packagePrice?: string
  durationFormatted?: string
}

/**
 * Clean, uncluttered package booking enquiry form (RHF + Zod).
 * Positioned at the bottom of the package detail page.
 */
export function PackageEnquiryForm({
  packageSlug,
  packageTitle,
  destinationName,
}: PackageEnquiryFormProps) {
  const [result, setResult] = React.useState<PackageEnquiryResult | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [copiedRef, setCopiedRef] = React.useState(false)

  const submittedReference = React.useRef<string | null>(null)

  const today = React.useMemo(() => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 10)
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PackageEnquiryInput>({
    resolver: zodResolver(packageEnquirySchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      preferred_date: "",
      num_adults: 1,
      num_children: 0,
      message: "",
    },
    mode: "onTouched",
    shouldFocusError: true,
  })

  const rawAdults = watch("num_adults")
  const rawChildren = watch("num_children")
  const numAdults: number =
    typeof rawAdults === "number" ? rawAdults : Number(rawAdults) || 1
  const numChildren: number =
    typeof rawChildren === "number" ? rawChildren : Number(rawChildren) || 0

  const updateAdults = (delta: number) => {
    const next = Math.max(1, Math.min(30, numAdults + delta))
    setValue("num_adults", next, { shouldValidate: true, shouldDirty: true })
  }

  const updateChildren = (delta: number) => {
    const next = Math.max(0, Math.min(30, numChildren + delta))
    setValue("num_children", next, { shouldValidate: true, shouldDirty: true })
  }

  const onSubmit = handleSubmit(async (data) => {
    if (submittedReference.current) return
    setSubmitError(null)
    try {
      const enquiry = await submitPackageEnquiry(packageSlug, data)
      submittedReference.current = enquiry.reference
      setResult(enquiry)
      track("package_enquiry_submitted", {
        slug: packageSlug,
        travellers: String(
          enquiry.total_travelers ??
            (enquiry.num_adults ?? 0) + (enquiry.num_children ?? 0)
        ),
      })
      notifyEnquirySent(destinationName)
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (isEnquiryFieldName(field) && messages.length > 0) {
            setError(field, { type: "server", message: messages[0] })
          }
        }
      }
      setSubmitError(getHumanErrorMessage(error))
    }
  })

  const copyReference = () => {
    if (!result?.reference) return
    navigator.clipboard.writeText(result.reference)
    setCopiedRef(true)
    toast.success("Reference copied", {
      description: `Reference #${result.reference} copied to clipboard.`,
    })
    setTimeout(() => setCopiedRef(false), 2500)
  }

  const sendAnother = React.useCallback(() => {
    submittedReference.current = null
    setResult(null)
    setSubmitError(null)
    reset({
      full_name: "",
      email: "",
      phone: "",
      preferred_date: "",
      num_adults: 1,
      num_children: 0,
      message: "",
    })
  }, [reset])

  // --- Success State ---
  if (result) {
    const totalTravellers =
      result.total_travelers ??
      (result.num_adults ?? 0) + (result.num_children ?? 0)

    return (
      <div
        role="status"
        aria-live="polite"
        className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-emerald-500/30 bg-card p-6 shadow-sm sm:p-10"
      >
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <HugeiconsIcon icon={Tick01Icon} size={28} aria-hidden="true" />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Enquiry Received
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Thank you,{" "}
              <span className="font-semibold text-foreground">
                {result.full_name}
              </span>
              . We&apos;ve received your request for{" "}
              <span className="font-semibold text-foreground">
                {result.package_title}
              </span>
              . Our team will contact you within 24 hours to confirm details.
            </p>
          </div>

          {/* Reference Card */}
          <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/40 px-5 py-3">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Reference Number
              </span>
              <span className="font-mono text-base font-bold text-foreground">
                {result.reference}
              </span>
            </div>
            <button
              type="button"
              onClick={copyReference}
              aria-label="Copy reference number"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted"
            >
              <HugeiconsIcon
                icon={copiedRef ? Tick01Icon : Copy01Icon}
                size={14}
                className={
                  copiedRef ? "text-emerald-600" : "text-muted-foreground"
                }
                aria-hidden="true"
              />
              <span>{copiedRef ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {/* Action CTAs */}
          <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row">
            <TrackLink
              event="support_click"
              eventProps={{
                context: "package enquiry follow-up",
                channel: "whatsapp",
              }}
              href={getWhatsAppUrl(
                `Hello Alphaa Africa! I just submitted enquiry ${result.reference} for ${result.package_title} (${totalTravellers} travellers). Let's finalize the details.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-emerald-600 text-white shadow-md hover:bg-emerald-700"
              )}
            >
              Chat on WhatsApp
            </TrackLink>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={sendAnother}
            >
              Send Another Request
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- Active Form View ---
  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-10">
      <div className="mb-6 flex flex-col gap-1 sm:mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Book this package
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your travel details below and our team will get back to you
          within 24 hours.
        </p>
      </div>

      {submitError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-xs leading-relaxed text-foreground"
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

      <form
        noValidate
        onSubmit={onSubmit}
        aria-label={`Enquire about ${packageTitle}`}
        className="flex flex-col gap-5"
      >
        {/* Row 1: Name and Email */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="enquiry_full_name"
              className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
            >
              Full name
            </label>
            <Input
              id="enquiry_full_name"
              type="text"
              autoComplete="name"
              placeholder="Adaeze Obi"
              error={errors.full_name?.message}
              {...register("full_name")}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="enquiry_email"
              className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
            >
              Email address
            </label>
            <Input
              id="enquiry_email"
              type="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              placeholder="ada@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>
        </div>

        {/* Row 2: Phone & Departure Date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="enquiry_phone"
              className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
            >
              Phone / WhatsApp
            </label>
            <Input
              id="enquiry_phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              spellCheck={false}
              placeholder="0803 123 4567"
              error={errors.phone?.message}
              {...register("phone")}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="enquiry_preferred_date"
                className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
              >
                Departure date (optional)
              </label>
              <span className="text-[10px] text-muted-foreground">
                Flexible is fine
              </span>
            </div>
            <Input
              id="enquiry_preferred_date"
              type="date"
              min={today}
              error={errors.preferred_date?.message}
              {...register("preferred_date")}
            />
          </div>
        </div>

        {/* Row 3: Travellers Counters */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase">
            Travellers
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Adults */}
            <div className="flex items-center justify-between rounded-xl border border-input bg-card p-2.5 px-3.5 shadow-2xs">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">
                  Adults
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Age 12+
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => updateAdults(-1)}
                  disabled={numAdults <= 1}
                  aria-label="Decrease adult travellers"
                  className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground transition-all hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                >
                  <HugeiconsIcon
                    icon={MinusSignIcon}
                    size={13}
                    aria-hidden="true"
                  />
                </button>
                <span className="w-5 text-center font-mono text-sm font-bold text-foreground">
                  {numAdults}
                </span>
                <button
                  type="button"
                  onClick={() => updateAdults(1)}
                  disabled={numAdults >= 30}
                  aria-label="Increase adult travellers"
                  className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground transition-all hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                >
                  <HugeiconsIcon
                    icon={PlusSignIcon}
                    size={13}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            {/* Children */}
            <div className="flex items-center justify-between rounded-xl border border-input bg-card p-2.5 px-3.5 shadow-2xs">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">
                  Children
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Age 0–11
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => updateChildren(-1)}
                  disabled={numChildren <= 0}
                  aria-label="Decrease child travellers"
                  className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground transition-all hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                >
                  <HugeiconsIcon
                    icon={MinusSignIcon}
                    size={13}
                    aria-hidden="true"
                  />
                </button>
                <span className="w-5 text-center font-mono text-sm font-bold text-foreground">
                  {numChildren}
                </span>
                <button
                  type="button"
                  onClick={() => updateChildren(1)}
                  disabled={numChildren >= 30}
                  aria-label="Increase child travellers"
                  className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground transition-all hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                >
                  <HugeiconsIcon
                    icon={PlusSignIcon}
                    size={13}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>

          {errors.num_adults && (
            <p className="text-xs font-medium text-destructive">
              {errors.num_adults.message}
            </p>
          )}
          {errors.num_children && (
            <p className="text-xs font-medium text-destructive">
              {errors.num_children.message}
            </p>
          )}
        </div>

        {/* Hidden inputs to guarantee form registration */}
        <input
          type="hidden"
          value={numAdults}
          {...register("num_adults", { valueAsNumber: true })}
        />
        <input
          type="hidden"
          value={numChildren}
          {...register("num_children", { valueAsNumber: true })}
        />

        {/* Row 4: Special requests */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="enquiry_message"
              className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
            >
              Notes or special requests (optional)
            </label>
            <span className="text-[10px] text-muted-foreground">
              Custom preferences
            </span>
          </div>
          <Textarea
            id="enquiry_message"
            autoComplete="off"
            placeholder="Any flight preferences, hotel room upgrades, or dietary notes..."
            error={errors.message?.message}
            className="min-h-[80px] text-sm"
            {...register("message")}
          />
        </div>

        {/* Submit Action */}
        <div className="pt-2">
          <Button
            type="submit"
            isLoading={isSubmitting}
            size="lg"
            className="h-12 w-full touch-manipulation justify-center text-sm font-bold shadow-md shadow-primary/20"
          >
            {isSubmitting ? "Submitting request…" : "Send Booking Request"}
          </Button>
        </div>
      </form>
    </div>
  )
}
