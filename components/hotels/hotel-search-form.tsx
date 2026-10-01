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
      className="group flex w-full flex-col"
    >
      {/* Label sits above the control, not inside it. Nested inside the
          bordered bar it read as a floating label gone wrong, and it forced
          the field to be two rows tall in an otherwise single-row control. */}
      <label
        htmlFor="hotel-destination-input"
        className="mb-1.5 block text-[11px] leading-none font-semibold tracking-wider text-muted-foreground uppercase"
      >
        City or hotel
      </label>

      {/* One flat bar. The previous build nested three rounded shapes (outer
          card, icon tile, buttons) and showed the search glyph twice — once in
          a tile that looked clickable but was not, once in the button. Now a
          single leading glyph, one container radius, and an inset button. */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-xs transition-colors duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-foreground/25">
        <HugeiconsIcon
          icon={Search01Icon}
          size={18}
          aria-hidden="true"
          className="ml-2 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary"
        />

        <input
          id="hotel-destination-input"
          type="text"
          autoComplete="off"
          placeholder="Lagos, Abuja, Radisson Blu"
          className="h-11 w-full min-w-0 flex-1 bg-transparent px-2 text-[15px] font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none sm:text-base"
          {...form.register("destination")}
        />

        {isDirty ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={!!isSearching}
            aria-label="Clear destination"
            className="inline-flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden="true" />
          </button>
        ) : null}

        <Button
          type="submit"
          size="default"
          isLoading={!!isSearching}
          disabled={!!isSearching}
          className="h-11 shrink-0 rounded-lg px-4 font-semibold sm:px-6"
        >
          <span>{isSearching ? "Searching…" : "Search"}</span>
        </Button>
      </div>

      {form.formState.errors.destination?.message ? (
        <p
          className="mt-1.5 px-2 text-xs font-medium text-destructive"
          role="alert"
        >
          {form.formState.errors.destination.message}
        </p>
      ) : null}
    </form>
  )
}
