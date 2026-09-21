import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon, Call02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { TrackLink } from "@/components/analytics/track-link";
import { company, getSupportWhatsAppUrl } from "@/lib/content/company";

/**
 * Terminal conversion CTA (RSC) for Phase 2 discovery pages.
 * Every service page ends with a clear next action (PRD §14) and a
 * support escape hatch with trip context (PRD §14, §20).
 */
export function TerminalCta({
  title,
  description,
  context,
  primaryHref,
  primaryLabel,
}: {
  title: string;
  description: string;
  /** Trip context prefilled into the WhatsApp message, e.g. "a Dubai holiday". */
  context: string;
  primaryHref: string;
  primaryLabel: string;
}) {
  return (
    <section
      aria-labelledby="terminal-cta-heading"
      className="rounded-3xl bg-secondary p-8 text-secondary-foreground sm:p-12"
    >
      <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div className="flex max-w-xl flex-col gap-3">
          <span className="text-xs font-semibold tracking-wider text-primary uppercase">
            Talk to Alphaa
          </span>
          <h2
            id="terminal-cta-heading"
            className="text-2xl font-bold tracking-tight text-balance text-white sm:text-3xl"
          >
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-white/80">{description}</p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center md:w-auto">
          <Button
            render={<a href={primaryHref} />}
            size="lg"
            className="justify-center bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <span>{primaryLabel}</span>
          </Button>
          <Button
            render={
              <TrackLink
                event="support_click"
                eventProps={{ context }}
                href={getSupportWhatsAppUrl(context)}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            variant="outline"
            size="lg"
            className="justify-center border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <HugeiconsIcon icon={Message01Icon} size={18} aria-hidden="true" />
            <span>Chat on WhatsApp</span>
          </Button>
          <a
            href={`tel:${company.phone.e164}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:text-white"
          >
            <HugeiconsIcon icon={Call02Icon} size={18} aria-hidden="true" />
            <span>Call the Abuja desk</span>
          </a>
        </div>
      </div>
    </section>
  );
}
