"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  label: string
  name?: string
  options: SelectOption[]
  value?: string
  defaultValue?: string
  placeholder?: string
  onValueChange?: (value: string) => void
  error?: string
  helperText?: string
  className?: string
  hideLabel?: boolean
}

export function Select({
  label,
  name,
  options,
  value,
  defaultValue,
  placeholder = "Choose an option…",
  onValueChange,
  error,
  helperText,
  className,
  hideLabel = false,
}: SelectProps) {
  const id = React.useId()
  const handleValueChange = (next: string | null) => {
    if (next !== null) onValueChange?.(next)
  }
  return (
    <div className={cn("w-full", !hideLabel ? "space-y-1.5" : "", className)}>
      <label
        htmlFor={id}
        className={cn(
          "block text-xs font-semibold tracking-wider text-foreground/80 uppercase",
          hideLabel ? "sr-only" : ""
        )}
      >
        {label}
      </label>
      <SelectPrimitive.Root
        name={name}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
      >
        <SelectPrimitive.Trigger
          id={id}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : helperText ? `${id}-helper` : undefined
          }
          className={cn(
            "flex h-10 w-full touch-manipulation items-center justify-between gap-2 rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground shadow-xs transition-colors",
            "hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
            error && "border-destructive"
          )}
        >
          <SelectPrimitive.Value
            placeholder={placeholder}
            className="min-w-0 flex-1 truncate text-left"
          />
          <SelectPrimitive.Icon className="shrink-0 text-muted-foreground">
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={16}
              aria-hidden="true"
            />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Positioner
            sideOffset={4}
            className="z-50 outline-none"
          >
            <SelectPrimitive.Popup className="min-w-[var(--anchor-width)] overscroll-contain rounded-xl border border-border bg-card p-1 text-foreground shadow-lg">
              <SelectPrimitive.List className="max-h-60 overflow-y-auto outline-none">
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    className="flex cursor-pointer touch-manipulation items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors outline-none focus-visible:bg-muted data-highlighted:bg-muted"
                  >
                    <SelectPrimitive.ItemIndicator className="flex w-4 shrink-0 items-center justify-center text-primary data-unchecked:hidden">
                      <HugeiconsIcon
                        icon={Tick01Icon}
                        size={14}
                        aria-hidden="true"
                      />
                    </SelectPrimitive.ItemIndicator>
                    <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">
                      {option.label}
                    </SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.List>
            </SelectPrimitive.Popup>
          </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
