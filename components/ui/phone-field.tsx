"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  AlertCircleIcon,
  Call02Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import {
  getCountryByCode,
  getCountryByDial,
  searchCountries,
  type Country,
} from "@/lib/data/countries"
import { CountryFlag } from "@/components/ui/country-flag"
import { phoneDigits, splitPhoneValue, toE164 } from "@/lib/phone.ts"

export interface PhoneFieldProps {
  label: string
  /** Stored value: E.164 ("+2348031234567") or legacy national formats. */
  value: string
  /** Emits E.164 on every keystroke / dial change. */
  onChange: (e164: string) => void
  onBlur?: () => void
  error?: string
  helperText?: string
  placeholder?: string
  disabled?: boolean
  autoComplete?: string
  id?: string
  /** Initial dial when value is empty. Defaults to Nigeria. */
  defaultCountry?: string
}

/**
 * Mature phone entry: a Base UI Combobox dial-code picker
 * (docs: base-ui.com/react/components/combobox) fused with the
 * national-number input in one focus ring. The primitive owns open state,
 * outside-click, Escape, and arrow keys — the popup renders in a Portal so
 * it stays visible inside `overflow-hidden` cards and never flash-shuts.
 *
 * Emits E.164 so every Zod schema (`nigerianPhoneSchema`) validates
 * unchanged — Nigerian formats keep working, international numbers validate
 * by length.
 */
export function PhoneField({
  label,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  placeholder = "803 123 4567",
  disabled,
  autoComplete = "tel",
  id,
  defaultCountry = "NG",
}: PhoneFieldProps) {
  const inputId = id || React.useId()
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`

  const initial = React.useMemo(
    () => splitPhoneValue(value, getCountryByCode(defaultCountry).dial),
    // Derive once; external resets sync via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const [dial, setDial] = React.useState(initial.dial)
  const [national, setNational] = React.useState(initial.national)
  const [dialQuery, setDialQuery] = React.useState(`+${initial.dial}`)
  // Fresh-dial mirror for the dismiss-restore below (event-handler closures
  // would otherwise see the pre-select dial after an item press).
  const dialRef = React.useRef(dial)
  dialRef.current = dial
  // Set on item selection so the ensuing close doesn't restore stale text.
  const justSelectedRef = React.useRef(false)

  // External resets (form reset, draft restore) resync the split parts.
  React.useEffect(() => {
    const parts = splitPhoneValue(value, getCountryByCode(defaultCountry).dial)
    setDial((prev) => (prev === parts.dial ? prev : parts.dial))
    setNational((prev) => (prev === parts.national ? prev : parts.national))
    setDialQuery((prev) => {
      const next = `+${parts.dial}`
      return prev === next ? prev : next
    })
  }, [value, defaultCountry])

  const dialResults = React.useMemo(
    () => searchCountries(dialQuery),
    [dialQuery]
  )
  const activeCountry = getCountryByDial(dial)

  const emit = (nextDial: string, nextNational: string) => {
    onChange(toE164(nextDial, nextNational))
  }

  const handleDialSelect = (nextDial: string) => {
    justSelectedRef.current = true
    setDial(nextDial)
    setDialQuery(`+${nextDial}`)
    emit(nextDial, national)
  }

  const handleNationalChange = (raw: string) => {
    // Keep digits, spaces, and dashes while typing; E.164 emitted clean.
    const cleaned = raw.replace(/[^\d\s-]/g, "")
    setNational(phoneDigits(cleaned).replace(/^0+/, ""))
    emit(dial, cleaned)
  }

  return (
    <div className="w-full space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
      >
        {label}
      </label>

      <div
        className={cn(
          "flex h-12 w-full items-stretch rounded-xl border border-input bg-card shadow-xs transition-colors sm:h-10",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 focus-within:outline-none",
          disabled && "cursor-not-allowed opacity-50",
          error &&
            "border-destructive focus-within:border-destructive focus-within:ring-destructive/30"
        )}
      >
        <ComboboxPrimitive.Root
          items={dialResults}
          value={activeCountry}
          onValueChange={(next) => {
            if (next) handleDialSelect(next.dial)
          }}
          inputValue={dialQuery}
          onInputValueChange={(next, details) => {
            if (details?.reason === "item-press") return
            setDialQuery(next)
          }}
          onOpenChange={(open, details) => {
            if (open) {
              // Opening via trigger/dial click (not typing) browses
              // everything: clear the filter so all dial codes show.
              if (details?.reason !== "input-change") setDialQuery("")
            } else if (justSelectedRef.current) {
              justSelectedRef.current = false
            } else {
              // Dismissed without selecting — restore the active dial so
              // typed-but-unselected text never lingers in the field.
              setDialQuery(`+${dialRef.current}`)
            }
          }}
          itemToStringLabel={(country: Country) => `+${country.dial}`}
          isItemEqualToValue={(a: Country, b: Country) =>
            a.code === b.code && a.dial === b.dial
          }
          filter={null}
          disabled={disabled}
        >
          <ComboboxPrimitive.InputGroup className="flex h-full shrink-0 items-center gap-1 rounded-l-xl border-r border-border/60 bg-muted/40 pr-1 pl-2.5">
            <CountryFlag code={activeCountry.code} />
            <ComboboxPrimitive.Input
              autoComplete="off"
              aria-label={`Country dial code, currently +${activeCountry.dial} ${activeCountry.name}`}
              className="font-variant-numeric h-full w-14 bg-transparent text-sm font-semibold text-foreground tabular-nums focus:outline-none"
            />
            <ComboboxPrimitive.Trigger
              aria-label="Change country code"
              className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-9"
            >
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={14}
                aria-hidden="true"
              />
            </ComboboxPrimitive.Trigger>
          </ComboboxPrimitive.InputGroup>

          <ComboboxPrimitive.Portal>
            <ComboboxPrimitive.Positioner
              sideOffset={4}
              align="start"
              className="z-50 outline-none"
            >
              <ComboboxPrimitive.Popup className="w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                <ComboboxPrimitive.Empty className="px-3 py-3 text-xs text-muted-foreground">
                  No countries match “{dialQuery.trim()}”.
                </ComboboxPrimitive.Empty>
                <ComboboxPrimitive.List className="max-h-60 overflow-y-auto p-1 outline-none">
                  {(country: Country) => (
                    <ComboboxPrimitive.Item
                      key={`${country.code}-${country.dial}`}
                      value={country}
                      className="flex w-full cursor-pointer touch-manipulation items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors outline-none hover:bg-muted/70 focus-visible:bg-muted data-highlighted:bg-muted"
                    >
                      <CountryFlag code={country.code} />
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {country.name}
                      </span>
                      <span className="font-variant-numeric shrink-0 text-xs text-muted-foreground tabular-nums">
                        +{country.dial}
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

        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
            <HugeiconsIcon icon={Call02Icon} size={15} aria-hidden="true" />
          </div>
          <input
            id={inputId}
            type="tel"
            inputMode="tel"
            autoComplete={autoComplete}
            disabled={disabled}
            value={national}
            onChange={(e) => handleNationalChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className="h-full w-full border-0 bg-transparent py-2 pr-3.5 pl-9 text-base text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-sm"
          />
        </div>
      </div>

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
