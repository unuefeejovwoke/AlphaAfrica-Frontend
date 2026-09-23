"use client"

import * as React from "react"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { cn } from "@/lib/utils"

export interface RadioOption {
  value: string
  label: string
  description?: string
}

export interface RadioGroupProps {
  label: string
  name?: string
  options: RadioOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  error?: string
  helperText?: string
  className?: string
}

export function RadioGroup({
  label,
  name,
  options,
  value,
  defaultValue,
  onValueChange,
  error,
  helperText,
  className,
}: RadioGroupProps) {
  const id = React.useId()
  return (
    <fieldset
      aria-invalid={!!error}
      aria-describedby={
        error ? `${id}-error` : helperText ? `${id}-helper` : undefined
      }
      className={cn("w-full space-y-2", className)}
    >
      <legend className="text-xs font-semibold tracking-wider text-foreground/80 uppercase">
        {label}
      </legend>
      <RadioGroupPrimitive
        name={name}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        className="flex flex-col gap-2"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer touch-manipulation items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-ring/30 hover:bg-muted/50 has-data-checked:border-primary"
          >
            <Radio.Root
              value={option.value}
              className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-input focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none data-checked:border-primary"
            >
              <Radio.Indicator className="size-2 rounded-full bg-primary data-unchecked:hidden" />
            </Radio.Root>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium break-words text-foreground">
                {option.label}
              </span>
              {option.description && (
                <span className="mt-0.5 block text-xs break-words text-muted-foreground">
                  {option.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </RadioGroupPrimitive>
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </fieldset>
  )
}
