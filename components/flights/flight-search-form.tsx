"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TravellerStepper } from "@/components/ui/traveller-stepper";
import { AirportAutocomplete } from "@/components/flights/airport-autocomplete";
import {
  type Airport,
  type Cabin,
  type OneWayFlightSearchPayload,
  oneWayFlightSearchSchema,
} from "@/lib/api/flights";
import type { TravellerComposition } from "@/lib/schemas/travel";

// Reuse domain types — party fields come from TravellerComposition,
// cabin from the flight domain (Front-End SP: reuse existing types).
// Fields with Zod defaults (cabin, currency, trip_type, non_stop, max_stops)
// stay optional to match the schema input type for a cast-free zodResolver.
export interface FlightSearchFormValues extends TravellerComposition {
  origin: string;
  destination: string;
  departureDate: string;
  cabin?: Cabin;
  currency?: "NGN";
  trip_type?: "one_way";
  non_stop?: boolean;
  max_stops?: number | null;
}

export interface FlightSearchFormProps {
  defaultValues: Partial<FlightSearchFormValues>;
  defaultOriginAirport: Airport | null;
  defaultDestinationAirport: Airport | null;
  onSubmit: (values: OneWayFlightSearchPayload) => void;
  isSearching?: boolean;
}

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
 * One-way search form (RHF + Zod, onBlur + onSubmit re-validation).
 * - Airports required via autocomplete selection (free-text IATA bypass rejected)
 * - Origin !== destination enforced
 * - Departure date uses futureDateStringSchema (real calendar, never past)
 * - Traveller composition reuses travellerCompositionSchema via oneWayFlightSearchSchema
 * - Trip type locked to one_way, currency NGN-only, non-stop + max_stops map to
 *   the backend legs contract (ticket 01 scope; story-9 client filters land later)
 */
export function FlightSearchForm({
  defaultValues,
  defaultOriginAirport,
  defaultDestinationAirport,
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
    resolver: zodResolver(oneWayFlightSearchSchema),
    defaultValues: {
      origin: defaultValues.origin ?? "",
      destination: defaultValues.destination ?? "",
      departureDate: defaultValues.departureDate ?? "",
      adults: defaultValues.adults ?? 1,
      children: defaultValues.children ?? 0,
      infants: defaultValues.infants ?? 0,
      cabin: defaultValues.cabin ?? "ECONOMY",
      currency: "NGN",
      trip_type: "one_way",
      non_stop: defaultValues.non_stop ?? false,
      max_stops: defaultValues.max_stops ?? null,
    },
    mode: "onTouched",
    shouldFocusError: true,
  });

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

  const handleFormSubmit = form.handleSubmit((values) => {
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
    const parsed = oneWayFlightSearchSchema.safeParse({ ...values, currency: "NGN", trip_type: "one_way" });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FlightSearchFormValues | undefined;
        if (field) {
          form.setError(field, { type: "zod", message: issue.message });
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

  return (
    <form
      noValidate
      onSubmit={handleFormSubmit}
      aria-label="One-way flight search"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6"
    >
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
              helperText="Applied to this one-way leg."
            />
          )}
        />
      </div>

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
  );
}
