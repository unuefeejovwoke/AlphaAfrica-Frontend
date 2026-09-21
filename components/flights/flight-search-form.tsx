"use client";

import * as React from "react";
import { Controller, FormProvider, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, AlertCircleIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TravellerStepper } from "@/components/ui/traveller-stepper";
import { AirportAutocomplete } from "@/components/flights/airport-autocomplete";
import { LegFields, type LegSelection } from "@/components/flights/leg-fields";
import {
  type Airport,
  type Cabin,
  type FlightSearchPayload,
  type FlightSearchFormValues,
  canAddLeg,
  canRemoveLeg,
  createEmptyLeg,
  flightSearchFormSchema,
  tripTypeSchema,
} from "@/lib/api/flights";
import { cn } from "@/lib/utils";

export interface FlightSearchFormProps {
  defaultValues: Partial<FlightSearchFormValues>;
  defaultOriginAirport: Airport | null;
  defaultDestinationAirport: Airport | null;
  /** URL-hydrated multi-city airports, aligned by leg position at first mount. */
  defaultLegAirports?: { origin: Airport | null; destination: Airport | null }[];
  onSubmit: (values: FlightSearchPayload) => void;
  isSearching?: boolean;
}

const TRIP_TYPE_OPTIONS = [
  { value: "one_way", label: "One-way", hint: "Single leg" },
  { value: "round_trip", label: "Round-trip", hint: "Outbound + return" },
  { value: "multi_city", label: "Multi-city", hint: "2–6 legs" },
] as const;

type TripType = (typeof TRIP_TYPE_OPTIONS)[number]["value"];

const CABIN_OPTIONS = [
  { value: "ECONOMY", label: "Economy" },
  { value: "PREMIUM_ECONOMY", label: "Premium Economy" },
  { value: "BUSINESS", label: "Business" },
  { value: "FIRST", label: "First" },
] as const;

const MAX_STOPS_OPTIONS = [
  { value: "", label: "Any stops" },
  { value: "0", label: "0 — non-stop" },
  { value: "1", label: "At most 1" },
  { value: "2", label: "At most 2" },
  { value: "3", label: "At most 3" },
];

/**
 * Trip-type search form (RHF + Zod, onBlur + onSubmit re-validation).
 * - Extends the ticket-01 one-way form: same top-level editors for
 *   one-way/round-trip, plus a legs array (useFieldArray) of LegFields for
 *   multi-city. Results reuse the same Flight Offer card shape for all types.
 * - Live validation uses the flat form schema (stable `legs` path); submit
 *   parses with the tripTypeSchema discriminated union — the domain source
 *   of truth — so backend mapping stays strictly typed.
 * - Airports required via autocomplete selection (free-text IATA bypass
 *   rejected); global cabin applies to every leg while legs stay per-leg
 *   capable in the contract.
 */
