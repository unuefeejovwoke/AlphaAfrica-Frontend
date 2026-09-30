import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  helperText?: string
  startIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type, label, error, helperText, id, startIcon, ...props },
    ref
  ) => {
    const inputId = id || React.useId()

    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold tracking-wider text-foreground/80 uppercase"
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
              "placeholder:text-muted-foreground",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error &&
                "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p
            id={`${inputId}-error`}
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
          <p id={`${inputId}-helper`} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
