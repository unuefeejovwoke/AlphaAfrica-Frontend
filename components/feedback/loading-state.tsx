import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Airplane01Icon,
  Building01Icon,
  CreditCardIcon,
  SecurityCheckIcon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { getLoadingPreset, type LoadingPreset } from "@/lib/feedback-presets";

export interface LoadingStateProps {
  preset?: LoadingPreset;
  title?: string;
  description?: string;
  className?: string;
}

const presetIcons = {
  flights: Airplane01Icon,
  hotels: Building01Icon,
  price: Tag01Icon,
  payment: CreditCardIcon,
  general: SecurityCheckIcon,
} as const;

export function LoadingState({
  preset = "general",
  title,
  description,
  className,
}: LoadingStateProps) {
  const presetData = getLoadingPreset(preset);
  const displayTitle = title || presetData.title;
  const displayDescription = description || presetData.description;
  const PresetIcon = presetIcons[preset] ?? presetIcons.general;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex min-w-0 flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-8 text-center shadow-xs",
        className
      )}
    >
      {/* Animated Radar Pulse */}
      <div className="relative mb-5 flex size-16 items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inline-flex size-full animate-ping rounded-full bg-primary/20 opacity-75 motion-reduce:animate-none"
        ></span>
        <div className="relative flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <HugeiconsIcon
            icon={PresetIcon}
            size={24}
            aria-hidden="true"
            className="animate-pulse motion-reduce:animate-none"
          />
        </div>
      </div>

      <h3 className="min-w-0 text-base font-bold text-balance text-foreground">{displayTitle}</h3>
      <p className="mt-1 max-w-sm min-w-0 text-xs leading-relaxed break-words text-muted-foreground">
        {displayDescription}
      </p>
    </div>
  );
}
