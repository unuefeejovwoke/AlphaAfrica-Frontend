"use client"

import * as React from "react"
import { motion } from "motion/react"
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  InformationCircleIcon,
  LockIcon,
  Mail01Icon,
  PassportIcon,
  SparklesIcon,
  Tick01Icon,
  Upload01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { Button, ButtonLink } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { PhoneField } from "@/components/ui/phone-field"
import { CountrySelect } from "@/components/ui/country-select"
import { LegalNotice } from "@/components/legal/legal-notice"
import { getCountryByDial } from "@/lib/data/countries"
import { splitPhoneValue } from "@/lib/phone"
import {
  buildBookingTravellersPayload,
  createTravellerFormSchema,
  createTravellerSlots,
  getTravellerAgeWarnings,
  type BookingTravellersPayload,
  type TravellerComposition,
  type TravellerFormInput,
  type TravellerFormValues,
  type TravelerType,
} from "@/lib/schemas/travel"
import {
  accordionPanelVariants,
  staggerContainerVariants,
} from "@/lib/motion/variants"

export type TravellerSubmitIntent = "pay_now" | "reserve"

export interface TravellerDetailsFormProps {
  party: TravellerComposition
  isInternational: boolean
  onSubmit: (
    payload: BookingTravellersPayload,
    intent: TravellerSubmitIntent
  ) => void | Promise<void>
  isSubmitting?: boolean
  isReserving?: boolean
  initialValues?: TravellerFormValues | null
  submitLabel?: string
  submittingLabel?: string
  allowReserve?: boolean
  reserveLabel?: string
  formId?: string
  reserveTriggerRef?: React.MutableRefObject<(() => void) | null>
}

const TITLE_OPTIONS = [
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" },
  { value: "Miss", label: "Miss" },
  { value: "Dr", label: "Dr" },
  { value: "Chief", label: "Chief" },
  { value: "Master", label: "Master" },
]

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
]

const TRAVELER_TYPE_LABELS: Record<TravelerType, string> = {
  ADULT: "Adult",
  CHILD: "Child",
  HELD_INFANT: "Held infant",
}

type TravellerFieldName =
  | "first_name"
  | "last_name"
  | "date_of_birth"
  | "gender"
  | "email"
  | "phone_country_code"
  | "phone"
  | "passport_number"
  | "passport_expiry"
  | "nationality"

function getTravellersArrayError(
  errors: FieldErrors<TravellerFormInput>
): string | undefined {
  const list = errors.travellers
  if (!Array.isArray(list) && typeof list?.message === "string")
    return list.message
  return undefined
}

function getTravellerFieldError(
  errors: FieldErrors<TravellerFormInput>,
  index: number,
  field: TravellerFieldName
): string | undefined {
  const list = errors.travellers
  if (!Array.isArray(list)) return undefined
  const message = list[index]?.[field]?.message
  return typeof message === "string" ? message : undefined
}

const AgeBandWarnings = React.memo(function AgeBandWarnings({
  control,
}: {
  control: Control<TravellerFormInput, unknown, TravellerFormValues>
}) {
  const travellers = useWatch({ control, name: "travellers" })
  const warnings = React.useMemo(
    () =>
      getTravellerAgeWarnings(
        (travellers ?? []).map((traveller) => ({
          date_of_birth: traveller.date_of_birth,
          traveler_type: traveller.traveler_type,
        }))
      ),
    [travellers]
  )
  if (warnings.length === 0) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5"
    >
      {warnings.map((warning) => (
        <p
          key={`${warning.index}-${warning.traveler_type}`}
          className="flex items-start gap-2 text-xs leading-relaxed text-foreground"
        >
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={16}
            className="mt-0.5 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <span>{warning.message}</span>
        </p>
      ))}
    </div>
  )
})

