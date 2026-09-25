"use client"

import * as React from "react"
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  AlertCircleIcon,
  PlusSignIcon,
  ArrowRight01Icon,
  Exchange01Icon,
  Airplane01Icon,
  ArrowLeftRightIcon,
  ArrowDown01Icon,
  UserIcon,
  Calendar01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { TravellerStepper } from "@/components/ui/traveller-stepper"
import { AirportAutocomplete } from "@/components/flights/airport-autocomplete"
import { LegFields, type LegSelection } from "@/components/flights/leg-fields"
import { isDomesticSearch } from "@/lib/api/domestic"
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
} from "@/lib/api/flights"
import { cn } from "@/lib/utils"

export interface FlightSearchFormProps {
  defaultValues: Partial<FlightSearchFormValues>
  defaultOriginAirport: Airport | null
  defaultDestinationAirport: Airport | null
  /** URL-hydrated multi-city airports, aligned by leg position at first mount. */
  defaultLegAirports?: { origin: Airport | null; destination: Airport | null }[]
  onSubmit: (values: FlightSearchPayload) => void
  isSearching?: boolean
  onCancel?: () => void
}

const TRIP_TYPE_OPTIONS = [
  { value: "one_way", label: "One way", icon: ArrowRight01Icon },
  { value: "round_trip", label: "Round trip", icon: Exchange01Icon },
  { value: "multi_city", label: "Multi-city", icon: Airplane01Icon },
] as const

type TripType = (typeof TRIP_TYPE_OPTIONS)[number]["value"]

const CABIN_OPTIONS = [
  { value: "ECONOMY", label: "Economy" },
  { value: "PREMIUM_ECONOMY", label: "Premium Economy" },
  { value: "BUSINESS", label: "Business" },
  { value: "FIRST", label: "First" },
] as const

