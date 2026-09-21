"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DatePickerProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label: string;
  error?: string;
  helperText?: string;
}

export function DatePicker({ label, error, helperText, id, className, ...props }: DatePickerProps) {
  const inputId = id || React.useId();
  return (
    <div className="w-full space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
      >
        {label}
      </label>
      <input
        id={inputId}
        type="date"
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        className={cn(
          "flex h-10 w-full touch-manipulation rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground tabular-nums shadow-xs transition-colors",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive",
          className
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
