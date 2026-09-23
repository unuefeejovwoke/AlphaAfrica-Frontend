import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon, Message01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TrackLink } from "@/components/analytics/track-link"
import { getErrorPreset, type ErrorPreset } from "@/lib/feedback-presets"
import { ApiError, getHumanErrorMessage } from "@/lib/api/client"
import { getSupportWhatsAppUrl } from "@/lib/content/company"

export interface ErrorStateProps {
  preset?: ErrorPreset
  title?: string
  description?: string
  /**
   * Optional typed API failure. When an {@link ApiError} is passed, its
   * customer-safe copy (never the raw backend payload) overrides
   * `description`, so API-backed pages get diagnosis + recovery for free.
   */
  error?: unknown
  onRetry?: () => void
  retryLabel?: string
  alternateLabel?: string
  alternateHref?: string
  /**
   * Trip-aware WhatsApp prefill, e.g. "finding a flight for my route
   * (LOS → DXB on 2026-05-01)". Overrides the preset text so error branches
   * can carry route, dates, party, or reference context.
   */
  supportContext?: string
  className?: string
}

export function ErrorState({
  preset = "general",
  title,
  description,
  error,
  onRetry,
  retryLabel = "Try Again",
  alternateLabel,
  alternateHref,
  supportContext,
  className,
}: ErrorStateProps) {
  const presetData = getErrorPreset(preset)
  const displayTitle = title || presetData.title
  const displayDescription =
    description ||
    (error instanceof ApiError
      ? getHumanErrorMessage(error)
      : presetData.description)
  const displayAlternateLabel =
    alternateLabel || presetData.alternateRoute.label
  const displayAlternateHref = alternateHref || presetData.alternateRoute.href

  // Single source of truth: WhatsApp number comes from lib/content/company.ts.
  const whatsappUrl = getSupportWhatsAppUrl(
    supportContext ?? presetData.whatsappText
  )

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

      <h3 className="min-w-0 text-base font-bold text-balance text-foreground">
        {displayTitle}
      </h3>
      <p className="mt-1.5 max-w-md min-w-0 text-xs leading-relaxed break-words text-muted-foreground">
        {displayDescription}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button type="button" onClick={onRetry} variant="outline" size="sm">
            {retryLabel}
          </Button>
        ) : null}
        <Button
          render={
            <a
              href={displayAlternateHref}
              className="flex items-center gap-2"
            />
          }
          variant="ghost"
          size="sm"
        >
          <span>{displayAlternateLabel}</span>
        </Button>
        <Button
          render={
            <TrackLink
              event="support_click"
              eventProps={{
                context: supportContext ?? presetData.whatsappText,
                channel: "whatsapp",
              }}
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
  )
}
