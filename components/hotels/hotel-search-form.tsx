"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, AlertCircleIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import {
  HotelPartyStepper,
  type HotelParty,
} from "@/components/hotels/hotel-party-stepper"
import {
  DEFAULT_HOTEL_GUESTS,
  DEFAULT_HOTEL_ROOMS,
  hotelSearchQuerySchema,
  type HotelSearchQuery,
  type HotelSearchQueryInput,
} from "@/lib/api/hotels"

export interface HotelSearchFormProps {
  /** URL-hydrated defaults so back/refresh/share restore the form. */
  defaultValues: Partial<HotelSearchQueryInput>
  onSearch: (query: HotelSearchQuery) => void
  /** Reset the search entirely (returns the listing to its idle landing). */
  onClear: () => void
  isSearching?: boolean
}

/** Today as a local YYYY-MM-DD string (never a past date, day precision). */
function todayString(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const EMPTY_FORM: HotelSearchQueryInput = {
  destination: "",
  check_in: "",
  check_out: "",
  guests: DEFAULT_HOTEL_GUESTS,
  rooms: DEFAULT_HOTEL_ROOMS,
}

/** Normalize URL defaults into the flat form shape (single source, reused by
 *  initial mount and URL hydration). */
function toFormDefaults(
  defaultValues: Partial<HotelSearchQueryInput>
): HotelSearchQueryInput {
  return {
    destination: defaultValues.destination ?? "",
    check_in: defaultValues.check_in ?? "",
    check_out: defaultValues.check_out ?? "",
    guests: defaultValues.guests ?? DEFAULT_HOTEL_GUESTS,
    rooms: defaultValues.rooms ?? DEFAULT_HOTEL_ROOMS,
  }
}

/**
 * Guided hotel search (RHF + Zod, on-blur + on-submit re-validation per
 * ADR-0002). One free-text destination (empty browses every Hotel), optional
 * stay dates, and a guests/rooms party. Submitting hands a validated query to
 * the page client, which reflects it in the URL so results survive back,
 * refresh, and sharing. Every control is labelled with visible focus and
 * human-readable errors.
 */
export function HotelSearchForm({
  defaultValues,
  onSearch,
  onClear,
  isSearching,
}: HotelSearchFormProps) {
  const today = React.useMemo(todayString, [])

  const form = useForm<HotelSearchQueryInput, unknown, HotelSearchQuery>({
    resolver: zodResolver(hotelSearchQuerySchema),
    defaultValues: toFormDefaults(defaultValues),
    mode: "onTouched",
    shouldFocusError: true,
  })

  // Keep the form in step with URL hydration (back/forward/share).
  React.useEffect(() => {
    form.reset(toFormDefaults(defaultValues))
  }, [
    form,
    defaultValues.destination,
    defaultValues.check_in,
    defaultValues.check_out,
    defaultValues.guests,
    defaultValues.rooms,
  ])

  const checkInValue = form.watch("check_in") ?? ""
  const party: HotelParty = {
    guests: form.watch("guests") ?? DEFAULT_HOTEL_GUESTS,
    rooms: form.watch("rooms") ?? DEFAULT_HOTEL_ROOMS,
  }
  const partyError =
    form.formState.errors.guests?.message ??
    form.formState.errors.rooms?.message ??
    undefined

  const handleSubmit = form.handleSubmit((values) => {
    onSearch(values)
  })

  const handleClear = () => {
    form.reset(EMPTY_FORM)
    form.clearErrors()
    // Clear must also clear the URL, or the old search and its results would
    // outlive the reset (the URL is the source of truth for search state).
    onClear()
  }

  const isDirty =
    (form.watch("destination") ?? "") !== "" ||
    checkInValue !== "" ||
    (form.watch("check_out") ?? "") !== "" ||
    party.guests !== DEFAULT_HOTEL_GUESTS ||
    party.rooms !== DEFAULT_HOTEL_ROOMS

  const rootError = form.formState.errors.root?.message

  return (
    <form
      id="hotel-search-form"
      noValidate
      onSubmit={handleSubmit}
      aria-label="Hotel search"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Input
          label="Destination"
          placeholder="City or Hotel name — e.g. Lagos or Radisson Blu"
          helperText="Leave empty to browse every Hotel. Type a city or a Hotel name."
          autoComplete="off"
          error={form.formState.errors.destination?.message}
          {...form.register("destination")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DatePicker
            label="Check-in (optional)"
            min={today}
            helperText="Optional — add both dates or none."
            error={form.formState.errors.check_in?.message}
            {...form.register("check_in")}
          />
          <DatePicker
            label="Check-out (optional)"
            min={checkInValue || today}
            helperText="After check-in."
            error={form.formState.errors.check_out?.message}
            {...form.register("check_out")}
          />
        </div>
      </div>

      <HotelPartyStepper
        value={party}
        error={partyError}
        disabled={isSearching}
        onChange={(next) => {
          form.setValue("guests", next.guests, { shouldValidate: true })
          form.setValue("rooms", next.rooms, { shouldValidate: true })
        }}
      />

      {rootError ? (
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
          <span>{rootError}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="submit"
          size="lg"
          isLoading={!!isSearching}
          disabled={!!isSearching}
          className="w-full justify-center sm:flex-1"
        >
          <HugeiconsIcon icon={Search01Icon} size={18} aria-hidden="true" />
          <span>{isSearching ? "Searching Hotels…" : "Search Hotels"}</span>
        </Button>
        {isDirty ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleClear}
            disabled={!!isSearching}
            className="w-full justify-center sm:w-auto"
          >
            <span>Clear</span>
          </Button>
        ) : null}
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        No account needed. From-prices are per night in Naira.
      </p>
    </form>
  )
}
