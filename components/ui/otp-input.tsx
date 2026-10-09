"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { normalizeOtpInput, OTP_LENGTH } from "@/lib/api/auth"

interface OtpInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> {
  value: string
  onValueChange: (value: string) => void
  /** Fired once the sixth digit lands, so the form can verify without a tap. */
  onComplete?: () => void
  error?: string
  label?: string
  helperText?: string
}

/**
 * A six-digit code box backed by ONE real `<input>`.
 *
 * Six separate boxes would mean six refs, a caret-forward/backward dance,
 * no native selection, and a broken `autocomplete="one-time-code"` — the
 * attribute that lets iOS and Android offer the code straight from the SMS.
 * A single input keeps the caret, selection, and autofill native while the
 * boxes are drawn on top of it as pure presentation.
 *
 * The input's own glyphs are transparent; the digits render in the boxes
 * below. The field therefore stays one control for the accessibility tree,
 * and `inputMode="numeric"` still raises the digits keypad.
 */
const OtpInput = React.forwardRef<HTMLInputElement, OtpInputProps>(
  (
    {
      value,
      onValueChange,
      onComplete,
      error,
      label,
      helperText,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const digits = normalizeOtpInput(value)
    const completeRef = React.useRef(false)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = normalizeOtpInput(event.target.value)
      onValueChange(next)
      // Only fire once per fill: a paste of 7+ digits, or an edit after a
      // complete code, must not re-submit.
      if (next.length === OTP_LENGTH && !completeRef.current) {
        completeRef.current = true
        onComplete?.()
      }
      if (next.length < OTP_LENGTH) completeRef.current = false
    }

    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-semibold tracking-wider text-foreground/80 uppercase"
          >
            {label}
          </label>
        ) : null}
        {/* Auth-only component; the 13px label matches `Input labelSize="md"`. */}
        {/* `has-[:focus-visible]` gives the boxes a focus ring: the real input's own
            ring is suppressed below, so the drawn group must stand in for it
            or a keyboard user has no visible focus at all (WCAG 2.4.7). */}
        <div className="relative rounded-xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40 has-[input[aria-invalid=true]]:ring-destructive/30">
          <input
            {...props}
            id={inputId}
            ref={ref}
            value={digits}
            onChange={handleChange}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            className={cn(
              "absolute inset-0 z-10 h-full w-full rounded-xl bg-transparent text-transparent caret-transparent outline-none",
              className
            )}
          />
          {/* Boxes: `pointer-events-none` so every click lands on the real
              input above and focus/selection behave like one field. */}
          <div
            aria-hidden="true"
            className="pointer-events-none grid grid-cols-6 gap-1.5 sm:gap-2"
          >
            {Array.from({ length: OTP_LENGTH }, (_, index) => {
              const filled = digits[index] !== undefined
              return (
                <span
                  key={index}
                  className={cn(
                    "flex h-12 items-center justify-center rounded-xl border bg-card text-lg font-bold text-foreground transition-colors sm:h-14 sm:text-xl",
                    error
                      ? "border-destructive"
                      : filled
                        ? "border-ring/60 bg-muted/40"
                        : "border-input"
                  )}
                >
                  {digits[index] ?? ""}
                </span>
              )
            })}
          </div>
        </div>
        {error ? (
          <p
            id={`${inputId}-error`}
            className="text-[13px] font-medium text-destructive"
          >
            {error}
          </p>
        ) : helperText ? (
          <p
            id={`${inputId}-helper`}
            className="text-[13px] text-muted-foreground"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)
OtpInput.displayName = "OtpInput"

export { OtpInput }
