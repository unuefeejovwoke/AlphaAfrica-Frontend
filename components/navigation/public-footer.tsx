import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Call02Icon,
  Mail01Icon,
  Location01Icon,
  SecurityCheckIcon,
  Airplane01Icon,
} from "@hugeicons/core-free-icons";

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
              <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-sm">
                <span className="font-serif text-2xl font-bold tracking-tight text-white">α</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Alphaa <span className="text-primary font-medium">Africa</span>
              </span>
            </Link>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Alphaa Africa is an Abuja-based travel concierge and assisted-service platform. We combine modern self-service travel booking with dedicated human specialists to make every journey easier, clearer, and less stressful.
            </p>

            {/* Office Details */}
            <div className="mt-2 flex flex-col gap-2.5 text-xs text-foreground/80">
              <div className="flex items-start gap-2.5">
                <HugeiconsIcon icon={Location01Icon} size={16} className="text-primary shrink-0 mt-0.5" />
                <span>
                  Suite B4, Statement Hotel Building, Plot 1002 1st Avenue, Off Shehu Shagari Way, Central Business District, Abuja, Nigeria.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <HugeiconsIcon icon={Call02Icon} size={16} className="text-primary shrink-0" />
                <a href="tel:+2348000000000" className="hover:text-primary transition-colors">
                  +234 800 000 0000 / +234 9 292 0000
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <HugeiconsIcon icon={Mail01Icon} size={16} className="text-primary shrink-0" />
                <a href="mailto:support@alphaaafrica.com" className="hover:text-primary transition-colors">
                  support@alphaaafrica.com
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
                <a
                  href="https://wa.me/2348000000000"
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
