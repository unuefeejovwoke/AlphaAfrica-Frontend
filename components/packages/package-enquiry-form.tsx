"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Message01Icon,
  Tick01Icon,
  AlertCircleIcon,
  UserIcon,
  Mail01Icon,
  Call02Icon,
  Calendar01Icon,
  PlusSignIcon,
  MinusSignIcon,
  ArrowRight01Icon,
  Copy01Icon,
  SecurityCheckIcon,
  Clock01Icon,
  HeadphonesIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
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
import { formatNaira } from "@/lib/format"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

const MESSAGE_PROMPTS = [
  "Honeymoon trip",
  "Flexible travel dates",
  "Include flight options",
  "Luxury hotel upgrade",
  "Travelling with small kids",
] as const

/**
 * High-end package Enquiry form (RHF + Zod, validated on blur and submit).
 * An Enquiry is a no-payment request — travel specialists follow up.
 *
 * Upgraded with:
 * - Tactile counter steppers for Adults (1–30) and Children (0–30)
 * - Quick-click custom preference chips
 * - Reassurance spec banner and trust indicators
 * - Polished celebratory success state with copyable reference & timeline
 */
export function PackageEnquiryForm({
  packageSlug,
  packageTitle,
  destinationName,
  packagePrice,
}: {
  packageSlug: string
  packageTitle: string
  destinationName: string
  packagePrice?: string
}) {
  const [result, setResult] = React.useState<PackageEnquiryResult | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [copiedRef, setCopiedRef] = React.useState(false)

  // Guards double-clicks and double-submits after success.
  const submittedReference = React.useRef<string | null>(null)

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
  const currentMessage: string = String(watch("message") ?? "")

  const updateAdults = (delta: number) => {
    const next = Math.max(1, Math.min(30, numAdults + delta))
    setValue("num_adults", next, { shouldValidate: true, shouldDirty: true })
  }

  const updateChildren = (delta: number) => {
    const next = Math.max(0, Math.min(30, numChildren + delta))
    setValue("num_children", next, { shouldValidate: true, shouldDirty: true })
  }

  const addPromptToMessage = (prompt: string) => {
    if (!currentMessage) {
      setValue("message", prompt, { shouldValidate: true, shouldDirty: true })
    } else if (!currentMessage.includes(prompt)) {
      setValue("message", `${currentMessage.trim()}, ${prompt}`, {
        shouldValidate: true,
        shouldDirty: true,
      })
    }
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

  // --- Success View ---
  if (result) {
    const totalTravellers =
      result.total_travelers ??
      (result.num_adults ?? 0) + (result.num_children ?? 0)

    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-3xl border border-emerald-200/90 bg-emerald-50/70 p-1.5 shadow-sm sm:p-2 dark:border-emerald-800/40 dark:bg-emerald-950/20"
      >
        <div className="flex flex-col gap-6 rounded-[calc(1.5rem-2px)] border border-emerald-100 bg-card p-6 shadow-xs sm:p-7 dark:border-emerald-900/40">
          {/* Header */}
          <div className="flex flex-col items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <HugeiconsIcon icon={Tick01Icon} size={24} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                Enquiry Confirmed
              </span>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                We&apos;ve received your request!
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Our Abuja travel specialist will tailor{" "}
                <span className="font-semibold text-foreground">
                  {result.package_title}
                </span>{" "}
                around your dates and send a customized quote within 24 hours.
                No payment was taken.
              </p>
            </div>
          </div>

          {/* Reference Card */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/30">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold tracking-wider text-emerald-800 uppercase dark:text-emerald-300">
                Booking Reference
              </span>
              <span className="font-mono text-base font-bold text-foreground">
                {result.reference}
              </span>
            </div>
            <button
              type="button"
              onClick={copyReference}
              aria-label="Copy reference number"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
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

          {/* Summary Details */}
          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border/80 bg-muted/30 p-4 text-xs">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Destination
              </dt>
              <dd className="font-semibold text-foreground">
                {destinationName}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Travellers
              </dt>
              <dd className="font-semibold text-foreground">
                {totalTravellers} {totalTravellers === 1 ? "person" : "people"}
              </dd>
            </div>
          </dl>

          {/* Next Steps Roadmap */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4">
            <span className="text-xs font-bold tracking-wider text-foreground uppercase">
              What happens next
            </span>
            <ol className="flex flex-col gap-2.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  1
                </span>
                <span>
                  An advisor validates dates, flight schedules & hotel
                  allotments.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  2
                </span>
                <span>
                  You receive custom pricing & itinerary options via
                  WhatsApp/Email.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  3
                </span>
                <span>
                  Confirm and pay securely only when you are 100% happy.
                </span>
              </li>
            </ol>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2.5 pt-1">
            <Button
              render={
                <TrackLink
                  event="support_click"
                  eventProps={{
                    context: "package enquiry follow-up",
                    channel: "whatsapp",
                  }}
                  href={getWhatsAppUrl(
                    `Hello Alphaa Africa! I just sent package enquiry ${result.reference} for ${result.package_title} (${totalTravellers} travellers). Please help me plan it.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              className="w-full justify-center bg-emerald-600 text-white shadow-md hover:bg-emerald-700"
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={18}
                aria-hidden="true"
              />
              <span>Chat with Specialist on WhatsApp</span>
            </Button>
            <button
              type="button"
              onClick={sendAnother}
              className="py-1 text-center text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Send another enquiry for this package
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Form View ---
  return (
    <div className="rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-md transition-all duration-300 sm:p-2 dark:border-white/10 dark:bg-zinc-900/40">
      <div className="flex flex-col gap-6 rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-7 dark:border-white/[0.06] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
        {/* Form Header Banner */}
        <div className="flex flex-col gap-3 border-b border-border/70 pb-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-primary uppercase">
              <HugeiconsIcon icon={SparklesIcon} size={12} aria-hidden="true" />
              <span>Assisted Service</span>
            </span>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              ₦0 deposit to enquire
            </span>
          </div>

          <div className="flex flex-col gap-1">
            {packagePrice && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  From
                </span>
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {formatNaira(packagePrice)}
                </span>
                <span className="text-xs text-muted-foreground">/ person</span>
              </div>
            )}
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Enquire about this journey
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              No payment required. An Abuja travel specialist will tailor this
              itinerary and provide a quote within 24 hours.
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {submitError && (
          <div
            role="alert"
            className="flex animate-in items-start gap-2.5 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-xs leading-relaxed text-foreground fade-in"
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
          className="flex flex-col gap-4"
        >
          {/* Full Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="enquiry_full_name"
                className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
              >
                Full name
              </label>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <HugeiconsIcon icon={UserIcon} size={16} aria-hidden="true" />
              </div>
              <Input
                id="enquiry_full_name"
                type="text"
                autoComplete="name"
                placeholder="Adaeze Obi"
                error={errors.full_name?.message}
                className="pl-10"
                {...register("full_name")}
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="enquiry_email"
                className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
              >
                Email address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <HugeiconsIcon
                    icon={Mail01Icon}
                    size={16}
                    aria-hidden="true"
                  />
                </div>
                <Input
                  id="enquiry_email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  placeholder="ada@example.com"
                  error={errors.email?.message}
                  className="pl-10"
                  {...register("email")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="enquiry_phone"
                className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
              >
                Phone / WhatsApp
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <HugeiconsIcon
                    icon={Call02Icon}
                    size={16}
                    aria-hidden="true"
                  />
                </div>
                <Input
                  id="enquiry_phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  spellCheck={false}
                  placeholder="0803 123 4567"
                  error={errors.phone?.message}
                  className="pl-10"
                  {...register("phone")}
                />
              </div>
            </div>
          </div>

          {/* Preferred Date */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="enquiry_preferred_date"
                className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
              >
                Preferred departure date (optional)
              </label>
              <span className="text-[10px] text-muted-foreground">
                Approximate is fine
              </span>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <HugeiconsIcon
                  icon={Calendar01Icon}
                  size={16}
                  aria-hidden="true"
                />
              </div>
              <Input
                id="enquiry_preferred_date"
                type="date"
                min={today}
                error={errors.preferred_date?.message}
                className="pl-10"
                {...register("preferred_date")}
              />
            </div>
          </div>

          {/* Travellers Custom Steppers */}
          <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-muted/30 p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-foreground/90 uppercase">
                Number of travellers
              </span>
              <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-bold text-foreground">
                {numAdults + numChildren} total
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
              {/* Adults Counter */}
              <div className="flex items-center justify-between rounded-xl border border-input bg-card p-2 px-3 shadow-2xs">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">
                    Adults
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Age 12+
                  </span>
                </div>
                <div className="flex items-center gap-2">
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

              {/* Children Counter */}
              <div className="flex items-center justify-between rounded-xl border border-input bg-card p-2 px-3 shadow-2xs">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">
                    Children
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Age 0–11
                  </span>
                </div>
                <div className="flex items-center gap-2">
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
              <p className="pt-1 text-xs font-medium text-destructive">
                {errors.num_adults.message}
              </p>
            )}
            {errors.num_children && (
              <p className="pt-1 text-xs font-medium text-destructive">
                {errors.num_children.message}
              </p>
            )}
          </div>

          {/* Hidden inputs to guarantee native form fallback and validation */}
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

          {/* Message / Special Requests */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="enquiry_message"
                className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
              >
                Special requests / notes (optional)
              </label>
              <span className="text-[10px] text-muted-foreground">
                Tailor your trip
              </span>
            </div>
            <Textarea
              id="enquiry_message"
              autoComplete="off"
              placeholder="e.g. Travelling for anniversary, prefer 5-star beach resort, need airport pickup in Abuja…"
              error={errors.message?.message}
              className="min-h-[85px] text-xs sm:text-sm"
              {...register("message")}
            />

            {/* Quick Inspiration Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="mr-1 text-[10px] font-medium text-muted-foreground">
                Quick add:
              </span>
              {MESSAGE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => addPromptToMessage(prompt)}
                  className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95"
                >
                  + {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="group h-12 w-full touch-manipulation justify-center gap-2 text-sm font-bold shadow-md shadow-primary/20"
            >
              <span>
                {isSubmitting
                  ? "Submitting enquiry…"
                  : "Request Custom Itinerary"}
              </span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                className="transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              By enquiring, a specialist will contact you with custom options.
              No account or payment required.
            </p>
          </div>

          {/* Trust Guarantees Strip */}
          <div className="mt-2 grid grid-cols-3 gap-2 border-t border-border/60 pt-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <HugeiconsIcon
                icon={SecurityCheckIcon}
                size={16}
                className="text-emerald-600"
                aria-hidden="true"
              />
              <span className="text-[10px] leading-tight font-medium text-muted-foreground">
                Paystack Secured
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <HugeiconsIcon
                icon={Clock01Icon}
                size={16}
                className="text-primary"
                aria-hidden="true"
              />
              <span className="text-[10px] leading-tight font-medium text-muted-foreground">
                24h Response
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <HugeiconsIcon
                icon={HeadphonesIcon}
                size={16}
                className="text-secondary"
                aria-hidden="true"
              />
              <span className="text-[10px] leading-tight font-medium text-muted-foreground">
                Abuja Office
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
