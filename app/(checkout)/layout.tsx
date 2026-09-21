import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Call02Icon, SecurityCheckIcon } from "@hugeicons/core-free-icons";
import { company } from "@/lib/content/company";

const CHECKOUT_STEPS = [
  { label: "Traveller Details", current: true },
  { label: "Payment", current: false },
  { label: "Confirmed", current: false },
] as const;

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#checkout-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to checkout
      </a>

      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            aria-label="Alphaa Africa home"
            className="flex touch-manipulation items-center gap-2.5 rounded-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-card p-1"
            >
              <Image
                src="/android-chrome-192x192.png"
                alt="Alphaa Africa Logo"
                width={30}
                height={30}
                className="size-7 object-contain"
                priority
              />
            </span>
            <span className="flex flex-col leading-tight">
              <span translate="no" className="text-base font-bold tracking-tight text-foreground">
                Alphaa <span className="font-medium text-primary">Africa</span>
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                Secure Checkout
              </span>
            </span>
          </Link>

          <nav aria-label="Booking progress" className="hidden md:block">
            <ol className="flex min-w-0 items-center gap-2">
              {CHECKOUT_STEPS.map((step, index) => (
                <li key={step.label} className="flex min-w-0 items-center gap-2">
                  {index > 0 && (
                    <span aria-hidden="true" className="h-px w-6 bg-border" />
                  )}
                  <span
                    aria-current={step.current ? "step" : undefined}
                    className={
                      step.current
                        ? "flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                        : "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
                    }
                  >
                    <span className="font-variant-numeric tabular-nums">{index + 1}</span>
                    <span className="truncate">{step.label}</span>
                  </span>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground sm:flex">
              <HugeiconsIcon icon={SecurityCheckIcon} size={14} aria-hidden="true" className="text-emerald-600" />
              <span>
                256-bit Encrypted · <span translate="no">Paystack</span> Secured
              </span>
            </span>
            <a
              href={`tel:${company.phone.e164}`}
              className="flex touch-manipulation items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <HugeiconsIcon icon={Call02Icon} size={16} aria-hidden="true" />
              <span className="hidden lg:inline">Emergency Help:</span>
              <span className="font-variant-numeric tabular-nums">{company.phone.display}</span>
            </a>
          </div>
        </div>

        <div className="border-t border-border/60 md:hidden">
          <ol className="mx-auto flex max-w-5xl items-center gap-1.5 overflow-x-hidden px-4 py-2">
            {CHECKOUT_STEPS.map((step, index) => (
              <li key={step.label} className="flex min-w-0 flex-1 items-center">
                <span
                  aria-current={step.current ? "step" : undefined}
                  className={
                    step.current
                      ? "w-full truncate rounded-full bg-primary/10 px-2.5 py-1 text-center text-[11px] font-semibold text-primary"
                      : "w-full truncate rounded-full px-2.5 py-1 text-center text-[11px] font-medium text-muted-foreground"
                  }
                >
                  <span className="font-variant-numeric tabular-nums">{index + 1}. </span>
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main id="checkout-main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-[11px] text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
          <p className="min-w-0 break-words">
            Guest Booking — no account needed. Your details stay encrypted during checkout…
          </p>
          <p className="flex shrink-0 items-center gap-4">
            <span>
              Secured by <span translate="no">Paystack</span>
            </span>
            <span aria-hidden="true">•</span>
            <span>Abuja, Nigeria</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
