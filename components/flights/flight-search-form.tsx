"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Calendar01Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TravellerStepper } from "@/components/ui/traveller-stepper";
import { AirportAutocomplete } from "@/components/flights/airport-autocomplete";
import {
  type Airport,
  type OneWayFlightSearchPayload,
  oneWayFlightSearchSchema,
} from "@/lib/api/flights";

export interface FlightSearchFormValues {
  origin: string;
  destination: string;
  departureDate: string;
  adults: number;
  children: number;
  infants: number;
  cabin: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  non_stop: boolean;
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
];

/**
 * One-way search form (RHF + Zod, onBlur + onSubmit re-validation).
 * - Airports required via autocomplete selection (free-text IATA bypass rejected)
 * - Origin !== destination enforced
 * - Departure date uses futureDateStringSchema (real calendar, never past)
 * - Traveller composition via shared TravellerStepper (adults ≥1, total ≤9, infants ≤ adults)
 * - Trip type locked to one_way, currency NGN default, non-stop + max_stops surfaced
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
  const [originInput, setOriginInput] = React.useState(defaultOriginAirport ? `${defaultOriginAirport.city} (${defaultOriginAirport.iata_code})` : (defaultValues.origin ?? ""));
  const [destinationInput, setDestinationInput] = React.useState(
    defaultDestinationAirport ? `${defaultDestinationAirport.city} (${defaultDestinationAirport.iata_code})` : (defaultValues.destination ?? ""),
  );

  // Sync when defaults change (URL hydration)
  React.useEffect(() => {
    setOriginAirport(defaultOriginAirport);
    setDestinationAirport(defaultDestinationAirport);
    setOriginInput(defaultOriginAirport ? `${defaultOriginAirport.city} (${defaultOriginAirport.iata_code})` : (defaultValues.origin ?? ""));
    setDestinationInput(
      defaultDestinationAirport ? `${defaultDestinationAirport.city} (${defaultDestinationAirport.iata_code})` : (defaultValues.destination ?? ""),
    );
  }, [defaultOriginAirport, defaultDestinationAirport, defaultValues.origin, defaultValues.destination]);

  const today = React.useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  const form = useForm<FlightSearchFormValues>({
    resolver: zodResolver(oneWayFlightSearchSchema as unknown as never),
    defaultValues: {
      origin: defaultValues.origin ?? "",
      destination: defaultValues.destination ?? "",
      departureDate: defaultValues.departureDate ?? "",
      adults: defaultValues.adults ?? 1,
      children: defaultValues.children ?? 0,
      infants: defaultValues.infants ?? 0,
      cabin: (defaultValues.cabin as FlightSearchFormValues["cabin"]) ?? "ECONOMY",
      non_stop: defaultValues.non_stop ?? false,
      max_stops: defaultValues.max_stops ?? null,
    },
    mode: "onTouched",
    shouldFocusError: true,
  });

  // Keep RHF origin/destination in sync with autocomplete selection
  React.useEffect(() => {
    form.setValue("origin", originAirport?.iata_code ?? originInput.trim().toUpperCase(), { shouldValidate: true });
  }, [originAirport, originInput, form]);

  React.useEffect(() => {
    form.setValue("destination", destinationAirport?.iata_code ?? destinationInput.trim().toUpperCase(), {
      shouldValidate: true,
    });
  }, [destinationAirport, destinationInput, form]);

  const handleFormSubmit = form.handleSubmit((values) => {
    // Final guard: airports must be selected via autocomplete
    if (!originAirport || originAirport.iata_code !== values.origin) {
      form.setError("origin", { type: "manual", message: "Select an origin airport from the list" });
      return;
    }
    if (!destinationAirport || destinationAirport.iata_code !== values.destination) {
      form.setError("destination", { type: "manual", message: "Select a destination airport from the list" });
      return;
    }
    const parsed = oneWayFlightSearchSchema.safeParse({
      origin: values.origin,
      destination: values.destination,
      departureDate: values.departureDate,
      adults: values.adults,
      children: values.children,
      infants: values.infants,
      cabin: values.cabin,
      currency: "NGN",
      non_stop: values.non_stop,
      max_stops: values.max_stops,
      trip_type: "one_way",
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FlightSearchFormValues | undefined;
        if (field && field in values) {
          form.setError(field as never, { type: "zod", message: issue.message });
        }
      }
      return;
    }
    onSubmit(parsed.data);
  });

  const travellers = {
    adults: form.watch("adults"),
    children: form.watch("children"),
    infants: form.watch("infants"),
  };

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
        <div className="w-full space-y-1.5">
          <label htmlFor="departureDate" className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase">
            Departure date
          </label>
          <div className="relative">
            <HugeiconsIcon
              icon={Calendar01Icon}
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="departureDate"
              type="date"
              min={today}
              aria-invalid={!!form.formState.errors.departureDate}
              aria-describedby={form.formState.errors.departureDate ? "departureDate-error" : undefined}
              className={
                "flex h-10 w-full rounded-xl border border-input bg-card px-3.5 py-2 pl-9 text-sm text-foreground shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none" +
                (form.formState.errors.departureDate ? " border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30" : "")
              }
              {...form.register("departureDate")}
            />
          </div>
          {form.formState.errors.departureDate ? (
            <p id="departureDate-error" className="text-xs font-medium text-destructive">
              {form.formState.errors.departureDate.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Today or later — real calendar dates only.</p>
          )}
        </div>

        <Controller
          name="cabin"
          control={form.control}
          render={({ field, fieldState }) => (
            <Select
              label="Cabin"
              options={CABIN_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              error={fieldState.error?.message}
              helperText="Applied to this one-way leg."
            />
          )}
        />
      </div>

      <Controller
        name="adults"
        control={form.control}
        render={({ field }) => {
          // TravellerStepper owns composition logic; bridge to RHF field
          const composition = {
            adults: travellers.adults ?? 1,
            children: travellers.children ?? 0,
            infants: travellers.infants ?? 0,
          };
          const handleCompositionChange = (next: typeof composition) => {
            form.setValue("adults", next.adults, { shouldValidate: true });
            form.setValue("children", next.children, { shouldValidate: true });
            form.setValue("infants", next.infants, { shouldValidate: true });
            field.onChange(next.adults);
          };
          const travellerError =
            (form.formState.errors.adults?.message as string) ||
            (form.formState.errors.infants?.message as string) ||
            undefined;
          return <TravellerStepper value={composition} onChange={handleCompositionChange} error={travellerError} />;
        }}
      />
      {/* Hidden mirrored fields so Zod sees children/infants */}
      <input type="hidden" {...form.register("children", { valueAsNumber: true })} />
      <input type="hidden" {...form.register("infants", { valueAsNumber: true })} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-xl border border-input bg-card px-3.5 py-2.5 shadow-xs">
          <input type="checkbox" {...form.register("non_stop")} className="size-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring" />
          <span className="text-sm font-medium text-foreground">Non-stop only</span>
        </label>

        <Controller
          name="max_stops"
          control={form.control}
          render={({ field }) => (
            <div className="w-full space-y-1.5">
              <label htmlFor="max-stops" className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase">
                Max stops (optional)
              </label>
              <select
                id="max-stops"
                value={field.value ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  field.onChange(v === "" ? null : Number(v));
                }}
                className="flex h-10 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              >
                <option value="">Any</option>
                <option value="0">0 — non-stop</option>
                <option value="1">At most 1</option>
                <option value="2">At most 2</option>
                <option value="3">At most 3</option>
              </select>
            </div>
          )}
        />
      </div>

      {form.formState.errors.root?.message ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 p-3.5 text-xs leading-relaxed text-foreground">
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
