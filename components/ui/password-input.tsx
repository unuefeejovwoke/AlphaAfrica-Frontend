"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons"
import { Input, type InputProps } from "@/components/ui/input"

/**
 * A password field the user can read back. Seven auth fields shipped blind;
 * mistyped passwords on mobile were the largest recoverable failure in the
 * flow, and a reveal toggle is the cheapest possible fix.
 *
 * Caps Lock is read straight off the native `KeyboardEvent` rather than by
 * comparing values — the platform already tracks the modifier state, so no
 * polling and no second keystroke check.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ type, helperText, ...props }, ref) => {
    const [revealed, setRevealed] = React.useState(false)
    const [capsOn, setCapsOn] = React.useState(false)

    return (
      <Input
        {...props}
        ref={ref}
        // Auth surfaces read at a slightly larger label size than the app
        // default; this component only ever ships inside them.
        labelSize="md"
        type={revealed ? "text" : "password"}
        // keyup only: pressing CapsLock always fires one, and `onBlur` clears
        // it — a keydown handler would only duplicate the same read.
        onKeyUp={(event) => {
          setCapsOn(event.getModifierState("CapsLock"))
          props.onKeyUp?.(event)
        }}
        onBlur={(event) => {
          setCapsOn(false)
          props.onBlur?.(event)
        }}
        helperText={capsOn ? "Caps Lock is on" : helperText}
        endAdornment={
          <button
            type="button"
            onClick={() => setRevealed((open) => !open)}
            aria-pressed={revealed}
            aria-label={revealed ? "Hide password" : "Show password"}
            // 44px target: the visual dot is 20px, but the hit area is the
            // whole trailing column of the field.
            className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <HugeiconsIcon
              icon={revealed ? ViewOffIcon : ViewIcon}
              size={17}
              aria-hidden="true"
            />
          </button>
        }
      />
    )
  }
)
PasswordInput.displayName = "PasswordInput"
