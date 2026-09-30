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
          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span>Talk to Alphaa</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {/* Brand Column */}
          <div className="flex flex-col gap-4">
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
              className="mt-1 flex items-center gap-2"
              aria-label="Social media links"
            >
              <a
                href={company.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex size-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground active:scale-90"
              >
                <HugeiconsIcon
                  icon={InstagramIcon}
                  size={15}
                  aria-hidden="true"
                />
              </a>
              <a
                href={company.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex size-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground active:scale-90"
              >
                <HugeiconsIcon
                  icon={Facebook02Icon}
                  size={15}
                  aria-hidden="true"
                />
              </a>
              <a
                href={company.socials.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex size-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground active:scale-90"
              >
                <HugeiconsIcon icon={TiktokIcon} size={15} aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Column 2: Book Services */}
          <div>
            <h3 className="mb-3.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Services
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/flights"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Flights & Air Tickets
                </Link>
              </li>
              <li>
                <Link
                  href="/hotels"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Hotels & Resorts
                </Link>
              </li>
              <li>
                <Link
                  href="/packages"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Curated Packages
                </Link>
              </li>
              <li>
                <Link
                  href="/visa"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Visa Assistance
                </Link>
              </li>
              <li>
                <Link
                  href="/cars"
                  className="text-foreground/80 transition-colors hover:text-primary"
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
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/destinations"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Destinations
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Travel Blog & News
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  About Alphaa Africa
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Help & FAQs
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Contact Office
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Abuja Headquarters & Direct Contact */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Abuja Headquarters
            </h3>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <HugeiconsIcon
                icon={Location01Icon}
                size={15}
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="leading-relaxed">{company.office.address}</p>
            </div>

            <div className="mt-1 flex flex-col gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={WhatsappIcon}
                  size={15}
                  className="shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <a
                  href={getWhatsAppUrl(company.whatsapp.prefills.services)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground transition-colors hover:text-primary"
                >
                  WhatsApp: {company.whatsapp.display}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={Call02Icon}
                  size={15}
                  className="shrink-0 text-primary"
                  aria-hidden="true"
                />
                <a
                  href={`tel:${company.phone.e164}`}
                  className="transition-colors hover:text-foreground"
                >
                  {company.phone.display}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={Mail01Icon}
                  size={15}
                  className="shrink-0 text-primary"
                  aria-hidden="true"
                />
                <a
                  href={`mailto:${company.email}`}
                  className="transition-colors hover:text-foreground"
                >
                  {company.email}
                </a>
              </div>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
              <HugeiconsIcon
                icon={Clock01Icon}
                size={13}
                className="shrink-0"
                aria-hidden="true"
              />
              <span>Mon – Sat: 8:00 AM – 6:00 PM (WAT)</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {currentYear} Alphaa Africa Limited. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <Link
              href="/privacy"
              className="transition-colors hover:text-primary"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-primary"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/login"
              className="transition-colors hover:text-primary"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
