import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  helperText?: string
  startIcon?: React.ReactNode
  /** Trailing control (reveal toggle, units). The input pads right to make room. */
  endAdornment?: React.ReactNode
  /**
   * Label and helper/error size for surfaces that need it larger than the app
   * default. Off by default, so this primitive never silently restyles every
   * form — the auth screens opt in explicitly.
   */
  labelSize?: "sm" | "md"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      helperText,
      id,
      startIcon,
      endAdornment,
      labelSize = "sm",
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId()

    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className={cn(
              "block font-semibold tracking-wider text-foreground/80 uppercase",
              labelSize === "md" ? "text-[13px]" : "text-xs"
            )}
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          {startIcon ? (
            <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              {startIcon}
            </div>
          ) : null}
          <input
            id={inputId}
            type={type}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            className={cn(
              "flex h-12 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-base text-foreground shadow-xs transition-colors sm:h-10 sm:text-sm",
              startIcon ? "pl-9" : "",
              endAdornment && "pr-11",
              "placeholder:text-muted-foreground",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error &&
                "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
              className
            )}
            {...props}
          />
          {endAdornment ? (
            <div className="absolute top-1/2 right-1 -translate-y-1/2">
              {endAdornment}
            </div>
          ) : null}
        </div>
        {error ? (
          <p
            id={`${inputId}-error`}
            className={cn(
              "flex items-start gap-1.5 font-medium text-destructive",
              labelSize === "md" ? "text-[13px]" : "text-xs"
            )}
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
          <p
            id={`${inputId}-helper`}
            className={cn(
              "text-muted-foreground",
              labelSize === "md" ? "text-[13px]" : "text-xs"
            )}
          >
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
