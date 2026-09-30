"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  AlertCircleIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import {
  findCountryByCode,
  searchCountries,
  type Country,
} from "@/lib/data/countries"
import { CountryFlag } from "@/components/ui/country-flag"

export interface CountrySelectProps {
  label: string
  /** ISO 3166-1 alpha-2 code, e.g. "NG". Empty means no selection. */
  value: string
  onValueChange: (code: string) => void
  error?: string
  helperText?: string
  placeholder?: string
  disabled?: boolean
  id?: string
}

/**
 * Searchable nationality / country picker on the Base UI Combobox primitive
 * (docs: base-ui.com/react/components/combobox) — open state, outside-click,
 * Escape, and arrow-key handling all come from the primitive, so the popup
 * can never flash-shut on focus the way a hand-rolled blur timer does.
 * Portal rendering also keeps the list visible inside `overflow-hidden` cards.
 *
 * Guests pick "Nigeria (NG)" with a real flag; the form stores "NG", so
 * backend contracts stay unchanged.
 */
export function CountrySelect({
  label,
  value,
  onValueChange,
  error,
  helperText,
  placeholder = "Select nationality…",
  disabled,
  id,
}: CountrySelectProps) {
  const inputId = id || React.useId()
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`

  const selected = findCountryByCode(value)
  const [query, setQuery] = React.useState(selected?.name ?? "")

  // External resets (form reset, draft restore) resync the visible text.
  // Typing never touches `value`, so this cannot clobber an active filter.
  React.useEffect(() => {
    setQuery(findCountryByCode(value)?.name ?? "")
  }, [value])

  const filtered = React.useMemo(() => searchCountries(query), [query])

  return (
    <div className="w-full space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
      >
        {label}
      </label>

      <ComboboxPrimitive.Root
        items={filtered}
        value={selected}
        onValueChange={(next) => onValueChange(next ? next.code : "")}
        inputValue={query}
        onInputValueChange={(next, details) => {
          if (details?.reason === "item-press") return
          setQuery(next)
          // Explicit deletion empties the selection; Escape/dismiss restores
          // it via onOpenChange below instead of clearing it.
          if (next === "" && details?.reason === "input-change")
            onValueChange("")
        }}
        onOpenChange={(open, details) => {
          if (open) {
            // Opening via trigger/input click (not typing) browses everything:
            // clear the filter so the full country list shows immediately.
            if (details?.reason !== "input-change") setQuery("")
          } else {
            // Dismissed without selecting — restore the selected label so
            // typed-but-unselected text never lingers in the field.
            setQuery(findCountryByCode(value)?.name ?? "")
          }
        }}
        itemToStringLabel={(country: Country) => country.name}
        isItemEqualToValue={(a: Country, b: Country) => a.code === b.code}
        filter={null}
        disabled={disabled}
      >
        <ComboboxPrimitive.InputGroup
          className={cn(
            "flex h-12 w-full touch-manipulation items-center gap-2.5 rounded-xl border border-input bg-card py-2 pr-2.5 pl-3.5 text-base text-foreground shadow-xs transition-colors sm:h-10 sm:text-sm",
            "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 focus-within:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error &&
              "border-destructive focus-within:border-destructive focus-within:ring-destructive/30"
          )}
        >
          {selected ? (
            <CountryFlag code={selected.code} />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-[15px] w-5 shrink-0 items-center justify-center rounded-[3px] bg-muted text-[9px] font-bold text-muted-foreground"
            >
              ?
            </span>
          )}
          <ComboboxPrimitive.Input
            id={inputId}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {selected ? (
            <span className="font-variant-numeric shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground tabular-nums">
              {selected.code}
            </span>
          ) : null}
          <ComboboxPrimitive.Trigger
            aria-label={`Choose ${label.toLowerCase()}`}
            className="flex size-8 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={16}
              aria-hidden="true"
            />
          </ComboboxPrimitive.Trigger>
        </ComboboxPrimitive.InputGroup>

        <ComboboxPrimitive.Portal>
          <ComboboxPrimitive.Positioner
            sideOffset={4}
            className="z-50 outline-none"
          >
            <ComboboxPrimitive.Popup className="w-[var(--anchor-width)] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <ComboboxPrimitive.Empty className="px-3 py-3 text-xs text-muted-foreground">
                No countries match “{query.trim()}”.
              </ComboboxPrimitive.Empty>
              <ComboboxPrimitive.List className="max-h-60 overflow-y-auto p-1 outline-none">
                {(country: Country) => (
                  <ComboboxPrimitive.Item
                    key={country.code}
                    value={country}
                    className="flex w-full cursor-pointer touch-manipulation items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors outline-none hover:bg-muted/70 focus-visible:bg-muted data-highlighted:bg-muted"
                  >
                    <CountryFlag code={country.code} />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {country.name}
                    </span>
                    <span className="font-variant-numeric shrink-0 text-xs text-muted-foreground tabular-nums">
                      {country.code}
                    </span>
                    <ComboboxPrimitive.ItemIndicator className="flex w-4 shrink-0 items-center justify-center text-primary data-unchecked:hidden">
                      <HugeiconsIcon
                        icon={Tick01Icon}
                        size={14}
                        aria-hidden="true"
                      />
                    </ComboboxPrimitive.ItemIndicator>
                  </ComboboxPrimitive.Item>
                )}
              </ComboboxPrimitive.List>
            </ComboboxPrimitive.Popup>
          </ComboboxPrimitive.Positioner>
        </ComboboxPrimitive.Portal>
      </ComboboxPrimitive.Root>

      {error ? (
        <p
          id={errorId}
          className="flex items-start gap-1.5 text-xs font-medium text-destructive"
        >
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={13}
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
