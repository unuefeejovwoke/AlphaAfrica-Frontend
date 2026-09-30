"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

const listingSearchSchema = z.object({
  destination: z
    .string()
    .trim()
    .max(200, "Destination is too long")
    .optional()
    .default(""),
})

type ListingSearchInput = z.input<typeof listingSearchSchema>

export interface HotelSearchFormProps {
  /** URL-hydrated default so back/refresh/share restore the field. */
  defaultValues: { destination: string }
  /** Hands the trimmed destination to the page client, which reflects it
   *  in the URL so results survive back, refresh, and sharing. */
  onSearch: (destination: string) => void
  /** Reset the listing entirely (returns to browse-all). */
  onClear: () => void
  isSearching?: boolean
}

/**
 * Sleek Hotel listing search (RHF + Zod, on-blur + on-submit re-validation per
 * ADR-0002). Minimal footprint, zero wasted screen real estate.
 */
export function HotelSearchForm({
  defaultValues,
  onSearch,
  onClear,
  isSearching,
}: HotelSearchFormProps) {
  const form = useForm<ListingSearchInput>({
    resolver: zodResolver(listingSearchSchema),
    defaultValues: { destination: defaultValues.destination ?? "" },
    mode: "onTouched",
    shouldFocusError: true,
  })

  // Keep the field in step with URL hydration (back/forward/share).
  React.useEffect(() => {
    form.reset({ destination: defaultValues.destination ?? "" })
  }, [form, defaultValues.destination])

  const handleSubmit = form.handleSubmit((values) => {
    onSearch(values.destination?.trim() ?? "")
  })

  const handleClear = () => {
    form.reset({ destination: "" })
    form.clearErrors()
    onClear()
  }

  const destinationValue = form.watch("destination") ?? ""
  const isDirty = destinationValue.trim().length > 0

  return (
    <form
      id="hotel-search-form"
      noValidate
      onSubmit={handleSubmit}
      aria-label="Hotel search"
      className="group relative flex w-full flex-col gap-1.5"
    >
      <div className="relative flex items-center gap-2 rounded-2xl border border-border/80 bg-card p-1.5 shadow-xs transition-all duration-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 hover:border-foreground/20 sm:p-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition-colors group-focus-within:bg-primary/10 group-focus-within:text-primary sm:size-11">
          <HugeiconsIcon icon={Search01Icon} size={18} aria-hidden="true" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <label htmlFor="hotel-destination-input" className="sr-only">
            City or Hotel name
          </label>
          <input
            id="hotel-destination-input"
            type="text"
            autoComplete="off"
            placeholder="Search by city or hotel name — e.g. Lagos, Abuja, Radisson Blu"
            className="h-9 w-full bg-transparent px-1 text-sm font-medium text-foreground placeholder:text-muted-foreground/70 focus:outline-none sm:h-10 sm:text-base"
            {...form.register("destination")}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isDirty ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={!!isSearching}
              aria-label="Clear destination"
              className="inline-flex size-9 touch-manipulation items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-10"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden="true" />
            </button>
          ) : null}

          <Button
            type="submit"
            size="default"
            isLoading={!!isSearching}
            disabled={!!isSearching}
            className="h-9 rounded-xl px-4 font-semibold sm:h-10 sm:px-6"
          >
            <HugeiconsIcon icon={Search01Icon} size={16} aria-hidden="true" />
            <span>{isSearching ? "Searching…" : "Search"}</span>
          </Button>
        </div>
      </div>

      {form.formState.errors.destination?.message ? (
        <p className="px-2 text-xs font-medium text-destructive" role="alert">
          {form.formState.errors.destination.message}
        </p>
      ) : null}
    </form>
  )
}
