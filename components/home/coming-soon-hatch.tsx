import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Message01Icon, Call02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { company, getSupportWhatsAppUrl } from "@/lib/content/company"

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
  service: string
  whatsappContext: string
  blurb: string
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-muted/30 p-5 sm:gap-5 sm:p-6 dark:bg-muted/15">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-primary uppercase">
            {service} · Coming soon
          </span>
        </div>
        <p className="text-base font-bold tracking-tight text-foreground sm:text-lg">
          Online booking for {service.toLowerCase()} lands soon.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {blurb}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
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
          className="justify-center rounded-xl bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
        >
          <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
          <span>WhatsApp a specialist</span>
        </Button>
        <Button
          render={
            <a href={`tel:${company.phone.e164}`} className="justify-center" />
          }
          variant="outline"
          size="sm"
          className="justify-center rounded-xl"
        >
          <HugeiconsIcon icon={Call02Icon} size={16} aria-hidden="true" />
          <span>Call {company.phone.display}</span>
        </Button>
        <Button
          render={<Link href="/contact" className="justify-center" />}
          variant="ghost"
          size="sm"
          className="justify-center rounded-xl text-muted-foreground hover:text-foreground"
        >
          <span>All contact options</span>
        </Button>
      </div>
    </div>
  )
}
