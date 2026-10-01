"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  ArrowRight01Icon,
  Exchange01Icon,
  ArrowLeftRightIcon,
  ArrowDown01Icon,
  UserIcon,
  Airplane01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { TravellerStepper } from "@/components/ui/traveller-stepper"
import { AirportAutocomplete } from "@/components/flights/airport-autocomplete"
import {
  CABIN_OPTIONS,
  type Airport,
  type FlightSearchFormValues,
  createEmptyLeg,
  flightSearchFormSchema,
  tripTypeSchema,
} from "@/lib/api/flights"
import { buildFlightSearchQuery } from "@/lib/api/flight-search-url"
import { isDomesticSearch } from "@/lib/api/domestic"
import { track } from "@/lib/analytics"
import { cn } from "@/lib/utils"

const FROM_INPUT_ID = "home-flight-from"
const TO_INPUT_ID = "home-flight-to"
/** Multi-city needs the full editor; its home control hands off with the trip flag. */
const MULTI_CITY_HREF = "/flights?trip_type=multi_city"

/** Explicit trip choices are remembered; first visit stays predictable (one_way). */
const TRIP_TYPE_STORAGE_KEY = "alphaa:home-trip-type:v1"
type HomeTripType = "one_way" | "round_trip" | "multi_city"

function readStoredTripType(): HomeTripType {
  if (typeof window === "undefined") return "one_way"
  try {
    const raw = window.localStorage.getItem(TRIP_TYPE_STORAGE_KEY)
    // Multi-city is never stored here — it always hands off to the full editor.
    return raw === "round_trip" ? raw : "one_way"
  } catch {
    return "one_way"
  }
}

const TRIP_OPTIONS = [
  { value: "one_way", label: "One way", icon: ArrowRight01Icon },
  { value: "round_trip", label: "Round trip", icon: Exchange01Icon },
] as const

type FocusableField = "origin" | "destination" | "departureDate" | "returnDate"

/**
 * Compact home flight search (client leaf, rendered only when the Flights
 * tab is active so hotels/cars bundles are untouched).
 *
 * - Form layer is RHF + Zod over the shared flat adapter; submit parses via
 *   the tripTypeSchema discriminated union — the single domain source of
 *   truth — so no Zod rule is duplicated in the widget.
 * - Airports require an autocomplete pick (free-text IATA bypass rejected);
 *   currency is fixed NGN with no stop/fare controls on home.
 * - Validation stays quiet while typing (errors surface on blur and on
 *   submit); invalid submit stays on home, focuses the first error, and
 *   announces it — with no navigation.
 * - Multi-city is a hand-off, not an editor: its control links straight to the
 *   full flights editor with the trip flag carried in the URL.
 * - Valid submit fires search-started analytics (trip type, cabin, and
 *   domestic/international route class only — never PII or fare data), then
 *   navigates with shareable URL search state.
 */
