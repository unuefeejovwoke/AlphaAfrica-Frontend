import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon, Call02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { company, getSupportWhatsAppUrl } from "@/lib/content/company";

/**
 * Interim hatch for services whose booking flow is not built yet
 * (flights/hotels/cars until Phases 3–5). Never links to an unbuilt route:
 * every action reaches a human specialist instead of a 404.
 */
export function ComingSoonHatch({
  service,
  whatsappContext,
  blurb,
}: {
  service: string;
  whatsappContext: string;
  blurb: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-background p-5 sm:p-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          {service} · Coming soon
        </span>
        <p className="text-sm font-bold text-foreground">Online booking for {service.toLowerCase()} lands soon.</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{blurb}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2.5">
        <Button
          render={
            <a
              href={getSupportWhatsAppUrl(whatsappContext)}
              target="_blank"
              rel="noopener noreferrer"
              className="justify-center"
            />
          }
          size="sm"
          className="bg-emerald-600 text-white hover:bg-emerald-700 justify-center"
        >
          <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
          <span>WhatsApp a specialist</span>
        </Button>
        <Button
          render={<a href={`tel:${company.phone.e164}`} className="justify-center" />}
          variant="outline"
          size="sm"
          className="justify-center"
        >
          <HugeiconsIcon icon={Call02Icon} size={16} aria-hidden="true" />
          <span>Call {company.phone.display}</span>
        </Button>
        <Button render={<Link href="/contact" className="justify-center" />} variant="ghost" size="sm" className="justify-center">
          <span>All contact options</span>
        </Button>
      </div>
    </div>
  );
}
