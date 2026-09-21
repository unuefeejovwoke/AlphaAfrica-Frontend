"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  label: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
}

export function Checkbox({
  label,
  name,
  checked,
  defaultChecked,
  onCheckedChange,
  error,
  helperText,
  className,
  disabled,
}: CheckboxProps) {
  const id = React.useId();
  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="flex cursor-pointer touch-manipulation items-center gap-2.5 rounded-lg px-1 py-1 focus-within:ring-2 focus-within:ring-ring/30"
      >
        <CheckboxPrimitive.Root
          id={id}
          name={name}
          checked={checked}
          defaultChecked={defaultChecked}
          onCheckedChange={(next) => onCheckedChange?.(next === true)}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md border border-input bg-card text-primary-foreground shadow-xs transition-colors",
            "data-checked:border-primary data-checked:bg-primary",
            "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive"
          )}
        >
          <CheckboxPrimitive.Indicator className="flex items-center justify-center data-unchecked:hidden">
            <HugeiconsIcon icon={Tick01Icon} size={14} aria-hidden="true" />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        <span className="min-w-0 flex-1 text-sm break-words text-foreground">{label}</span>
      </label>
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
  );
}
