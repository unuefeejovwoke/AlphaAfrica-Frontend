import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Call02Icon,
  Mail01Icon,
  Message01Icon,
  InstagramIcon,
  NewTwitterIcon,
  Facebook02Icon,
  TiktokIcon,
} from "@hugeicons/core-free-icons"
import { company, getSupportWhatsAppUrl } from "@/lib/content/company"

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
              Not sure what you need?{" "}
              <span className="text-muted-foreground">
                Tell us the trip — we&apos;ll tell you the next step.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">

            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span>Talk to Alphaa</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Brand Column */}
          <div className="flex flex-col gap-4 lg:col-span-2">
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

            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              Book flights, hotels, packages, visas, and cars yourself — or get
              real help from our team.
            </p>

            {/* Direct Contact Links */}
            <div className="mt-1 flex flex-col gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={Call02Icon}
                  size={14}
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
                  size={14}
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

            {/* Social Icons */}
            <div
              className="mt-2 flex items-center gap-2"
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
                href={company.socials.x}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (formerly Twitter)"
                className="flex size-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground active:scale-90"
              >
                <HugeiconsIcon
                  icon={NewTwitterIcon}
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

          {/* Column 2: Book */}
          <div>
            <h3 className="mb-3.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Book
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/flights"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Flights
                </Link>
              </li>
              <li>
                <Link
                  href="/hotels"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Hotels
                </Link>
              </li>
              <li>
                <Link
                  href="/packages"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Packages
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
                  href="/car-rentals"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Car Rentals
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Discover */}
          <div>
            <h3 className="mb-3.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Discover
            </h3>
            <ul className="space-y-2 text-xs">
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
                  href="/about"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t border-border/50 pt-6 text-xs text-muted-foreground">
          <p>© {currentYear} Alphaa Africa Limited. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