const MAX_STOPS_OPTIONS = [
  { value: "", label: "Any stops" },
  { value: "0", label: "0 — non-stop" },
  { value: "1", label: "At most 1" },
  { value: "2", label: "At most 2" },
  { value: "3", label: "At most 3" },
]

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
  onCancel,
}: FlightSearchFormProps) {
  const [originAirport, setOriginAirport] = React.useState<Airport | null>(
    defaultOriginAirport
  )
  const [destinationAirport, setDestinationAirport] =
    React.useState<Airport | null>(defaultDestinationAirport)
  const [originInput, setOriginInput] = React.useState(
    defaultOriginAirport
      ? `${defaultOriginAirport.iata_code} – ${defaultOriginAirport.name || defaultOriginAirport.city}`
      : (defaultValues.origin ?? "")
  )
  const [destinationInput, setDestinationInput] = React.useState(
    defaultDestinationAirport
      ? `${defaultDestinationAirport.iata_code} – ${defaultDestinationAirport.name || defaultDestinationAirport.city}`
      : (defaultValues.destination ?? "")
  )

  // Sync when defaults change (URL hydration)
  React.useEffect(() => {
    setOriginAirport(defaultOriginAirport)
    setDestinationAirport(defaultDestinationAirport)
    setOriginInput(
      defaultOriginAirport
        ? `${defaultOriginAirport.iata_code} – ${defaultOriginAirport.name || defaultOriginAirport.city}`
        : (defaultValues.origin ?? "")
    )
    setDestinationInput(
      defaultDestinationAirport
        ? `${defaultDestinationAirport.iata_code} – ${defaultDestinationAirport.name || defaultDestinationAirport.city}`
        : (defaultValues.destination ?? "")
    )
  }, [
    defaultOriginAirport,
    defaultDestinationAirport,
    defaultValues.origin,
    defaultValues.destination,
  ])

  const today = React.useMemo(() => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 10)
  }, [])

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
  })

  // Multi-city legs — stable array path for every trip type (the flat form
  // schema keeps `legs` mounted so useFieldArray never loses its field).
  const {
    fields: legFields,
    append: appendLeg,
    remove: removeLeg,
  } = useFieldArray({ control: form.control, name: "legs" })

  // Leg autocomplete selections live in a ref (not state) so typing in one
  // leg never re-renders the parent or sibling legs (vercel: rerender-split).
  const legSelectionsRef = React.useRef(new Map<string, LegSelection>())
  const handleLegSelection = React.useCallback(
    (fieldId: string, selection: LegSelection) => {
      legSelectionsRef.current.set(fieldId, selection)
    },
    []
  )

  const tripType: TripType = form.watch("trip_type") ?? "one_way"

  const handleTripChange = (next: TripType) => {
    form.setValue("trip_type", next, { shouldValidate: true })
    // Hidden-branch errors must not linger after switching trip type.
    form.clearErrors()
  }

  const handleAddLeg = () => {
    if (canAddLeg(legFields.length)) {
      appendLeg(createEmptyLeg())
    }
  }

  const handleRemoveLeg = (index: number, fieldId: string) => {
    if (canRemoveLeg(legFields.length)) {
      legSelectionsRef.current.delete(fieldId)
      removeLeg(index)
    }
  }

  const formatAirportDisplay = (airport: Airport) => {
    return `${airport.iata_code} – ${airport.name || airport.city}`
  }

  const handleOriginSelect = (airport: Airport | null) => {
    setOriginAirport(airport)
    if (airport) {
      form.setValue("origin", airport.iata_code, { shouldValidate: false })
      form.clearErrors("origin")
      if (
        destinationAirport &&
        destinationAirport.iata_code !== airport.iata_code
      ) {
        form.clearErrors("destination")
      }
    } else {
      form.setValue("origin", "", { shouldValidate: false })
    }
  }

  const handleOriginInputChange = (val: string) => {
    setOriginInput(val)
    form.clearErrors("origin")
  }

  const handleDestinationSelect = (airport: Airport | null) => {
    setDestinationAirport(airport)
    if (airport) {
      form.setValue("destination", airport.iata_code, { shouldValidate: false })
      form.clearErrors("destination")
      if (originAirport && originAirport.iata_code !== airport.iata_code) {
        form.clearErrors("origin")
      }
    } else {
      form.setValue("destination", "", { shouldValidate: false })
    }
  }

  const handleDestinationInputChange = (val: string) => {
    setDestinationInput(val)
    form.clearErrors("destination")
  }

  const handleSwap = () => {
    const nextOriginInput = destinationInput
    const nextDestinationInput = originInput
    const nextOriginAirport = destinationAirport
    const nextDestinationAirport = originAirport
    setOriginInput(nextOriginInput)
    setDestinationInput(nextDestinationInput)
    setOriginAirport(nextOriginAirport)
    setDestinationAirport(nextDestinationAirport)
    form.setValue("origin", nextOriginAirport?.iata_code ?? "", {
      shouldValidate: false,
    })
    form.setValue("destination", nextDestinationAirport?.iata_code ?? "", {
      shouldValidate: false,
    })
    form.clearErrors(["origin", "destination"])
  }

  const canSwap = originInput.trim() !== "" || destinationInput.trim() !== ""

  // Sync valid airport selections into RHF
  React.useEffect(() => {
    if (originAirport) {
      form.setValue("origin", originAirport.iata_code, {
        shouldValidate: false,
      })
    }
  }, [originAirport, form])

  React.useEffect(() => {
    if (destinationAirport) {
      form.setValue("destination", destinationAirport.iata_code, {
        shouldValidate: false,
      })
    }
  }, [destinationAirport, form])

  const adults = form.watch("adults")
  const children = form.watch("children")
  const infants = form.watch("infants")
  const departureDateValue = form.watch("departureDate") ?? ""
  const originValue = form.watch("origin") ?? ""
  const destinationValue = form.watch("destination") ?? ""

  // Both-Nigerian one-way/round-trip routes stream via QuickAir, which is
  // Economy-only in v1: cabin and stop controls disable with explanation and
  // the backend never receives fare classes it ignores (the domestic search
  // params carry no cabin/non-stop/max-stops). Multi-city always uses the
  // international path, so its controls stay enabled.
  const isDomesticRoute =
    tripType !== "multi_city" &&
    originValue.trim().length === 3 &&
    destinationValue.trim().length === 3 &&
    isDomesticSearch(originValue.trim(), destinationValue.trim())

  const handleFormSubmit = form.handleSubmit((values) => {
    const trip = values.trip_type
    if (trip === "multi_city") {
      // Final guard: every leg's airports must be selected via autocomplete.
      let blocked = false
      legFields.forEach((field, i) => {
        const selection = legSelectionsRef.current.get(field.id)
        const leg = values.legs[i]
        if (!selection?.origin || selection.origin.iata_code !== leg?.origin) {
          form.setError(`legs.${i}.origin`, {
            type: "manual",
            message: "Select an origin airport from the list",
          })
          blocked = true
        }
        if (
          !selection?.destination ||
          selection.destination.iata_code !== leg?.destination
        ) {
          form.setError(`legs.${i}.destination`, {
            type: "manual",
            message: "Select a destination airport from the list",
          })
          blocked = true
        }
      })
      if (blocked) return
    } else {
      // Final guard: airports must be selected via autocomplete.
      // URL-hydrated airports arrive as defaultOriginAirport/defaultDestinationAirport
      // so shared links still submit; typed-but-unselected IATA is rejected here.
      const origin = values.origin
      const destination = values.destination
      if (!originAirport || originAirport.iata_code !== origin) {
        form.setError("origin", {
          type: "manual",
          message: "Select an origin airport from the list",
        })
        return
      }
      if (!destinationAirport || destinationAirport.iata_code !== destination) {
        form.setError("destination", {
          type: "manual",
          message: "Select a destination airport from the list",
        })
        return
      }
    }
    // Domain validation via the discriminated union (strict, backend-mapped).
    const parsed = tripTypeSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const [seg0, seg1, seg2] = issue.path
        if (
          seg0 === "legs" &&
          typeof seg1 === "number" &&
          (seg2 === "origin" || seg2 === "destination" || seg2 === "date")
        ) {
          form.setError(`legs.${seg1}.${seg2}`, {
            type: "zod",
            message: issue.message,
          })
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
          form.setError(seg0, { type: "zod", message: issue.message })
        } else {
          // Leg-chain and other cross-leg errors surface on the form alert.
          form.setError("root", { type: "zod", message: issue.message })
        }
      }
      return
    }
    onSubmit(parsed.data)
  })

  const composition = {
    adults: adults ?? 1,
    children: children ?? 0,
    infants: infants ?? 0,
  }

  const handleCompositionChange = (next: typeof composition) => {
    form.setValue("adults", next.adults, { shouldValidate: true })
    form.setValue("children", next.children, { shouldValidate: true })
    form.setValue("infants", next.infants, { shouldValidate: true })
    form.clearErrors(["adults", "children", "infants"])
  }

  const travellerError =
    form.formState.errors.adults?.message ??
    form.formState.errors.infants?.message ??
    undefined

  const isSoloAdult =
    (adults ?? 1) === 1 && (children ?? 0) === 0 && (infants ?? 0) === 0
  const totalTravellers = (adults ?? 1) + (children ?? 0) + (infants ?? 0)
  const shortLabel = isSoloAdult
    ? "1 Adult"
    : `${totalTravellers} traveller${totalTravellers === 1 ? "" : "s"}`
  const breakdown = isSoloAdult
    ? ""
    : [
        `${adults ?? 1} adult${(adults ?? 1) === 1 ? "" : "s"}`,
        ...(children && children > 0
          ? [`${children} child${children === 1 ? "" : "ren"}`]
          : []),
        ...(infants && infants > 0
          ? [`${infants} infant${infants === 1 ? "" : "s"}`]
          : []),
      ].join(", ")

  const legsArrayError =
    typeof form.formState.errors.legs?.message === "string"
      ? form.formState.errors.legs.message
      : undefined

  const departureRegistration = form.register("departureDate")
  const returnRegistration = form.register("returnDate")

  const travellersField = (
    <div className="w-full space-y-1.5">
      <span className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase">
        Travellers
      </span>
      <PopoverPrimitive.Root>
        <PopoverPrimitive.Trigger className="flex h-10 w-full touch-manipulation items-center justify-between gap-2 rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground shadow-xs transition-colors hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none">
          <span className="flex min-w-0 items-center gap-2">
            <HugeiconsIcon
              icon={UserIcon}
              size={16}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
            />
            <span className="truncate font-medium">{shortLabel}</span>
            {breakdown ? <span className="sr-only">: {breakdown}</span> : null}
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={16}
            aria-hidden="true"
            className="shrink-0 text-muted-foreground"
          />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner
            sideOffset={4}
            className="z-50 outline-none"
          >
            <PopoverPrimitive.Popup className="w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-4 text-foreground shadow-lg">
              <TravellerStepper
                value={composition}
                onChange={handleCompositionChange}
                error={travellerError}
              />
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {travellerError ? (
        <p className="mt-1 text-xs font-medium text-destructive">
          {travellerError}
        </p>
      ) : null}
    </div>
  )

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={handleFormSubmit}
        aria-label="Flight search"
        className="flex flex-col gap-5 rounded-3xl border border-border/80 bg-card/95 p-4 shadow-xl shadow-black/[0.04] backdrop-blur-xl sm:p-6 md:p-7"
      >
        <div
          role="radiogroup"
          aria-label="Trip type"
          className="inline-flex items-center gap-1 self-start rounded-2xl border border-border/50 bg-muted/70 p-1 dark:bg-muted/40"
        >
          {TRIP_TYPE_OPTIONS.map((option) => {
            const checked = tripType === option.value
            return (
              <label
                key={option.value}
                className={cn(
                  "inline-flex touch-manipulation items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all focus-within:ring-2 focus-within:ring-ring focus-within:outline-none sm:text-sm",
                  checked
                    ? "bg-card font-semibold text-foreground shadow-xs ring-1 ring-border/80"
                    : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
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
                <HugeiconsIcon
                  icon={option.icon}
                  size={16}
                  aria-hidden="true"
                  className={
                    checked
                      ? "shrink-0 text-primary"
                      : "shrink-0 text-muted-foreground"
                  }
                />
                <span>{option.label}</span>
              </label>
            )
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
                initialDestination={
                  defaultLegAirports?.[i]?.destination ?? null
                }
                dateMin={today}
                showRemove={canRemoveLeg(legFields.length)}
                onRemove={() => handleRemoveLeg(i, field.id)}
                onSelectionChange={handleLegSelection}
              />
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddLeg}
                disabled={!canAddLeg(legFields.length)}
                className="w-full justify-center rounded-xl sm:w-auto"
              >
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  size={16}
                  aria-hidden="true"
                />
                <span>
                  {canAddLeg(legFields.length)
                    ? `Add leg (${legFields.length} of 6)`
                    : "Maximum 6 legs"}
                </span>
              </Button>
              <div className="w-full sm:w-48">{travellersField}</div>
            </div>
            {legsArrayError ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {legsArrayError}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-2.5 xl:gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2 lg:min-w-0 lg:flex-[2.4]">
              <div className="w-full min-w-0 flex-1">
                <AirportAutocomplete
                  id="flight-search-from"
                  label="From"
                  placeholder="Lagos, LOS, Murtala Muhammed…"
                  value={originInput}
                  selectedAirport={originAirport}
                  onSelect={handleOriginSelect}
                  onInputChange={handleOriginInputChange}
                  error={form.formState.errors.origin?.message}
                  formatDisplay={formatAirportDisplay}
                  showSelectedHint={false}
                  excludeIata={destinationAirport?.iata_code ?? null}
                />
              </div>
              <div className="flex shrink-0 justify-center sm:mt-[22px]">
                <button
                  type="button"
                  onClick={handleSwap}
                  disabled={!canSwap}
                  aria-label="Swap origin and destination"
                  className="flex size-10 touch-manipulation items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <HugeiconsIcon
                    icon={ArrowLeftRightIcon}
                    size={16}
                    aria-hidden="true"
                    className="rotate-90 sm:rotate-0"
                  />
                </button>
              </div>
              <div className="w-full min-w-0 flex-1">
                <AirportAutocomplete
                  id="flight-search-to"
                  label="To"
                  placeholder="London, LHR, Heathrow…"
                  value={destinationInput}
                  selectedAirport={destinationAirport}
                  onSelect={handleDestinationSelect}
                  onInputChange={handleDestinationInputChange}
                  error={form.formState.errors.destination?.message}
                  formatDisplay={formatAirportDisplay}
                  showSelectedHint={false}
                  excludeIata={originAirport?.iata_code ?? null}
                />
              </div>
            </div>

            <div
              className={cn(
                "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:min-w-0 lg:gap-2.5 xl:gap-3",
                tripType === "round_trip" ? "lg:flex-[2.4]" : "lg:flex-[1.8]"
              )}
            >
              <div className="w-full min-w-0 flex-1">
                <Input
                  label="Departure"
                  type="date"
                  min={today}
                  error={form.formState.errors.departureDate?.message}
                  startIcon={
                    <HugeiconsIcon
                      icon={Calendar01Icon}
                      size={16}
                      aria-hidden="true"
                    />
                  }
                  {...departureRegistration}
                  onChange={(e) => {
                    departureRegistration.onChange(e)
                    form.clearErrors("departureDate")
                  }}
                />
              </div>
              {tripType === "round_trip" ? (
                <div className="w-full min-w-0 flex-1">
                  <Input
                    label="Return"
                    type="date"
                    min={departureDateValue || today}
                    error={form.formState.errors.returnDate?.message}
                    startIcon={
                      <HugeiconsIcon
                        icon={Calendar01Icon}
                        size={16}
                        aria-hidden="true"
                      />
                    }
                    {...returnRegistration}
                    onChange={(e) => {
                      returnRegistration.onChange(e)
                      form.clearErrors("returnDate")
                    }}
                  />
                </div>
              ) : null}

              <div
                className={cn(
                  "w-full min-w-0",
                  tripType === "round_trip" ? "flex-1" : "flex-[0.9]"
                )}
              >
                {travellersField}
              </div>
            </div>
          </div>
        )}

        {isDomesticRoute ? (
          <p
            role="note"
            aria-live="polite"
            className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs leading-relaxed text-foreground"
          >
            Domestic flights are Economy-only in v1 — cabin and stop controls
            are disabled because the live domestic search ignores fare classes
            it does not support.
          </p>
        ) : null}
        {/* Advanced fare controls behind a disclosure — basic route, dates,
            party, and the search action stay visible. Trip-type, leg editor,
            and inline validation keep working inside. */}
        <details className="group min-w-0 rounded-xl border border-border/60 px-3.5 py-2.5">
          <summary className="flex min-h-11 cursor-pointer touch-manipulation list-none items-center justify-between gap-2 text-sm font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            <span>Advanced fare options</span>
            <span className="text-xs font-medium text-muted-foreground">
              Cabin · Stops
            </span>
          </summary>
          <div className="flex flex-col gap-4 pt-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
              <Controller
                name="non_stop"
                control={form.control}
                render={({ field }) => (
                  <Checkbox
                    label="Non-stop only"
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                    disabled={isDomesticRoute}
                    helperText={
                      isDomesticRoute
                        ? "Domestic only shows non-stop options."
                        : undefined
                    }
                  />
                )}
              />
              <div className="w-36">
                <Controller
                  name="max_stops"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Select
                      label="Max stops"
                      options={[...MAX_STOPS_OPTIONS]}
                      value={
                        field.value === null || field.value === undefined
                          ? ""
                          : String(field.value)
                      }
                      onValueChange={(next) =>
                        field.onChange(next === "" ? null : Number(next))
                      }
                      error={fieldState.error?.message}
                      placeholder="Any stops"
                      disabled={isDomesticRoute}
                      helperText={
                        isDomesticRoute
                          ? "Fixed for domestic routes."
                          : undefined
                      }
                    />
                  )}
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Controller
                name="cabin"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Select
                    label="Cabin"
                    options={[...CABIN_OPTIONS]}
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val)
                      form.clearErrors("cabin")
                    }}
                    error={fieldState.error?.message}
                    disabled={isDomesticRoute}
                    helperText={
                      isDomesticRoute ? "Economy only." : undefined
                    }
                  />
                )}
              />
            </div>
          </div>
        </details>

        <div className="flex flex-col-reverse gap-2.5 border-t border-border/60 pt-4 sm:flex-row">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onCancel}
              className="justify-center px-6 font-semibold"
            >
              <span>Cancel</span>
            </Button>
          ) : null}
          <Button
            type="submit"
            size="lg"
            isLoading={!!isSearching}
            disabled={!!isSearching}
            className="flex-1 justify-center px-6 font-semibold"
          >
            <HugeiconsIcon icon={Search01Icon} size={18} aria-hidden="true" />
            <span>
              {isSearching ? "Searching flights…" : "Search flights"}
            </span>
          </Button>
        </div>

        {form.formState.errors.root?.message ? (
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
            <span>{form.formState.errors.root.message}</span>
          </div>
        ) : null}

        <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-left">
          No account needed. Prices in NGN. You&apos;ll confirm the live fare
          before paying.
        </p>
      </form>
    </FormProvider>
  )
}
