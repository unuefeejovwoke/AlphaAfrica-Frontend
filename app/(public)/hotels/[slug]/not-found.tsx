import { HugeiconsIcon } from "@hugeicons/react"
import { Hotel01Icon, Message01Icon } from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { getHotelSupportWhatsAppUrl } from "@/lib/api/hotels"

/**
 * Unknown Hotel slug: honest not-found with a way back and human help.
 * Never a blank container, never a fabricated alternative Hotel.
 */
export default function HotelNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <HugeiconsIcon icon={Hotel01Icon} size={24} aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        We couldn&apos;t find that Hotel.
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        It may have been removed or the link has a mistake. Search again for
        your stay — no booking was made and no payment was taken.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/hotels">
          <span>Search Hotels</span>
        </ButtonLink>
        <ButtonLink
          href={getHotelSupportWhatsAppUrl("finding a Hotel for my stay")}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          size="sm"
        >
          <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
          <span>Talk to Alphaa</span>
        </ButtonLink>
      </div>
    </div>
  )
}
