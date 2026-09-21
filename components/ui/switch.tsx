"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

export interface SwitchProps {
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

export function Switch({
  label,
  name,
  checked,
  defaultChecked,
  onCheckedChange,
  error,
  helperText,
  className,
  disabled,
}: SwitchProps) {
  const id = React.useId();
  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="flex cursor-pointer touch-manipulation items-center justify-between gap-3 rounded-lg px-1 py-1 focus-within:ring-2 focus-within:ring-ring/30"
      >
        <span className="min-w-0 flex-1 text-sm break-words text-foreground">{label}</span>
        <SwitchPrimitive.Root
          id={id}
          name={name}
          checked={checked}
          defaultChecked={defaultChecked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full border border-input bg-muted transition-colors",
            "data-checked:border-primary data-checked:bg-primary",
            "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <SwitchPrimitive.Thumb className="block size-5 rounded-full bg-card shadow-xs transition-transform data-checked:translate-x-5 data-unchecked:translate-x-0" />
        </SwitchPrimitive.Root>
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
