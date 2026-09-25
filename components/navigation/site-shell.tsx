import * as React from "react"
import { PublicNav } from "@/components/navigation/public-nav"
import { PublicFooter } from "@/components/navigation/public-footer"
import { AssistedSupportWidget } from "@/components/support/assisted-support-widget"

/**
 * Shared public shell: full navigation, floating support entry, and marketing
 * footer. Both route groups render it — `(public)` for discovery and
 * `(checkout)` for booking flows — so the guest never experiences a chrome
 * switch mid-journey (ADR-0001, revised: one shell end-to-end). Checkout pages
 * stay conversion-focused through their own layout, journey header, and the
 * payment step's sticky action bar rather than a separate shell.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground print:hidden"
      >
        Skip to main content
      </a>
      <div className="print:hidden">
        <PublicNav />
      </div>
      <main id="main-content" className="flex-1 print:m-0 print:p-0">
        {children}
      </main>
      <div className="print:hidden">
        <AssistedSupportWidget />
      </div>
      <div className="print:hidden">
        <PublicFooter />
      </div>
    </div>
  )
}
