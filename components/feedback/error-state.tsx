import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Message01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getErrorPreset, type ErrorPreset } from "@/lib/feedback-presets";

export { getErrorPreset, type ErrorPreset };

export interface ErrorStateProps {
  preset?: ErrorPreset;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  preset = "general",
  title,
  description,
  onRetry,
  retryLabel = "Try Again",
  className,
}: ErrorStateProps) {
  const presetData = getErrorPreset(preset);
  const displayTitle = title || presetData.title;
  const displayDescription = description || presetData.description;

  const whatsappUrl = `https://wa.me/2348000000000?text=${encodeURIComponent(
    presetData.whatsappText
  )}`;

  return (
    <div
      role="alert"
      className={cn(
        "flex min-w-0 flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-xs",
        className
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
      </div>

      <h3 className="min-w-0 text-base font-bold text-balance text-foreground">{displayTitle}</h3>
      <p className="mt-1.5 max-w-md min-w-0 text-xs leading-relaxed break-words text-muted-foreground">
        {displayDescription}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button type="button" onClick={onRetry} variant="outline" size="sm">
            {retryLabel}
          </Button>
        )}
        <Button
          render={
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            />
          }
          variant="secondary"
          size="sm"
        >
          <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
          <span>Speak with Alphaa</span>
        </Button>
      </div>
    </div>
  );
}
