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
  Mail01Icon,
  PassportIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
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
  /**
   * Validated submit — awaited by the form, so `isSubmitting` stays true while
   * the parent creates the Booking and hands off to Paystack or to the
   * reservation confirmation. One form, one validation path, an intent
   * argument: the primary action remains a real submit with `pay_now`, and the
   * secondary action (when offered) invokes the form's own submit handler with
   * `reserve`. Both run identical validation — no duplicated schema, no second
   * form.
   */
  onSubmit: (
    payload: BookingTravellersPayload,
    intent: TravellerSubmitIntent
  ) => void | Promise<void>
  isSubmitting?: boolean
  /** True while the reserve action is creating the hold. */
  isReserving?: boolean
  /**
   * Prefill from a restored Travellers draft (refresh / back from Paystack).
   * Must match `party`; callers pass null when it does not.
   */
  initialValues?: TravellerFormValues | null
  /** Primary action copy. Defaults to the traveller-details wording. */
  submitLabel?: string
  submittingLabel?: string
  /**
   * Render the secondary reserve action. Only ever true for an international
   * Flight Offer — domestic QuickAir offers no hold, so no second action.
   */
  allowReserve?: boolean
  /** Secondary action copy. Should carry the amount being committed to. */
  reserveLabel?: string
}

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

/** Array-level issues (path ["travellers"]) surface as one alert, not per card. */
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

/**
 * Soft age-band warnings in an isolated subscriber — keystrokes re-render
 * only this block, never the whole form (vercel: rerender-memo).
 */
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

/**
 * Guided Traveller + Customer entry (RHF + Zod, onTouched + onSubmit).
 * - Slots are fixed by the search-step party with types auto-assigned, so
 *   useFieldArray only provides stable field identities (no add/remove —
 *   composition is owned by search and re-validated by the schema).
 * - International renders passport number/expiry/nationality; domestic hides
 *   them entirely. DOB hard-fails future dates; age bands warn softly.
 * - Contact-is-first-Traveller is checked by default; submit copies Traveller
 *   1 into the contact (an event handler, never an effect).
 */
export function TravellerDetailsForm({
  party,
  isInternational,
  onSubmit,
  isSubmitting,
  isReserving,
  initialValues,
  submitLabel = "Save traveller details",
  submittingLabel = "Saving details…",
  allowReserve = false,
  reserveLabel = "Reserve and pay later",
}: TravellerDetailsFormProps) {
  // Factory schema memoized on primitives so resolver identity stays stable.
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

  // TInput carries the raw form state (the gender select reads typed text
  // until parse); TTransformedValues is the schema-parsed output that submit
  // receives — phones normalized, gender narrowed.
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

  // The secondary action invokes the form's own submit handler with the other
  // intent — identical validation, no second form. A non-submit button, so
  // Enter still takes the prominent pay-now path.
  const handleReserve = submitAs("reserve")

  const contactSummary =
    firstTraveller?.first_name ||
    firstTraveller?.last_name ||
    firstTraveller?.email ||
    firstTraveller?.phone
      ? `${firstTraveller.first_name} ${firstTraveller.last_name}`.trim() +
        (firstTraveller.email ? ` · ${firstTraveller.email}` : "") +
        (firstTraveller.phone ? ` · ${firstTraveller.phone}` : "")
      : "Fill in Traveller 1 above — the contact copies automatically."

  return (
    <form
      noValidate
      onSubmit={handlePayNow}
      aria-label="Traveller details"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6"
    >
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

      {/* Traveller cards arrive as a coordinated stagger — composited
          opacity + y only, clipped per card so expansion reads fluid. */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-5"
      >
        {fields.map((field, index) => {
          const travellerType = field.traveler_type
          return (
            <motion.fieldset
              key={field.id}
              variants={accordionPanelVariants}
              className="flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-muted/20 p-4"
            >
              <legend className="px-1 text-sm font-bold text-foreground">
                Traveller {index + 1} · {TRAVELER_TYPE_LABELS[travellerType]}
              </legend>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="First name"
                  autoComplete="given-name"
                  placeholder="As on passport or ID"
                  startIcon={
                    <HugeiconsIcon
                      icon={UserIcon}
                      size={15}
                      aria-hidden="true"
                    />
                  }
                  error={getTravellerFieldError(errors, index, "first_name")}
                  {...form.register(`travellers.${index}.first_name`)}
                />
                <Input
                  label="Last name"
                  autoComplete="family-name"
                  placeholder="As on passport or ID"
                  startIcon={
                    <HugeiconsIcon
                      icon={UserIcon}
                      size={15}
                      aria-hidden="true"
                    />
                  }
                  error={getTravellerFieldError(errors, index, "last_name")}
                  {...form.register(`travellers.${index}.last_name`)}
                />
              </div>

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

              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="traveller@example.com"
                startIcon={
                  <HugeiconsIcon
                    icon={Mail01Icon}
                    size={15}
                    aria-hidden="true"
                  />
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

              {isInternational ? (
                <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border p-3.5">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground/80 uppercase">
                    <HugeiconsIcon
                      icon={PassportIcon}
                      size={14}
                      aria-hidden="true"
                      className="text-muted-foreground"
                    />
                    <span>Passport — required for international travel</span>
                  </h3>
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

      <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
        <p className="text-sm font-bold text-foreground">Paying contact</p>
        <Controller
          name="contactIsFirstTraveller"
          control={form.control}
          render={({ field }) => (
            <Checkbox
              label="Use Traveller 1 as the paying contact"
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              helperText="Name, email, and phone are copied automatically."
            />
          )}
        />
        {contactIsFirstTraveller ? (
          <p
            aria-live="polite"
            className="min-w-0 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-relaxed break-words text-muted-foreground"
          >
            {contactSummary}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
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
                  placeholder="803 123 4567"
                  error={
                    typeof customerErrors?.phone?.message === "string"
                      ? customerErrors.phone.message
                      : undefined
                  }
                />
              )}
            />
          </div>
        )}
      </div>

      {/* Full-bleed action bar attached to the card — the normal floating
          checkout CTA. The support widget is offset above it on checkout. */}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 border-t border-border bg-card p-3 sm:-mx-6 sm:-mb-6 sm:rounded-b-2xl sm:px-6 sm:pb-4">
        {allowReserve ? (
          <p className="mb-2.5 text-xs leading-relaxed text-muted-foreground">
            Reserving holds your seat with the airline now — no payment is taken
            today. You pay before the ticketing deadline, or the hold is
            released.
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            size="lg"
            isLoading={!!isSubmitting}
            disabled={!!isSubmitting || !!isReserving}
            className="w-full justify-center"
          >
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
              className="w-full justify-center"
            >
              <span>{isReserving ? "Reserving your seat…" : reserveLabel}</span>
            </Button>
          ) : null}
        </div>
        <LegalNotice className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground" />
      </div>
    </form>
  )
}