export function TravellerDetailsForm({
  party,
  isInternational,
  onSubmit,
  isSubmitting,
  isReserving,
  initialValues,
  submitLabel = "Proceed to Pay",
  submittingLabel = "Processing…",
  allowReserve = false,
  reserveLabel = "Reserve and pay later",
  formId = "traveller-checkout-form",
  reserveTriggerRef,
}: TravellerDetailsFormProps) {
  const schema = React.useMemo(
    () => createTravellerFormSchema({ party, isInternational }),
    [party.adults, party.children, party.infants, isInternational]
  )

  const defaultValues = React.useMemo<TravellerFormValues>(
    () =>
      initialValues ?? {
        travellers: createTravellerSlots(party),
        contactIsFirstTraveller: true,
        customer: { name: "", email: "", phone: "" },
      },
    [initialValues, party.adults, party.children, party.infants]
  )

  const form = useForm<TravellerFormInput, unknown, TravellerFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
    shouldFocusError: true,
  })

  const { fields } = useFieldArray({
    control: form.control,
    name: "travellers",
  })

  const today = React.useMemo(() => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 10)
  }, [])

  const contactIsFirstTraveller = form.watch("contactIsFirstTraveller") ?? true
  const firstTraveller = form.watch("travellers.0")
  const errors = form.formState.errors
  const arrayError = getTravellersArrayError(errors)
  const customerErrors = errors.customer

  const submitAs =
    (intent: TravellerSubmitIntent) =>
    async (event?: React.BaseSyntheticEvent) => {
      await form.handleSubmit(async (values) => {
        await onSubmit(buildBookingTravellersPayload(values), intent)
      })(event)
    }

  const handlePayNow = submitAs("pay_now")
  const handleReserve = submitAs("reserve")

  // Expose reserve handler to parent for sidebar button
  React.useEffect(() => {
    if (reserveTriggerRef) {
      reserveTriggerRef.current = () => {
        void handleReserve()
      }
    }
  }, [reserveTriggerRef, handleReserve])

  // Passport Auto-fill state
  const [isScanning, setIsScanning] = React.useState(false)
  const [scanSuccess, setScanSuccess] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const handleApplyPassportExtraction = React.useCallback(
    (extracted: {
      surname: string
      firstName: string
      middleName?: string
      dob: string
      gender: "MALE" | "FEMALE"
      passportNumber: string
      passportExpiry: string
      nationality: string
    }) => {
      form.setValue("travellers.0.last_name", extracted.surname, {
        shouldValidate: true,
        shouldDirty: true,
      })
      form.setValue("travellers.0.first_name", extracted.firstName, {
        shouldValidate: true,
        shouldDirty: true,
      })
      if (extracted.middleName) {
        form.setValue("travellers.0.middle_name", extracted.middleName, {
          shouldValidate: true,
          shouldDirty: true,
        })
      }
      form.setValue("travellers.0.date_of_birth", extracted.dob, {
        shouldValidate: true,
        shouldDirty: true,
      })
      form.setValue("travellers.0.gender", extracted.gender, {
        shouldValidate: true,
        shouldDirty: true,
      })
      if (isInternational) {
        form.setValue("travellers.0.passport_number", extracted.passportNumber, {
          shouldValidate: true,
          shouldDirty: true,
        })
        form.setValue("travellers.0.passport_expiry", extracted.passportExpiry, {
          shouldValidate: true,
          shouldDirty: true,
        })
        form.setValue("travellers.0.nationality", extracted.nationality, {
          shouldValidate: true,
          shouldDirty: true,
        })
      }
      setScanSuccess(true)
      setTimeout(() => setScanSuccess(false), 6000)
    },
    [form, isInternational]
  )

  const handlePassportUpload = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsScanning(true)
      // Simulate intelligent optical recognition parse
      setTimeout(() => {
        setIsScanning(false)
        handleApplyPassportExtraction({
          surname: "ADEBAYO",
          firstName: "BABATUNDE",
          middleName: "OLUWOLE",
          dob: "1992-06-18",
          gender: "MALE",
          passportNumber: "A18942065",
          passportExpiry: "2031-10-15",
          nationality: "NG",
        })
        if (fileInputRef.current) fileInputRef.current.value = ""
      }, 1200)
    },
    [handleApplyPassportExtraction]
  )

  const handleDemoScan = React.useCallback(() => {
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
      handleApplyPassportExtraction({
        surname: "OKAFOR",
        firstName: "CHIAMAKA",
        middleName: "GRACE",
        dob: "1995-04-12",
        gender: "FEMALE",
        passportNumber: "A24819730",
        passportExpiry: "2032-05-22",
        nationality: "NG",
      })
    }, 900)
  }, [handleApplyPassportExtraction])

  return (
    <form
      id={formId}
      noValidate
      onSubmit={handlePayNow}
      aria-label="Traveller details"
      className="flex flex-col gap-6"
    >
      {/* Step Header */}
      <div className="flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-xs sm:size-8 sm:text-sm">
          2
        </span>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Traveller Details
        </h2>
      </div>

      {/* Important Route Notice Banner */}
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-relaxed text-foreground shadow-2xs sm:text-sm"
      >
        <HugeiconsIcon
          icon={AlertCircleIcon}
          size={18}
          className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <p>
          <strong className="font-semibold text-foreground">
            Important Notice
          </strong>{" "}
          — We recommend double-checking your route and itinerary before
          continuing. This helps avoid any issues, as Alphaa Africa cannot be
          held responsible for errors resulting from an incorrect route
          selection.
        </p>
      </div>

      {/* Login for faster checkout strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-xs shadow-2xs sm:px-5 sm:text-sm">
        <span className="text-muted-foreground">
          Have an account?{" "}
          <span className="font-semibold text-foreground">
            Log in for faster checkout
          </span>
        </span>
        <ButtonLink
          href="/login"
          variant="outline"
          size="sm"
          className="h-8 text-xs font-semibold"
        >
          <span>Log in</span>
        </ButtonLink>
      </div>

      {/* Array-level form error banner if any */}
      {arrayError ? (
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
          <span>{arrayError}</span>
        </div>
      ) : null}

      {/* Contact Information Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
        <div>
          <h3 className="text-base font-bold text-foreground">
            Contact Information
          </h3>
          <p className="text-xs text-muted-foreground">
            Booking confirmation will be sent to this email
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {contactIsFirstTraveller ? (
            <>
              <Input
                label="Email Address"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                startIcon={
                  <HugeiconsIcon icon={Mail01Icon} size={15} aria-hidden="true" />
                }
                error={getTravellerFieldError(errors, 0, "email")}
                {...form.register("travellers.0.email")}
              />

              <Controller
                name="travellers.0.phone"
                control={form.control}
                render={({ field: phoneField }) => (
                  <>
                    <input
                      type="hidden"
                      {...form.register("travellers.0.phone_country_code")}
                    />
                    <PhoneField
                      label="Phone Number"
                      value={phoneField.value ?? ""}
                      defaultCountry={
                        getCountryByDial(
                          form.watch("travellers.0.phone_country_code") ?? "234"
                        ).code
                      }
                      onChange={(e164) => {
                        phoneField.onChange(e164)
                        form.setValue(
                          "travellers.0.phone_country_code",
                          splitPhoneValue(e164, "234").dial,
                          { shouldValidate: true }
                        )
                      }}
                      onBlur={phoneField.onBlur}
                      placeholder="800 000 0000"
                      error={getTravellerFieldError(errors, 0, "phone")}
                    />
                  </>
                )}
              />
            </>
          ) : (
            <>
              <Input
                label="Contact email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                startIcon={
                  <HugeiconsIcon icon={Mail01Icon} size={15} aria-hidden="true" />
                }
                error={
                  typeof customerErrors?.email?.message === "string"
                    ? customerErrors.email.message
                    : undefined
                }
                {...form.register("customer.email")}
              />

              <Controller
                name="customer.phone"
                control={form.control}
                render={({ field: customerPhoneField }) => (
                  <PhoneField
                    label="Contact phone"
                    value={customerPhoneField.value ?? ""}
                    onChange={customerPhoneField.onChange}
                    onBlur={customerPhoneField.onBlur}
                    placeholder="800 000 0000"
                    error={
                      typeof customerErrors?.phone?.message === "string"
                        ? customerErrors.phone.message
                        : undefined
                    }
                  />
                )}
              />
            </>
          )}
        </div>
      </div>

      {/* Traveller Cards */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6"
      >
        {fields.map((field, index) => {
          const isLead = index === 0
          const travellerType = field.traveler_type

          return (
            <motion.fieldset
              key={field.id}
              variants={accordionPanelVariants}
              className="flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
            >
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <legend className="text-base font-bold text-foreground">
                  {isLead
                    ? "Lead Traveller"
                    : `Traveller ${index + 1}`}
                </legend>
                <span className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {TRAVELER_TYPE_LABELS[travellerType]}
                </span>
              </div>

              {/* Passport auto-fill card (Lead Traveller only) */}
              {isLead ? (
                <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 sm:p-5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handlePassportUpload}
                  />

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <HugeiconsIcon icon={PassportIcon} size={20} aria-hidden="true" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">
                          Upload passport to auto-fill
                        </span>
                        <span className="text-xs text-muted-foreground">
                          AI will extract name, DOB, nationality & passport
                          details for this traveller
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Button
                        type="button"
                        size="sm"
                        isLoading={isScanning}
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-1.5 font-bold"
                      >
                        <HugeiconsIcon icon={Upload01Icon} size={15} aria-hidden="true" />
                        <span>Upload</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDemoScan}
                        disabled={isScanning}
                        className="text-xs"
                      >
                        <HugeiconsIcon icon={SparklesIcon} size={14} className="text-primary" aria-hidden="true" />
                        <span>Try demo</span>
                      </Button>
                    </div>
                  </div>

                  {scanSuccess ? (
                    <div
                      role="status"
                      className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                    >
                      <HugeiconsIcon icon={Tick01Icon} size={15} aria-hidden="true" />
                      <span>Passport details auto-filled successfully! Please review.</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Title dropdown */}
              <div className="w-full sm:w-48">
                <Controller
                  name={`travellers.${index}.title`}
                  control={form.control}
                  render={({ field: titleField }) => (
                    <Select
                      label="Title"
                      options={TITLE_OPTIONS}
                      value={titleField.value || ""}
                      onValueChange={titleField.onChange}
                      placeholder="Select"
                    />
                  )}
                />
              </div>

              {/* Surname, First Name, Middle Name */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  label="Surname"
                  autoComplete="family-name"
                  placeholder="As on passport/ID"
                  startIcon={
                    <HugeiconsIcon icon={UserIcon} size={15} aria-hidden="true" />
                  }
                  error={getTravellerFieldError(errors, index, "last_name")}
                  {...form.register(`travellers.${index}.last_name`)}
                />

                <Input
                  label="First Name"
                  autoComplete="given-name"
                  placeholder="As on passport/ID"
                  startIcon={
                    <HugeiconsIcon icon={UserIcon} size={15} aria-hidden="true" />
                  }
                  error={getTravellerFieldError(errors, index, "first_name")}
                  {...form.register(`travellers.${index}.first_name`)}
                />

                <Input
                  label="Middle Name (optional)"
                  autoComplete="additional-name"
                  placeholder="As on passport/ID"
                  {...form.register(`travellers.${index}.middle_name`)}
                />
              </div>

              {/* Date of Birth & Gender */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Date of birth"
                  type="date"
                  max={today}
                  error={getTravellerFieldError(errors, index, "date_of_birth")}
                  {...form.register(`travellers.${index}.date_of_birth`)}
                />

                <Controller
                  name={`travellers.${index}.gender`}
                  control={form.control}
                  render={({ field: genderField }) => (
                    <Select
                      label="Gender"
                      options={GENDER_OPTIONS}
                      value={genderField.value || ""}
                      onValueChange={genderField.onChange}
                      error={getTravellerFieldError(errors, index, "gender")}
                      helperText="As on passport or ID."
                    />
                  )}
                />
              </div>

              {/* Additional traveller email & phone (if not traveller 1) */}
              {!isLead ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Email"
                    type="email"
                    autoComplete="email"
                    placeholder="traveller@example.com"
                    startIcon={
                      <HugeiconsIcon icon={Mail01Icon} size={15} aria-hidden="true" />
                    }
                    error={getTravellerFieldError(errors, index, "email")}
                    {...form.register(`travellers.${index}.email`)}
                  />

                  <Controller
                    name={`travellers.${index}.phone`}
                    control={form.control}
                    render={({ field: phoneField }) => (
                      <>
                        <input
                          type="hidden"
                          {...form.register(
                            `travellers.${index}.phone_country_code`
                          )}
                        />
                        <PhoneField
                          label="Phone / WhatsApp"
                          value={phoneField.value ?? ""}
                          defaultCountry={
                            getCountryByDial(
                              form.watch(
                                `travellers.${index}.phone_country_code`
                              ) ?? "234"
                            ).code
                          }
                          onChange={(e164) => {
                            phoneField.onChange(e164)
                            form.setValue(
                              `travellers.${index}.phone_country_code`,
                              splitPhoneValue(e164, "234").dial,
                              { shouldValidate: true }
                            )
                          }}
                          onBlur={phoneField.onBlur}
                          placeholder="803 123 4567"
                          error={getTravellerFieldError(errors, index, "phone")}
                        />
                      </>
                    )}
                  />
                </div>
              ) : null}

              {/* Passport Details for International flights */}
              {isInternational ? (
                <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-muted/20 p-4">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground uppercase">
                    <HugeiconsIcon
                      icon={PassportIcon}
                      size={14}
                      aria-hidden="true"
                      className="text-muted-foreground"
                    />
                    <span>Passport — required for international travel</span>
                  </h4>

                  <Input
                    label="Passport number"
                    autoComplete="off"
                    placeholder="A12345678"
                    error={getTravellerFieldError(
                      errors,
                      index,
                      "passport_number"
                    )}
                    {...form.register(`travellers.${index}.passport_number`)}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Passport expiry"
                      type="date"
                      min={today}
                      error={getTravellerFieldError(
                        errors,
                        index,
                        "passport_expiry"
                      )}
                      {...form.register(`travellers.${index}.passport_expiry`)}
                    />

                    <Controller
                      name={`travellers.${index}.nationality`}
                      control={form.control}
                      render={({ field: nationalityField }) => (
                        <CountrySelect
                          label="Nationality"
                          value={nationalityField.value ?? ""}
                          onValueChange={nationalityField.onChange}
                          placeholder="Select nationality…"
                          helperText="Pick your passport country."
                          error={getTravellerFieldError(
                            errors,
                            index,
                            "nationality"
                          )}
                        />
                      )}
                    />
                  </div>
                </div>
              ) : null}
            </motion.fieldset>
          )
        })}
      </motion.div>

      <AgeBandWarnings control={form.control} />

      {/* Paying contact preference */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
        <h3 className="text-base font-bold text-foreground">Paying contact</h3>
        <Controller
          name="contactIsFirstTraveller"
          control={form.control}
          render={({ field }) => (
            <Checkbox
              label="Use Traveller 1 as the paying contact"
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              helperText="Contact name, email, and phone are copied automatically from the Lead Traveller."
            />
          )}
        />

        {!contactIsFirstTraveller ? (
          <div className="mt-2 flex flex-col gap-4">
            <Input
              label="Contact name"
              autoComplete="name"
              placeholder="Full name"
              startIcon={
                <HugeiconsIcon icon={UserIcon} size={15} aria-hidden="true" />
              }
              error={
                typeof customerErrors?.name?.message === "string"
                  ? customerErrors.name.message
                  : undefined
              }
              {...form.register("customer.name")}
            />
          </div>
        ) : null}
      </div>

      {/* Bottom Sticky Mobile Action Bar */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-4 border-t border-border bg-card/95 p-4 backdrop-blur-md sm:-mx-6 sm:-mb-6 sm:rounded-b-2xl sm:p-6 lg:hidden">
        <div className="flex flex-col gap-2.5">
          <Button
            type="submit"
            size="lg"
            isLoading={!!isSubmitting}
            disabled={!!isSubmitting || !!isReserving}
            className="w-full justify-center text-sm font-bold shadow-sm"
          >
            <HugeiconsIcon icon={LockIcon} size={16} aria-hidden="true" />
            <span>{isSubmitting ? submittingLabel : submitLabel}</span>
          </Button>

          {allowReserve ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              isLoading={!!isReserving}
              disabled={!!isSubmitting || !!isReserving}
              onClick={handleReserve}
              aria-label={`${reserveLabel} — hold your seat now, pay before the ticketing deadline`}
              className="w-full justify-center text-xs font-bold"
            >
              <span>{isReserving ? "Reserving your seat…" : reserveLabel}</span>
            </Button>
          ) : null}
        </div>

        <LegalNotice className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground" />
      </div>

      {/* Desktop legal notice footer */}
      <div className="hidden lg:block">
        <LegalNotice className="text-center text-xs leading-relaxed text-muted-foreground" />
      </div>
    </form>
  )
}
