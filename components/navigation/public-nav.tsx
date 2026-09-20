"use client";

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Cancel01Icon,
  Airplane01Icon,
  Building01Icon,
  Luggage01Icon,
  Passport01Icon,
  Car01Icon,
  Location01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

const NAV_SERVICES = [
  { title: "Flights", href: "/flights", icon: Airplane01Icon },
  { title: "Hotels", href: "/hotels", icon: Building01Icon },
  { title: "Packages", href: "/packages", icon: Luggage01Icon },
  { title: "Visa Assistance", href: "/visa", icon: Passport01Icon },
  { title: "Car Rentals", href: "/car-rentals", icon: Car01Icon },
  { title: "Destinations", href: "/destinations", icon: Location01Icon },
];

export function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Emblem */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-sm transition-transform group-hover:scale-105">
            <span className="font-serif text-2xl font-bold tracking-tight text-white">α</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-foreground">
              Alphaa <span className="text-primary font-medium">Africa</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Travel & Concierge
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {NAV_SERVICES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={item.icon} size={16} className="text-muted-foreground" />
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <HugeiconsIcon icon={UserIcon} size={16} />
            <span>Log in</span>
          </Link>
          <Button render={<Link href="/book" />} size="default" className="shadow-sm">
            Book a Trip
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex lg:hidden items-center gap-2">
          <Button render={<Link href="/book" />} size="sm" className="text-xs">
            Book
          </Button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <HugeiconsIcon icon={mobileMenuOpen ? Cancel01Icon : Menu01Icon} size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-background px-4 py-6 shadow-xl animate-in slide-in-from-top-2">
          <div className="flex flex-col gap-2">
            <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Services
            </div>
            {NAV_SERVICES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted transition-colors"
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-primary">
                  <HugeiconsIcon icon={item.icon} size={18} />
                </div>
                <span>{item.title}</span>
              </Link>
            ))}

            <div className="mt-4 border-t border-border pt-4 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                <HugeiconsIcon icon={UserIcon} size={18} />
                <span>Log in to your account</span>
              </Link>
              <Button
                render={<Link href="/book" onClick={() => setMobileMenuOpen(false)} />}
                size="lg"
                className="w-full justify-center"
              >
                Book a Trip
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