export function FlightSearchForm({
  defaultValues,
  defaultOriginAirport,
  defaultDestinationAirport,
  defaultLegAirports,
  onSubmit,
  isSearching,
}: FlightSearchFormProps) {
  const [originAirport, setOriginAirport] = React.useState<Airport | null>(defaultOriginAirport);
  const [destinationAirport, setDestinationAirport] = React.useState<Airport | null>(defaultDestinationAirport);
  const [originInput, setOriginInput] = React.useState(
    defaultOriginAirport ? `${defaultOriginAirport.city} (${defaultOriginAirport.iata_code})` : (defaultValues.origin ?? ""),
  );
  const [destinationInput, setDestinationInput] = React.useState(
    defaultDestinationAirport
      ? `${defaultDestinationAirport.city} (${defaultDestinationAirport.iata_code})`
      : (defaultValues.destination ?? ""),
  );

  // Sync when defaults change (URL hydration)
  React.useEffect(() => {
    setOriginAirport(defaultOriginAirport);
    setDestinationAirport(defaultDestinationAirport);
    setOriginInput(
      defaultOriginAirport ? `${defaultOriginAirport.city} (${defaultOriginAirport.iata_code})` : (defaultValues.origin ?? ""),
    );
    setDestinationInput(
      defaultDestinationAirport
        ? `${defaultDestinationAirport.city} (${defaultDestinationAirport.iata_code})`
        : (defaultValues.destination ?? ""),
    );
  }, [defaultOriginAirport, defaultDestinationAirport, defaultValues.origin, defaultValues.destination]);

  const today = React.useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  const form = useForm<FlightSearchFormValues>({
    resolver: zodResolver(flightSearchFormSchema),
    defaultValues: {
      trip_type: defaultValues.trip_type ?? "one_way",
      origin: defaultValues.origin ?? "",
      destination: defaultValues.destination ?? "",
      departureDate: defaultValues.departureDate ?? "",
      returnDate: defaultValues.returnDate ?? "",
      legs: defaultValues.legs ?? [createEmptyLeg(), createEmptyLeg()],
      adults: defaultValues.adults ?? 1,
      children: defaultValues.children ?? 0,
      infants: defaultValues.infants ?? 0,
      cabin: defaultValues.cabin ?? "ECONOMY",
      currency: "NGN",
      non_stop: defaultValues.non_stop ?? false,
      max_stops: defaultValues.max_stops ?? null,
    },
    mode: "onTouched",
    shouldFocusError: true,
  });

  // Multi-city legs — stable array path for every trip type (the flat form
  // schema keeps `legs` mounted so useFieldArray never loses its field).
  const {
    fields: legFields,
    append: appendLeg,
    remove: removeLeg,
  } = useFieldArray({ control: form.control, name: "legs" });

  // Leg autocomplete selections live in a ref (not state) so typing in one
  // leg never re-renders the parent or sibling legs (vercel: rerender-split).
  const legSelectionsRef = React.useRef(new Map<string, LegSelection>());
  const handleLegSelection = React.useCallback((fieldId: string, selection: LegSelection) => {
    legSelectionsRef.current.set(fieldId, selection);
  }, []);

  const tripType: TripType = form.watch("trip_type") ?? "one_way";

  const handleTripChange = (next: TripType) => {
    form.setValue("trip_type", next, { shouldValidate: true });
    // Hidden-branch errors must not linger after switching trip type.
    form.clearErrors();
  };

  const handleAddLeg = () => {
    if (canAddLeg(legFields.length)) {
      appendLeg(createEmptyLeg());
    }
  };

  const handleRemoveLeg = (index: number, fieldId: string) => {
    if (canRemoveLeg(legFields.length)) {
      legSelectionsRef.current.delete(fieldId);
      removeLeg(index);
    }
  };

  // Keep RHF origin/destination in sync with autocomplete selection
  React.useEffect(() => {
    form.setValue("origin", originAirport?.iata_code ?? originInput.trim().toUpperCase(), {
      shouldValidate: true,
    });
  }, [originAirport, originInput, form]);

  React.useEffect(() => {
    form.setValue("destination", destinationAirport?.iata_code ?? destinationInput.trim().toUpperCase(), {
      shouldValidate: true,
    });
  }, [destinationAirport, destinationInput, form]);

  const adults = form.watch("adults");
  const children = form.watch("children");
  const infants = form.watch("infants");
  const departureDateValue = form.watch("departureDate") ?? "";

  const handleFormSubmit = form.handleSubmit((values) => {
    const trip = values.trip_type;
    if (trip === "multi_city") {
      // Final guard: every leg's airports must be selected via autocomplete.
      let blocked = false;
      legFields.forEach((field, i) => {
        const selection = legSelectionsRef.current.get(field.id);
        const leg = values.legs[i];
        if (!selection?.origin || selection.origin.iata_code !== leg?.origin) {
          form.setError(`legs.${i}.origin`, {
            type: "manual",
            message: "Select an origin airport from the list",
          });
          blocked = true;
        }
        if (!selection?.destination || selection.destination.iata_code !== leg?.destination) {
          form.setError(`legs.${i}.destination`, {
            type: "manual",
            message: "Select a destination airport from the list",
          });
          blocked = true;
        }
      });
      if (blocked) return;
    } else {
      // Final guard: airports must be selected via autocomplete.
      // URL-hydrated airports arrive as defaultOriginAirport/defaultDestinationAirport
      // so shared links still submit; typed-but-unselected IATA is rejected here.
      const origin = values.origin;
      const destination = values.destination;
      if (!originAirport || originAirport.iata_code !== origin) {
        form.setError("origin", { type: "manual", message: "Select an origin airport from the list" });
        return;
      }
      if (!destinationAirport || destinationAirport.iata_code !== destination) {
        form.setError("destination", { type: "manual", message: "Select a destination airport from the list" });
        return;
      }
    }
    // Domain validation via the discriminated union (strict, backend-mapped).
    const parsed = tripTypeSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const [seg0, seg1, seg2] = issue.path;
        if (
          seg0 === "legs" &&
          typeof seg1 === "number" &&
          (seg2 === "origin" || seg2 === "destination" || seg2 === "date")
        ) {
          form.setError(`legs.${seg1}.${seg2}`, { type: "zod", message: issue.message });
        } else if (
          seg0 === "origin" ||
          seg0 === "destination" ||
          seg0 === "departureDate" ||
          seg0 === "returnDate" ||
          seg0 === "adults" ||
          seg0 === "children" ||
          seg0 === "infants" ||
          seg0 === "cabin" ||
          seg0 === "max_stops"
        ) {
          form.setError(seg0, { type: "zod", message: issue.message });
        } else {
          // Leg-chain and other cross-leg errors surface on the form alert.
          form.setError("root", { type: "zod", message: issue.message });
        }
      }
      return;
    }
    onSubmit(parsed.data);
  });

  const composition = {
    adults: adults ?? 1,
    children: children ?? 0,
    infants: infants ?? 0,
  };
  const handleCompositionChange = (next: typeof composition) => {
    form.setValue("adults", next.adults, { shouldValidate: true });
    form.setValue("children", next.children, { shouldValidate: true });
    form.setValue("infants", next.infants, { shouldValidate: true });
  };
  const travellerError =
    form.formState.errors.adults?.message ?? form.formState.errors.infants?.message ?? undefined;

  const legsArrayError =
    typeof form.formState.errors.legs?.message === "string"
      ? form.formState.errors.legs.message
      : undefined;

  // Global cabin selector — one control applied to every leg in v1.
  const cabinField = (
    <Controller
      name="cabin"
      control={form.control}
      render={({ field, fieldState }) => (
        <Select
          label="Cabin"
          options={[...CABIN_OPTIONS]}
          value={field.value}
          onValueChange={field.onChange}
          error={fieldState.error?.message}
          helperText="Applied to every leg."
        />
      )}
    />
  );

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={handleFormSubmit}
        aria-label="Flight search"
        className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6"
      >
        <div role="radiogroup" aria-label="Trip type" className="grid grid-cols-3 gap-2">
          {TRIP_TYPE_OPTIONS.map((option) => {
            const checked = tripType === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "flex min-h-16 cursor-pointer touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2.5 text-center transition-colors",
                  "focus-within:ring-2 focus-within:ring-ring/30 focus-within:outline-none",
                  checked
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="trip_type"
                  value={option.value}
                  checked={checked}
                  onChange={() => handleTripChange(option.value)}
                  className="sr-only"
                />
                <span className="text-sm font-semibold text-foreground">{option.label}</span>
                <span className="text-[11px] text-muted-foreground">{option.hint}</span>
              </label>
            );
          })}
        </div>

        {tripType === "multi_city" ? (
          <div className="flex flex-col gap-4">
            {legFields.map((field, i) => (
              <LegFields
                key={field.id}
                index={i}
                legCount={legFields.length}
                fieldId={field.id}
                initialOrigin={defaultLegAirports?.[i]?.origin ?? null}
                initialDestination={defaultLegAirports?.[i]?.destination ?? null}
                dateMin={today}
                showRemove={canRemoveLeg(legFields.length)}
                onRemove={() => handleRemoveLeg(i, field.id)}
                onSelectionChange={handleLegSelection}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddLeg}
              disabled={!canAddLeg(legFields.length)}
              className="w-full justify-center"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={16} aria-hidden="true" />
              <span>
                {canAddLeg(legFields.length)
                  ? `Add leg (${legFields.length} of 6)`
                  : "Maximum 6 legs"}
              </span>
            </Button>
            {legsArrayError ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {legsArrayError}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <AirportAutocomplete
                label="Origin"
                placeholder="Lagos, LOS, Murtala Muhammed…"
                value={originInput}
                selectedAirport={originAirport}
                onSelect={setOriginAirport}
                onInputChange={setOriginInput}
                error={form.formState.errors.origin?.message}
                helperText="Type at least 2 characters. Pick from the list."
                excludeIata={destinationAirport?.iata_code ?? null}
              />
              <AirportAutocomplete
                label="Destination"
                placeholder="London, LHR, Heathrow…"
                value={destinationInput}
                selectedAirport={destinationAirport}
                onSelect={setDestinationAirport}
                onInputChange={setDestinationInput}
                error={form.formState.errors.destination?.message}
                helperText="International search — try city, name, or code."
                excludeIata={originAirport?.iata_code ?? null}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Departure date"
                type="date"
                min={today}
                helperText="Today or later — real calendar dates only."
                error={form.formState.errors.departureDate?.message}
                {...form.register("departureDate")}
              />

              {tripType === "round_trip" ? (
                <Input
                  label="Return date"
                  type="date"
                  min={departureDateValue || today}
                  helperText="On or after the departure date."
                  error={form.formState.errors.returnDate?.message}
                  {...form.register("returnDate")}
                />
              ) : (
                cabinField
              )}
            </div>

            {tripType === "round_trip" ? cabinField : null}
          </>
        )}

        {tripType === "multi_city" ? cabinField : null}

        <TravellerStepper value={composition} onChange={handleCompositionChange} error={travellerError} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="non_stop"
            control={form.control}
            render={({ field }) => (
              <Checkbox
                label="Non-stop only"
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
                helperText="Only show flights without stops."
              />
            )}
          />

          <Controller
            name="max_stops"
            control={form.control}
            render={({ field, fieldState }) => (
              <Select
                label="Max stops (optional)"
                options={[...MAX_STOPS_OPTIONS]}
                value={field.value === null || field.value === undefined ? "" : String(field.value)}
                onValueChange={(next) => field.onChange(next === "" ? null : Number(next))}
                error={fieldState.error?.message}
                helperText="Cap connections per offer."
              />
            )}
          />
        </div>

        {form.formState.errors.root?.message ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 p-3.5 text-xs leading-relaxed text-foreground"
          >
            <HugeiconsIcon icon={AlertCircleIcon} size={16} className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
            <span>{form.formState.errors.root.message}</span>
          </div>
        ) : null}

        <Button type="submit" size="lg" isLoading={!!isSearching} disabled={!!isSearching} className="w-full justify-center">
          <HugeiconsIcon icon={Search01Icon} size={18} aria-hidden="true" />
          <span>{isSearching ? "Searching flights…" : "Search flights"}</span>
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          No account needed. Prices in NGN. You&apos;ll confirm the live fare before paying.
        </p>
      </form>
    </FormProvider>
  );
}