export function HomeFlightSearch() {
  const router = useRouter()

  const [originAirport, setOriginAirport] = React.useState<Airport | null>(null)
  const [destinationAirport, setDestinationAirport] =
    React.useState<Airport | null>(null)
  const [originInput, setOriginInput] = React.useState("")
  const [destinationInput, setDestinationInput] = React.useState("")
  const [routeTouched, setRouteTouched] = React.useState({
    origin: false,
    destination: false,
  })
  const [submitAlert, setSubmitAlert] = React.useState<string | null>(null)
  const [swapAnnouncement, setSwapAnnouncement] = React.useState("")

  const today = React.useMemo(() => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 10)
  }, [])

  const form = useForm<FlightSearchFormValues>({
    resolver: zodResolver(flightSearchFormSchema),
    defaultValues: {
      trip_type: readStoredTripType(),
      origin: "",
      destination: "",
      departureDate: "",
      returnDate: "",
      legs: [createEmptyLeg(), createEmptyLeg()],
      adults: 1,
      children: 0,
      infants: 0,
      cabin: "ECONOMY",
      currency: "NGN",
      non_stop: false,
      max_stops: null,
    },
    mode: "onTouched",
    shouldFocusError: true,
  })

  const tripType: HomeTripType = form.watch("trip_type") ?? "one_way"
  const departureDateValue = form.watch("departureDate") ?? ""
  const isSubmitted = form.formState.isSubmitted
  const travellersLabelId = React.useId()

  const adults = form.watch("adults") ?? 1
  const children = form.watch("children") ?? 0
  const infants = form.watch("infants") ?? 0
  const composition = { adults, children, infants }
  const totalTravellers = adults + children + infants
  const isSoloAdult = adults === 1 && children === 0 && infants === 0
  const shortLabel = isSoloAdult
    ? "1 Adult"
    : `${totalTravellers} traveller${totalTravellers === 1 ? "" : "s"}`
  const breakdown = isSoloAdult
    ? ""
    : [
        `${adults} adult${adults === 1 ? "" : "s"}`,
        ...(children > 0
          ? [`${children} child${children === 1 ? "" : "ren"}`]
          : []),
        ...(infants > 0
          ? [`${infants} infant${infants === 1 ? "" : "s"}`]
          : []),
      ].join(", ")

  const handleCompositionChange = (next: typeof composition) => {
    form.setValue("adults", next.adults, { shouldValidate: true })
    form.setValue("children", next.children, { shouldValidate: true })
    form.setValue("infants", next.infants, { shouldValidate: true })
    form.clearErrors(["adults", "children", "infants"])
    setSubmitAlert(null)
  }
  const travellerError =
    form.formState.errors.adults?.message ??
    form.formState.errors.infants?.message ??
    undefined

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
      setSubmitAlert(null)
    } else {
      form.setValue("origin", "", { shouldValidate: false })
    }
  }

  const handleOriginInputChange = (val: string) => {
    setOriginInput(val)
    form.clearErrors("origin")
    setSubmitAlert(null)
  }

  const handleDestinationSelect = (airport: Airport | null) => {
    setDestinationAirport(airport)
    if (airport) {
      form.setValue("destination", airport.iata_code, { shouldValidate: false })
      form.clearErrors("destination")
      if (originAirport && originAirport.iata_code !== airport.iata_code) {
        form.clearErrors("origin")
      }
      setSubmitAlert(null)
    } else {
      form.setValue("destination", "", { shouldValidate: false })
    }
  }

  const handleDestinationInputChange = (val: string) => {
    setDestinationInput(val)
    form.clearErrors("destination")
    setSubmitAlert(null)
  }

  // Keep RHF origin/destination in sync with autocomplete selection
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

  const handleTripChange = (next: HomeTripType) => {
    form.setValue("trip_type", next, { shouldValidate: true })
    // Hidden-branch errors must not linger after switching trip type.
    form.clearErrors()
    setSubmitAlert(null)
    try {
      window.localStorage.setItem(TRIP_TYPE_STORAGE_KEY, next)
    } catch {
      // Private mode — the in-memory choice still applies.
    }
  }

  const focusField = (name: FocusableField) => {
    if (name === "origin") {
      document.getElementById(FROM_INPUT_ID)?.focus()
    } else if (name === "destination") {
      document.getElementById(TO_INPUT_ID)?.focus()
    } else {
      form.setFocus(name)
    }
  }

  /** Invalid submit: surface the first error inline, focus it, announce it. */
  const failSubmit = (name: FocusableField, message: string) => {
    form.setError(name, { type: "manual", message })
    focusField(name)
    setSubmitAlert(message)
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
    setSubmitAlert(null)
    // Sync effects re-validate distinctness; announce the new route politely.
    const from =
      nextOriginAirport?.iata_code ?? nextOriginInput.trim().toUpperCase()
    const to =
      nextDestinationAirport?.iata_code ??
      nextDestinationInput.trim().toUpperCase()
    setSwapAnnouncement(
      from && to ? `Route swapped: ${from} to ${to}.` : "From and To swapped."
    )
  }

  const canSwap = originInput.trim() !== "" || destinationInput.trim() !== ""

  const handleFormSubmit = form.handleSubmit(
    (values) => {
      setSubmitAlert(null)
      // Final guard: airports must be selected via autocomplete.
      // Typed-but-unselected IATA is rejected here (no free-text bypass).
      const origin = values.origin
      const destination = values.destination
      if (!originAirport || originAirport.iata_code !== origin) {
        failSubmit("origin", "Select an origin airport from the list")
        return
      }
      if (!destinationAirport || destinationAirport.iata_code !== destination) {
        failSubmit("destination", "Select a destination airport from the list")
        return
      }
      // Domain validation via the discriminated union (strict, backend-mapped).
      const parsed = tripTypeSchema.safeParse(values)
      if (!parsed.success) {
        const order: FocusableField[] = [
          "origin",
          "destination",
          "departureDate",
          "returnDate",
        ]
        let first: { name: FocusableField; message: string } | null = null
        for (const issue of parsed.error.issues) {
          const [seg0] = issue.path
          if (
            seg0 === "origin" ||
            seg0 === "destination" ||
            seg0 === "departureDate" ||
            seg0 === "returnDate"
          ) {
            form.setError(seg0, { type: "zod", message: issue.message })
            first ??= { name: seg0, message: issue.message }
          } else {
            form.setError("root", { type: "zod", message: issue.message })
            first ??= { name: "origin", message: issue.message }
          }
        }
        if (first) {
          focusField(first.name)
          setSubmitAlert(first.message)
        }
        return
      }
      if (parsed.data.trip_type === "multi_city") {
        // Unreachable on home — multi-city delegates to the full editor and
        // never submits from this widget. Guarded, never navigated blindly.
        return
      }
      // Analytics carry trip type, cabin, and route class only — never PII
      // or fare data (sanitized by the analytics allowlist).
      track("flight_search_started", {
        trip_type: parsed.data.trip_type,
        cabin: parsed.data.cabin,
        route: isDomesticSearch(parsed.data.origin, parsed.data.destination)
          ? "domestic"
          : "international",
      })
      router.push(`/flights?${buildFlightSearchQuery(parsed.data)}`)
    },
    (errors) => {
      // Full check on submit: focus the first error in desktop field order.
      const order: FocusableField[] = [
        "origin",
        "destination",
        "departureDate",
        "returnDate",
      ]
      const first = order.find((name) => errors[name]?.message)
      const message =
        first && typeof errors[first]?.message === "string"
          ? String(errors[first]?.message)
          : "Check the highlighted fields and try again."
      if (first) focusField(first)
      setSubmitAlert(message)
    }
  )

  // Quiet while typing: route errors surface on blur or after a submit attempt.
  const originError =
    routeTouched.origin || isSubmitted
      ? form.formState.errors.origin?.message
      : undefined
  const destinationError =
    routeTouched.destination || isSubmitted
      ? form.formState.errors.destination?.message
      : undefined
  const departureError =
    form.formState.touchedFields.departureDate || isSubmitted
      ? form.formState.errors.departureDate?.message
      : undefined
  const returnError =
    form.formState.touchedFields.returnDate || isSubmitted
      ? form.formState.errors.returnDate?.message
      : undefined

  const formAlert = submitAlert ?? form.formState.errors.root?.message ?? null

  const departureRegistration = form.register("departureDate")
  const returnRegistration = form.register("returnDate")

  return (
    <form
      noValidate
      onSubmit={handleFormSubmit}
      aria-label="Flight search"
      className="flex flex-col gap-4"
    >
      <div className="flex w-full items-center gap-1 rounded-2xl border border-border/50 bg-muted/70 p-1 sm:inline-flex sm:w-auto sm:self-start">
        <div role="radiogroup" aria-label="Trip type" className="contents">
          {TRIP_OPTIONS.map((option) => {
            const checked = tripType === option.value
            return (
              <label
                key={option.value}
                className={cn(
                  "inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-medium whitespace-nowrap transition-all focus-within:ring-2 focus-within:ring-ring focus-within:outline-none sm:min-h-0 sm:flex-none sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm",
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
        <Link
          href={MULTI_CITY_HREF}
          aria-label="Multi-city trips continue in the full flights editor"
          className="inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-all hover:bg-card/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0 sm:flex-none sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm"
        >
          <HugeiconsIcon
            icon={Airplane01Icon}
            size={16}
            aria-hidden="true"
            className="shrink-0 text-muted-foreground"
          />
          <span>Multi-city</span>
        </Link>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-2.5 xl:gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2 lg:min-w-0 lg:flex-[2.4]">
          <div
            className="w-full min-w-0 flex-1"
            onBlur={() => setRouteTouched((t) => ({ ...t, origin: true }))}
          >
            <AirportAutocomplete
              id={FROM_INPUT_ID}
              label="From"
              placeholder="Lagos, LOS, Murtala Muhammed…"
              value={originInput}
              selectedAirport={originAirport}
              onSelect={handleOriginSelect}
              onInputChange={handleOriginInputChange}
              error={originError}
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
              className="flex size-11 touch-manipulation items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 sm:size-10"
            >
              <HugeiconsIcon
                icon={ArrowLeftRightIcon}
                size={16}
                aria-hidden="true"
                className="rotate-90 sm:rotate-0"
              />
            </button>
          </div>
          <div
            className="w-full min-w-0 flex-1"
            onBlur={() => setRouteTouched((t) => ({ ...t, destination: true }))}
          >
            <AirportAutocomplete
              id={TO_INPUT_ID}
              label="To"
              placeholder="London, LHR, Heathrow…"
              value={destinationInput}
              selectedAirport={destinationAirport}
              onSelect={handleDestinationSelect}
              onInputChange={handleDestinationInputChange}
              error={destinationError}
              formatDisplay={formatAirportDisplay}
              showSelectedHint={false}
              excludeIata={originAirport?.iata_code ?? null}
            />
          </div>
        </div>
        <p aria-live="polite" role="status" className="sr-only">
          {swapAnnouncement}
        </p>

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
              error={departureError}
              {...departureRegistration}
              onChange={(e) => {
                departureRegistration.onChange(e)
                form.clearErrors("departureDate")
                setSubmitAlert(null)
              }}
            />
          </div>
          {tripType === "round_trip" ? (
            <div className="w-full min-w-0 flex-1">
              <Input
                label="Return"
                type="date"
                min={departureDateValue || today}
                error={returnError}
                {...returnRegistration}
                onChange={(e) => {
                  returnRegistration.onChange(e)
                  form.clearErrors("returnDate")
                  setSubmitAlert(null)
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
            <div className="w-full space-y-1.5">
              <span
                id={travellersLabelId}
                className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
              >
                Travellers
              </span>
              <PopoverPrimitive.Root>
                <PopoverPrimitive.Trigger className="flex h-12 w-full touch-manipulation items-center justify-between gap-2 rounded-xl border border-input bg-card px-3.5 py-2 text-base text-foreground shadow-xs transition-colors hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none sm:h-10 sm:text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <HugeiconsIcon
                      icon={UserIcon}
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="truncate font-medium">{shortLabel}</span>
                    {breakdown ? (
                      <span className="sr-only">: {breakdown}</span>
                    ) : null}
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
            </div>
            {travellerError ? (
              <p className="mt-1 text-xs font-medium text-destructive">
                {travellerError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {formAlert ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-xs leading-relaxed text-foreground"
        >
          {formAlert}
        </div>
      ) : null}

      <div className="flex shrink-0 flex-col gap-2.5 pt-1 sm:flex-row sm:items-center sm:justify-end">
        <Controller
          name="cabin"
          control={form.control}
          render={({ field, fieldState }) => (
            <Select
              label="Cabin"
              hideLabel
              className="w-full sm:w-36"
              options={[...CABIN_OPTIONS]}
              value={field.value}
              onValueChange={(val) => {
                field.onChange(val)
                form.clearErrors("cabin")
                setSubmitAlert(null)
              }}
              error={fieldState.error?.message}
            />
          )}
        />
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full justify-center px-6 text-base font-semibold sm:h-10 sm:w-auto sm:text-sm"
        >
          <HugeiconsIcon icon={Search01Icon} size={18} aria-hidden="true" />
          <span>Search flights</span>
        </Button>
      </div>
    </form>
  )
}
