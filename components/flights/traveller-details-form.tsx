"use client";

import * as React from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TrackLink } from "@/components/analytics/track-link";
import { getFlightSupportWhatsAppUrl, type FlightTripContext } from "@/lib/api/flights";
import {
  buildBookingTravellersPayload,
  createTravellerFormSchema,
  createTravellerSlots,
  getTravellerAgeWarnings,
  type BookingTravellersPayload,
  type TravellerComposition,
  type TravellerFormTraveller,
  type TravellerFormValues,
  type TravelerType,
} from "@/lib/schemas/travel";

export interface TravellerDetailsFormProps {
  party: TravellerComposition;
  isInternational: boolean;
  onSubmit: (payload: BookingTravellersPayload) => void;
  isSubmitting?: boolean;
  /** Trip context (route, dates, party) for the support hatch. */
  trip?: FlightTripContext;
}

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

const TRAVELER_TYPE_LABELS: Record<TravelerType, string> = {
  ADULT: "Adult",
  CHILD: "Child",
  HELD_INFANT: "Held infant",
};

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
  | "nationality";

/** Array-level issues (path ["travellers"]) surface as one alert, not per card. */
function getTravellersArrayError(errors: FieldErrors<TravellerFormValues>): string | undefined {
  const list = errors.travellers;
  if (!Array.isArray(list) && typeof list?.message === "string") return list.message;
  return undefined;
}

function getTravellerFieldError(
  errors: FieldErrors<TravellerFormValues>,
  index: number,
  field: TravellerFieldName,
): string | undefined {
  const list = errors.travellers;
  if (!Array.isArray(list)) return undefined;
  const message = list[index]?.[field]?.message;
  return typeof message === "string" ? message : undefined;
}

/**
 * Soft age-band warnings in an isolated subscriber — keystrokes re-render
 * only this block, never the whole form (vercel: rerender-memo).
 */
