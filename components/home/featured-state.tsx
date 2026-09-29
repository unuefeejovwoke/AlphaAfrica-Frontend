import { HugeiconsIcon } from "@hugeicons/react"
import { Message01Icon } from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import { RetryButton } from "@/components/home/retry-button"
import { getSupportWhatsAppUrl } from "@/lib/content/company"

/**
 * Shared empty/error states for the live featured sections (§12).
 * Every terminal state carries a WhatsApp escape hatch — the visitor is
 * never left wondering what to do next.
 */

export function FeaturedEmpty({
  whatsappContext,
  description,
}: {
  whatsappContext: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
      <p className="text-sm font-semibold text-foreground">
        No featured trips right now, talk to Alphaa.
      </p>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      <ButtonLink
        href={getSupportWhatsAppUrl(whatsappContext)}
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
        className="bg-emerald-600 text-white hover:bg-emerald-700"
      >
        <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
        <span>Talk to Alphaa</span>
      </ButtonLink>
    </div>
  )
}

export function FeaturedError({
  title,
  whatsappContext,
  error,
}: {
  title: string
  whatsappContext: string
  /** Typed API failure: rendered as customer-safe copy, never raw backend text. */
  error?: unknown
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <ErrorState preset="general" title={title} error={error} />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <RetryButton />
        <ButtonLink
          href={getSupportWhatsAppUrl(whatsappContext)}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          size="sm"
        >
          <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
          <span>Talk to Alphaa</span>
        </ButtonLink>
      </div>
    </div>
  )
}
