"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
 * Hotel listing search (RHF + Zod, on-blur + on-submit re-validation per
 * ADR-0002). One free-text destination (empty lists every Hotel) — stay
 * dates and party live on the Hotel detail, where they actually shape the
 * Room Type choice and booking. Every control is labelled with visible
 * focus and human-readable errors.
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
    // Clear must also clear the URL, or the old search and its results would
    // outlive the reset (the URL is the source of truth for search state).
    onClear()
  }

  const isDirty = (form.watch("destination") ?? "") !== ""

  return (
    <form
      id="hotel-search-form"
      noValidate
      onSubmit={handleSubmit}
      aria-label="Hotel search"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6"
    >
      <Input
        label="Destination"
        placeholder="City or Hotel name — e.g. Lagos or Radisson Blu"
        helperText="Leave empty to browse every Hotel. Type a city or a Hotel name."
        autoComplete="off"
        error={form.formState.errors.destination?.message}
        {...form.register("destination")}
      />

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
        No account needed. From-prices are per night in Naira — add your dates
        on the Hotel page when you are ready to book.
      </p>
    </form>
  )
}
