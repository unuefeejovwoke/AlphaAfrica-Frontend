"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { BedSingle01Icon, UserGroupIcon, PlusSignIcon, MinusSignIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { MAX_HOTEL_GUESTS, MAX_HOTEL_ROOMS } from "@/lib/api/hotels";

export interface HotelParty {
  guests: number;
  rooms: number;
}

export interface HotelPartyStepperProps {
  value: HotelParty;
  onChange: (value: HotelParty) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
}

interface CounterRowProps {
  id: string;
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  label: string;
  hint: string;
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}

/**
 * One labelled counter row: icon + label, then a minus/value/plus cluster with
 * 44px tap targets, disabled bounds, and screen-reader labels. Large tap
 * targets and stepper semantics per the mobile-first accessibility mandate.
 */
function CounterRow({ id, icon, label, hint, value, max, disabled, onChange }: CounterRowProps) {
  const valueId = `${id}-value`;
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={disabled || value <= 1}
          aria-label={`Decrease ${label.toLowerCase()}`}
          aria-controls={valueId}
          className="flex size-11 touch-manipulation items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={MinusSignIcon} size={14} aria-hidden="true" />
        </button>
        <span
          id={valueId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="w-6 text-center text-sm font-semibold tabular-nums text-foreground"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          aria-controls={valueId}
          className="flex size-11 touch-manipulation items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={PlusSignIcon} size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Guests and rooms for a hotel search (booking hints, not availability gates).
 * Minimums of one; the value carries into booking as a hint (spec §56).
 */
export function HotelPartyStepper({
  value,
  onChange,
  error,
  className,
  disabled,
}: HotelPartyStepperProps) {
  const headingId = React.useId();
  const errorId = React.useId();
  const guestsId = React.useId();
  const roomsId = React.useId();

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      aria-describedby={error ? errorId : undefined}
      className={cn("w-full rounded-2xl border border-border bg-card p-4 shadow-xs", className)}
    >
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HugeiconsIcon icon={UserGroupIcon} size={18} aria-hidden="true" />
          </div>
          <div>
            <h4 id={headingId} className="text-sm font-semibold text-foreground">
              Guests and rooms
            </h4>
            <p className="text-xs text-muted-foreground">
              A hint for your stay — you can change this before paying.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-1 divide-y divide-border/50">
        <CounterRow
          id={guestsId}
          icon={UserGroupIcon}
          label="Guests"
          hint="Everyone staying, including children."
          value={value.guests}
          max={MAX_HOTEL_GUESTS}
          disabled={disabled}
          onChange={(guests) => onChange({ ...value, guests })}
        />
        <CounterRow
          id={roomsId}
          icon={BedSingle01Icon}
          label="Rooms"
          hint="How many rooms you need."
          value={value.rooms}
          max={MAX_HOTEL_ROOMS}
          disabled={disabled}
          onChange={(rooms) => onChange({ ...value, rooms })}
        />
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
