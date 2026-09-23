"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, Calendar01Icon } from "@hugeicons/core-free-icons"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AirportAutocomplete } from "@/components/flights/airport-autocomplete"
import type { Airport, FlightSearchFormValues } from "@/lib/api/flights"

export interface LegSelection {
  origin: Airport | null
  destination: Airport | null
}

export interface LegFieldsProps {
  /** Zero-based position in the legs array (drives labels + RHF paths). */
  index: number
  /** Total leg count (drives "Leg N of M" labels). */
  legCount: number
  /** Stable useFieldArray field id — selections report by id so remove() shifts stay correct. */
  fieldId: string
  /** URL-hydrated airports for first mount only; local state owns edits after. */
  initialOrigin?: Airport | null
  initialDestination?: Airport | null
  /** Earliest selectable date (today, YYYY-MM-DD). */
  dateMin: string
  showRemove: boolean
  onRemove?: () => void
  onSelectionChange?: (fieldId: string, selection: LegSelection) => void
}

function formatAirportInput(airport: Airport | null): string {
  if (!airport) return ""
  return airport.city
    ? `${airport.city} (${airport.iata_code})`
    : airport.iata_code
}

/**
 * One consistent leg editor for multi-city search (spec §51).
 * Owns its autocomplete UI state locally so typing in one leg never
 * re-renders sibling legs (vercel: rerender-split-combined-hooks); memoized
 * with stable parent callbacks (vercel: rerender-memo). IATA strings sync
 * into RHF (`legs.${index}.*`); selection objects lift to the parent ref for
 * the autocomplete submit guard.
 */
export const LegFields = React.memo(function LegFields({
  index,
  legCount,
  fieldId,
  initialOrigin,
  initialDestination,
  dateMin,
  showRemove,
  onRemove,
  onSelectionChange,
}: LegFieldsProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<FlightSearchFormValues>()

  const [originAirport, setOriginAirport] = React.useState<Airport | null>(
    initialOrigin ?? null
  )
  const [destinationAirport, setDestinationAirport] =
    React.useState<Airport | null>(initialDestination ?? null)
  const [originInput, setOriginInput] = React.useState(
    formatAirportInput(initialOrigin ?? null)
  )
  const [destinationInput, setDestinationInput] = React.useState(
    formatAirportInput(initialDestination ?? null)
  )

  // Sync IATA strings into RHF (same pattern as the one-way top-level fields)
  React.useEffect(() => {
    setValue(
      `legs.${index}.origin`,
      originAirport?.iata_code ?? originInput.trim().toUpperCase(),
      {
        shouldValidate: true,
      }
    )
  }, [originAirport, originInput, index, setValue])

  React.useEffect(() => {
    setValue(
      `legs.${index}.destination`,
      destinationAirport?.iata_code ?? destinationInput.trim().toUpperCase(),
      { shouldValidate: true }
    )
  }, [destinationAirport, destinationInput, index, setValue])

  // Lift selections for the submit guard (parent stores in a ref — no re-render)
  React.useEffect(() => {
    onSelectionChange?.(fieldId, {
      origin: originAirport,
      destination: destinationAirport,
    })
  }, [fieldId, originAirport, destinationAirport, onSelectionChange])

  const legErrors = errors.legs?.[index]
  const originError =
    typeof legErrors?.origin?.message === "string"
      ? legErrors.origin.message
      : undefined
  const destinationError =
    typeof legErrors?.destination?.message === "string"
      ? legErrors.destination.message
      : undefined
  const dateError =
    typeof legErrors?.date?.message === "string"
      ? legErrors.date.message
      : undefined

  const groupLabelId = React.useId()

  const formatAirportDisplay = (airport: Airport) => {
    return `${airport.iata_code} – ${airport.name || airport.city}`
  }

  return (
    <div
      role="group"
      aria-labelledby={groupLabelId}
      className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-muted/30 p-4 shadow-xs sm:p-5 dark:bg-muted/15"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          id={groupLabelId}
          className="text-xs font-bold tracking-wider text-foreground/80 uppercase"
        >
          Leg {index + 1} of {legCount}
        </span>
        {showRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            aria-label={`Remove leg ${index + 1}`}
            className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} size={14} aria-hidden="true" />
            <span>Remove</span>
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <AirportAutocomplete
          label={`Leg ${index + 1} from`}
          placeholder="Lagos, LOS, Murtala Muhammed…"
          value={originInput}
          selectedAirport={originAirport}
          onSelect={setOriginAirport}
          onInputChange={setOriginInput}
          error={originError}
          formatDisplay={formatAirportDisplay}
          showSelectedHint={false}
          excludeIata={destinationAirport?.iata_code ?? null}
        />
        <AirportAutocomplete
          label={`Leg ${index + 1} to`}
          placeholder="London, LHR, Heathrow…"
          value={destinationInput}
          selectedAirport={destinationAirport}
          onSelect={setDestinationAirport}
          onInputChange={setDestinationInput}
          error={destinationError}
          formatDisplay={formatAirportDisplay}
          showSelectedHint={false}
          excludeIata={originAirport?.iata_code ?? null}
        />
        <Input
          label={`Leg ${index + 1} date`}
          type="date"
          min={dateMin}
          startIcon={
            <HugeiconsIcon icon={Calendar01Icon} size={16} aria-hidden="true" />
          }
          error={dateError}
          {...register(`legs.${index}.date`)}
        />
      </div>
    </div>
  )
})
