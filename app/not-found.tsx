import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { Message01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { SiteShell } from "@/components/navigation/site-shell"
import { ButtonLink } from "@/components/ui/button"
import { getSupportWhatsAppUrl } from "@/lib/content/company"

/**
 * App-wide 404: unmatched URLs, and any `notFound()` outside a segment that
 * declares its own `not-found.tsx`. Renders inside the root layout, so it
 * wraps itself in `SiteShell` — a 404 without nav, footer, and support entry
 * is a dead end.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description:
    "That page has moved or never existed. Search flights, hotels, packages, and visa assistance, or talk to a specialist.",
  robots: { index: false, follow: true },
}

const RECOVERY_LINKS = [
  { href: "/flights", label: "Flights" },
  { href: "/hotels", label: "Hotels" },
  { href: "/destinations", label: "Destinations" },
  { href: "/packages", label: "Packages" },
  { href: "/visa", label: "Visa Assistance" },
  { href: "/cars", label: "Car Rentals" },
]

export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6 sm:py-24">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={Search01Icon} size={24} aria-hidden="true" />
        </span>

        <p className="text-xs font-semibold tracking-wider text-primary uppercase">
          Error 404
        </p>

        <h1 className="text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-4xl">
          We couldn&apos;t find that page.
        </h1>

        <p className="max-w-md text-sm leading-relaxed break-words text-muted-foreground sm:text-base">
          The link may be mistyped, or the page may have been renamed. Nothing
          was booked and no payment was taken.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <ButtonLink href="/">
            <span>Back to home</span>
          </ButtonLink>
          <ButtonLink
            href={getSupportWhatsAppUrl("finding a page on the Alphaa site")}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
          >
            <HugeiconsIcon icon={Message01Icon} size={16} aria-hidden="true" />
            <span>Talk to Alphaa</span>
          </ButtonLink>
        </div>

        <nav aria-label="Popular pages" className="w-full pt-6">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Or start here
          </h2>
          <ul className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {RECOVERY_LINKS.map((link) => (
              <li key={link.href}>
                <ButtonLink
                  href={link.href}
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                >
                  {link.label}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </SiteShell>
  )
}