"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, PlusSignIcon, MinusSignIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { TravellerComposition } from "@/lib/schemas/travel";

export interface TravellerStepperProps {
  value: TravellerComposition;
  onChange: (value: TravellerComposition) => void;
  className?: string;
  error?: string;
}

export function TravellerStepper({
  value,
  onChange,
  className,
  error,
}: TravellerStepperProps) {
  const total = value.adults + value.children + value.infants;

  const updateAdults = (delta: number) => {
    const nextAdults = Math.max(1, Math.min(9, value.adults + delta));
    // If reducing adults, ensure infants do not exceed adults
    const nextInfants = Math.min(value.infants, nextAdults);
    if (nextAdults + value.children + nextInfants <= 9) {
      onChange({ ...value, adults: nextAdults, infants: nextInfants });
    }
  };

  const updateChildren = (delta: number) => {
    const nextChildren = Math.max(0, Math.min(8, value.children + delta));
    if (value.adults + nextChildren + value.infants <= 9) {
      onChange({ ...value, children: nextChildren });
    }
  };

  const updateInfants = (delta: number) => {
    // Cannot exceed number of adults
    const nextInfants = Math.max(0, Math.min(value.adults, value.infants + delta));
    if (value.adults + value.children + nextInfants <= 9) {
      onChange({ ...value, infants: nextInfants });
    }
  };

  return (
    <div className={cn("w-full rounded-2xl border border-border bg-card p-4 shadow-xs", className)}>
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HugeiconsIcon icon={UserIcon} size={18} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Travellers</h4>
            <p className="text-xs text-muted-foreground">
              {total} {total === 1 ? "traveller" : "travellers"} (max 9)
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 divide-y divide-border/50">
        {/* Adults row */}
        <div className="flex items-center justify-between py-2.5">
          <div>
            <div className="text-sm font-medium text-foreground">Adults</div>
            <div className="text-xs text-muted-foreground">Age 12+</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateAdults(-1)}
              disabled={value.adults <= 1}
              aria-label="Decrease adults"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HugeiconsIcon icon={MinusSignIcon} size={14} />
            </button>
            <span className="w-5 text-center text-sm font-semibold text-foreground">{value.adults}</span>
            <button
              type="button"
              onClick={() => updateAdults(1)}
              disabled={total >= 9 || value.adults >= 9}
              aria-label="Increase adults"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
            </button>
          </div>
        </div>

        {/* Children row */}
        <div className="flex items-center justify-between py-2.5">
          <div>
            <div className="text-sm font-medium text-foreground">Children</div>
            <div className="text-xs text-muted-foreground">Age 2–11</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateChildren(-1)}
              disabled={value.children <= 0}
              aria-label="Decrease children"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HugeiconsIcon icon={MinusSignIcon} size={14} />
            </button>
            <span className="w-5 text-center text-sm font-semibold text-foreground">{value.children}</span>
            <button
              type="button"
              onClick={() => updateChildren(1)}
              disabled={total >= 9}
              aria-label="Increase children"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
            </button>
          </div>
        </div>

        {/* Infants row */}
        <div className="flex items-center justify-between py-2.5">
          <div>
            <div className="text-sm font-medium text-foreground">Infants</div>
            <div className="text-xs text-muted-foreground">Under 2 (on lap, max 1 per adult)</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateInfants(-1)}
              disabled={value.infants <= 0}
              aria-label="Decrease infants"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HugeiconsIcon icon={MinusSignIcon} size={14} />
            </button>
            <span className="w-5 text-center text-sm font-semibold text-foreground">{value.infants}</span>
            <button
              type="button"
              onClick={() => updateInfants(1)}
              disabled={total >= 9 || value.infants >= value.adults}
              aria-label="Increase infants"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
