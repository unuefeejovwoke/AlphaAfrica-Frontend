import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Call02Icon,
  Clock01Icon,
  Facebook02Icon,
  InstagramIcon,
  Location01Icon,
  Mail01Icon,
  Message01Icon,
  TiktokIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons"
import { company, getWhatsAppUrl } from "@/lib/content/company"
import { contact } from "@/lib/content/contact"

export function PublicFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-border/50 bg-background text-foreground">
      {/* Editorial Pre-Footer / Concierge Bar */}
      <div className="border-b border-border/50 bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-6 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HugeiconsIcon
                icon={Message01Icon}
                size={18}
                aria-hidden="true"
              />
            </div>
            <p className="text-sm font-medium text-foreground">
              Ready to discuss your itinerary?{" "}
              <span className="text-muted-foreground">
                Our Abuja travel desk is standing by to assist with live
                availability, custom packages, and bookings.
              </span>
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0 sm:w-auto sm:py-2"
          >
            <span>Talk to Alphaa</span>
          </Link>
        </div>
      </div>

      {/* Main Navigation Grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Two link columns share a row on mobile so the footer stays scannable;
            brand and contact span the full width, as they carry prose. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:gap-10">
          {/* Brand Column */}
          <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
            <Link href="/" className="group flex items-center gap-2.5">
              <Image
                src="/android-chrome-192x192.png"
                alt="Alphaa Africa"
                width={32}
                height={32}
                className="size-8 object-contain transition-transform duration-300 ease-out group-hover:scale-105"
              />
              <span className="text-lg leading-none font-bold tracking-tight">
                <span className="text-secondary">Alphaa</span>{" "}
                <span className="font-medium text-primary">Africa</span>
              </span>
            </Link>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Your trusted travel partner. We combine self-service booking for
              flights, hotels, packages, and car rentals with dedicated human
              concierge advisory.
            </p>

            {/* Social Icons */}
            <div
              className="mt-1 flex items-center gap-2.5"
              aria-label="Social media links"
            >
              <a
                href={company.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex size-11 touch-manipulation items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-90 sm:size-9"
              >
                <HugeiconsIcon
                  icon={InstagramIcon}
                  size={17}
                  aria-hidden="true"
                />
              </a>
              <a
                href={company.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex size-11 touch-manipulation items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-90 sm:size-9"
              >
                <HugeiconsIcon
                  icon={Facebook02Icon}
                  size={17}
                  aria-hidden="true"
                />
              </a>
              <a
                href={company.socials.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex size-11 touch-manipulation items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-90 sm:size-9"
              >
                <HugeiconsIcon icon={TiktokIcon} size={17} aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Column 2: Book Services */}
          <div>
            <h3 className="mb-3.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Services
            </h3>
            <ul className="space-y-0.5 text-xs sm:space-y-2.5">
              <li>
                <Link
                  href="/flights"
                  className="flex min-h-11 items-center text-foreground/80 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  Flights &amp; Air Tickets
                </Link>
              </li>
              <li>
                <Link
                  href="/hotels"
                  className="flex min-h-11 items-center text-foreground/80 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  Hotels &amp; Resorts
                </Link>
              </li>
              <li>
                <Link
                  href="/packages"
                  className="flex min-h-11 items-center text-foreground/80 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  Curated Packages
                </Link>
              </li>
              <li>
                <Link
                  href="/visa"
                  className="flex min-h-11 items-center text-foreground/80 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  Visa Assistance
                </Link>
              </li>
              <li>
                <Link
                  href="/cars"
                  className="flex min-h-11 items-center text-foreground/80 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  Chauffeured Cars
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Explore & Company */}
          <div>
            <h3 className="mb-3.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Company
            </h3>
            <ul className="space-y-0.5 text-xs sm:space-y-2.5">
              <li>
                <Link
                  href="/destinations"
                  className="flex min-h-11 items-center text-foreground/80 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  Destinations
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="flex min-h-11 items-center text-foreground/80 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  Travel Blog &amp; News
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="flex min-h-11 items-center text-foreground/80 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  Help &amp; FAQs
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="flex min-h-11 items-center text-foreground/80 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  Contact Office
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Abuja Headquarters & Direct Contact */}
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Abuja Headquarters
            </h3>

            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <HugeiconsIcon
                icon={Location01Icon}
                size={15}
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="leading-relaxed">{company.office.address}</p>
            </div>

            {/* Icon sits inside its link so the whole row is the tap target. */}
            <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground sm:gap-2">
              <li>
                <a
                  href={getWhatsAppUrl(company.whatsapp.prefills.services)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center gap-2.5 rounded-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  <HugeiconsIcon
                    icon={WhatsappIcon}
                    size={16}
                    className="shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <span className="font-medium text-foreground">
                    WhatsApp: {company.whatsapp.display}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${company.phone.e164}`}
                  className="flex min-h-11 items-center gap-2.5 rounded-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  <HugeiconsIcon
                    icon={Call02Icon}
                    size={16}
                    className="shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="font-medium text-foreground">
                    Call: {company.phone.display}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${company.email}`}
                  className="flex min-h-11 items-center gap-2.5 rounded-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  <HugeiconsIcon
                    icon={Mail01Icon}
                    size={16}
                    className="shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="font-medium break-all text-foreground">
                    {company.email}
                  </span>
                </a>
              </li>
            </ul>

            <div className="mt-1 flex items-start gap-2.5 text-[11px] text-muted-foreground/80">
              <HugeiconsIcon
                icon={Clock01Icon}
                size={14}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span className="leading-relaxed">{contact.hours.label}</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border/50 pt-4 text-xs text-muted-foreground sm:flex-row sm:gap-4 sm:pt-6">
          <p className="py-2 text-center sm:py-0 sm:text-left">
            © {currentYear} Alphaa Africa Limited. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-0 text-xs sm:gap-x-6 sm:gap-y-2">
            <Link
              href="/privacy"
              className="flex min-h-11 items-center rounded-sm transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="flex min-h-11 items-center rounded-sm transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
            >
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