const AgeBandWarnings = React.memo(function AgeBandWarnings({
  control,
}: {
  control: Control<TravellerFormValues>;
}) {
  const travellers = useWatch({ control, name: "travellers" });
  const warnings = React.useMemo(
    () =>
      getTravellerAgeWarnings(
        (travellers ?? []).map((traveller: TravellerFormTraveller) => ({
          date_of_birth: traveller.date_of_birth,
          traveler_type: traveller.traveler_type,
        })),
      ),
    [travellers],
  );
  if (warnings.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5"
    >
      {warnings.map((warning) => (
        <p key={`${warning.index}-${warning.traveler_type}`} className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
          <HugeiconsIcon icon={InformationCircleIcon} size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          <span>{warning.message}</span>
        </p>
      ))}
    </div>
  );
});

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
  trip,
}: TravellerDetailsFormProps) {
  // Factory schema memoized on primitives so resolver identity stays stable.
  const schema = React.useMemo(
    () => createTravellerFormSchema({ party, isInternational }),
    [party.adults, party.children, party.infants, isInternational],
  );
  const defaultValues = React.useMemo<TravellerFormValues>(
    () => ({
      travellers: createTravellerSlots(party),
      contactIsFirstTraveller: true,
      customer: { name: "", email: "", phone: "" },
    }),
    [party.adults, party.children, party.infants],
  );

  const form = useForm<TravellerFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
    shouldFocusError: true,
  });

  const { fields } = useFieldArray({ control: form.control, name: "travellers" });

  const today = React.useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  const contactIsFirstTraveller = form.watch("contactIsFirstTraveller") ?? true;
  const firstTraveller = form.watch("travellers.0");
  const errors = form.formState.errors;
  const arrayError = getTravellersArrayError(errors);
  const customerErrors = errors.customer;

  const handleFormSubmit = form.handleSubmit((values) => {
    onSubmit(buildBookingTravellersPayload(values));
  });

  const contactSummary =
    firstTraveller?.first_name || firstTraveller?.last_name || firstTraveller?.email || firstTraveller?.phone
      ? `${firstTraveller.first_name} ${firstTraveller.last_name}`.trim() +
        (firstTraveller.email ? ` · ${firstTraveller.email}` : "") +
        (firstTraveller.phone ? ` · ${firstTraveller.phone}` : "")
      : "Fill in Traveller 1 above — the contact copies automatically.";

  return (
    <form
      noValidate
      onSubmit={handleFormSubmit}
      aria-label="Traveller details"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6"
    >
      {arrayError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 p-3.5 text-xs leading-relaxed text-foreground"
        >
          <HugeiconsIcon icon={AlertCircleIcon} size={16} className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
          <span>{arrayError}</span>
        </div>
      ) : null}

      {fields.map((field, index) => {
        const travellerType = field.traveler_type;
        return (
          <fieldset
            key={field.id}
            className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4"
          >
            <legend className="px-1 text-sm font-bold text-foreground">
              Traveller {index + 1} · {TRAVELER_TYPE_LABELS[travellerType]}
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                autoComplete="given-name"
                placeholder="As on passport or ID"
                error={getTravellerFieldError(errors, index, "first_name")}
                {...form.register(`travellers.${index}.first_name`)}
              />
              <Input
                label="Last name"
                autoComplete="family-name"
                placeholder="As on passport or ID"
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
              error={getTravellerFieldError(errors, index, "email")}
              {...form.register(`travellers.${index}.email`)}
            />

            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[96px_1fr]">
              <Input
                label="Code"
                inputMode="numeric"
                maxLength={4}
                placeholder="234"
                helperText="Country"
                error={getTravellerFieldError(errors, index, "phone_country_code")}
                {...form.register(`travellers.${index}.phone_country_code`)}
              />
              <Input
                label="Phone"
                type="tel"
                autoComplete="tel"
                placeholder="0803 123 4567"
                helperText="Nigerian formats accepted."
                error={getTravellerFieldError(errors, index, "phone")}
                {...form.register(`travellers.${index}.phone`)}
              />
            </div>

            {isInternational ? (
              <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border p-3.5">
                <h3 className="text-xs font-semibold tracking-wide text-foreground/80 uppercase">
                  Passport — required for international travel
                </h3>
                <Input
                  label="Passport number"
                  autoComplete="off"
                  placeholder="A12345678"
                  error={getTravellerFieldError(errors, index, "passport_number")}
                  {...form.register(`travellers.${index}.passport_number`)}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Passport expiry"
                    type="date"
                    min={today}
                    error={getTravellerFieldError(errors, index, "passport_expiry")}
                    {...form.register(`travellers.${index}.passport_expiry`)}
                  />
                  <Input
                    label="Nationality"
                    autoComplete="off"
                    maxLength={2}
                    placeholder="NG"
                    helperText="2-letter code."
                    className="uppercase"
                    error={getTravellerFieldError(errors, index, "nationality")}
                    {...form.register(`travellers.${index}.nationality`)}
                  />
                </div>
              </div>
            ) : null}
          </fieldset>
        );
      })}

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
          <p aria-live="polite" className="min-w-0 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-relaxed break-words text-muted-foreground">
            {contactSummary}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <Input
              label="Contact name"
              autoComplete="name"
              placeholder="Full name"
              error={typeof customerErrors?.name?.message === "string" ? customerErrors.name.message : undefined}
              {...form.register("customer.name")}
            />
            <Input
              label="Contact email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={typeof customerErrors?.email?.message === "string" ? customerErrors.email.message : undefined}
              {...form.register("customer.email")}
            />
            <Input
              label="Contact phone"
              type="tel"
              autoComplete="tel"
              placeholder="0803 123 4567"
              helperText="Nigerian formats accepted."
              error={typeof customerErrors?.phone?.message === "string" ? customerErrors.phone.message : undefined}
              {...form.register("customer.phone")}
            />
          </div>
        )}
      </div>

      <div className="sticky bottom-4 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
        <Button type="submit" size="lg" isLoading={!!isSubmitting} disabled={!!isSubmitting} className="w-full justify-center">
          <span>{isSubmitting ? "Saving details…" : "Save traveller details"}</span>
        </Button>
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        No account needed. Details are validated before payment —{" "}
        <TrackLink
          event="support_click"
          eventProps={{ context: "entering traveller details", channel: "whatsapp" }}
          href={getFlightSupportWhatsAppUrl("entering traveller details", trip)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          Talk to Alphaa
        </TrackLink>{" "}
        if anything is unclear.
      </p>
    </form>
  );
}
