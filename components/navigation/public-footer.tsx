import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Call02Icon,
  Mail01Icon,
  Location01Icon,
  SecurityCheckIcon,
  Airplane01Icon,
} from "@hugeicons/core-free-icons";
import { company, getSupportWhatsAppUrl } from "@/lib/content/company";

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-border bg-card text-foreground">
      {/* Top Value Banner */}
      <div className="border-b border-border/60 bg-muted/40 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={SecurityCheckIcon} size={22} />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Verified & Secure</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Direct airline booking systems and 256-bit encrypted checkout via Paystack.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <HugeiconsIcon icon={Airplane01Icon} size={22} />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Real Human Assistance</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Dedicated travel specialists in Abuja standing by on phone, email, and WhatsApp.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={Call02Icon} size={22} />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Stress-Free Booking</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Guest checkout supported across flights, hotels, and rentals. No forced signups.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand & Mission Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 border border-border/80 p-1">
                <Image
                  src="/android-chrome-192x192.png"
                  alt="Alphaa Africa Logo"
                  width={36}
                  height={36}
                  className="size-8.5 object-contain"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Alphaa <span className="text-primary font-medium">Africa</span>
              </span>
            </Link>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Alphaa Africa is an Abuja-based assisted-service travel platform. We combine modern self-service travel booking with dedicated human specialists to make every journey easier, clearer, and less stressful.
            </p>

            <div className="mt-2 flex items-center gap-3" aria-label="Follow Alphaa Africa">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Follow Alphaa
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={company.socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Alphaa Africa on Instagram"
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Instagram
                </a>
                <a
                  href={company.socials.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Alphaa Africa on X"
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  X
                </a>
                <a
                  href={company.socials.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Alphaa Africa on Facebook"
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Facebook
                </a>
                <a
                  href={company.socials.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Alphaa Africa on TikTok"
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  TikTok
                </a>
              </div>
            </div>

            {/* Office Details */}
            <div className="mt-2 flex flex-col gap-2.5 text-xs text-foreground/80">
              <div className="flex items-start gap-2.5">
                <HugeiconsIcon icon={Location01Icon} size={16} className="text-primary shrink-0 mt-0.5" />
                <span>{company.office.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <HugeiconsIcon icon={Call02Icon} size={16} className="text-primary shrink-0" />
                <a href={`tel:${company.phone.e164}`} className="hover:text-primary transition-colors">
                  {company.phone.display}
                  {company.phone.secondaryDisplay ? ` / ${company.phone.secondaryDisplay}` : ""}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <HugeiconsIcon icon={Mail01Icon} size={16} className="text-primary shrink-0" />
                <a href={`mailto:${company.email}`} className="hover:text-primary transition-colors">
                  {company.email}
                </a>
              </div>
            </div>
          </div>

          {/* Services Column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Travel Services
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/flights" className="text-foreground/80 hover:text-primary transition-colors">
                  Flight Bookings
                </Link>
              </li>
              <li>
                <Link href="/hotels" className="text-foreground/80 hover:text-primary transition-colors">
                  Hotel Reservations
                </Link>
              </li>
              <li>
                <Link href="/packages" className="text-foreground/80 hover:text-primary transition-colors">
                  Holiday Packages
                </Link>
              </li>
              <li>
                <Link href="/visa" className="text-foreground/80 hover:text-primary transition-colors">
                  Visa Assistance
                </Link>
              </li>
              <li>
                <Link href="/car-rentals" className="text-foreground/80 hover:text-primary transition-colors">
                  Car Rentals & Transfers
                </Link>
              </li>
            </ul>
          </div>

          {/* Destinations Column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Top Destinations
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/destinations/abuja" className="text-foreground/80 hover:text-primary transition-colors">
                  Abuja & Lagos
                </Link>
              </li>
              <li>
                <Link href="/destinations/dubai" className="text-foreground/80 hover:text-primary transition-colors">
                  Dubai & UAE
                </Link>
              </li>
              <li>
                <Link href="/destinations/zanzibar" className="text-foreground/80 hover:text-primary transition-colors">
                  Zanzibar & Tanzania
                </Link>
              </li>
              <li>
                <Link href="/destinations/london" className="text-foreground/80 hover:text-primary transition-colors">
                  United Kingdom
                </Link>
              </li>
              <li>
                <Link href="/destinations/rwanda" className="text-foreground/80 hover:text-primary transition-colors">
                  Kigali, Rwanda
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Reassurance Column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Help & Policies
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/about" className="text-foreground/80 hover:text-primary transition-colors">
                  About Alphaa
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-foreground/80 hover:text-primary transition-colors">
                  Contact Abuja Office
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-foreground/80 hover:text-primary transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <a
                  href={getSupportWhatsAppUrl("travel planning")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/80 hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <span>Chat on WhatsApp</span>
                </a>
              </li>
              <li>
                <Link href="/terms" className="text-foreground/80 hover:text-primary transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-foreground/80 hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Alphaa Africa Limited. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Secured by Paystack</span>
            <span>•</span>
            <span>IATA Industry Standards</span>
            <span>•</span>
            <span>Abuja, Nigeria</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
