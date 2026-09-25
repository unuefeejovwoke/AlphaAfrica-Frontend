import * as React from "react"
import { SiteShell } from "@/components/navigation/site-shell"

/**
 * Booking flows share the public shell so the interface never changes between
 * results and checkout (ADR-0001, revised). Progress and trust are carried by
 * the per-page `FlightJourneyHeader` and the payment step's summary card
 * instead of a separate distraction-free chrome.
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SiteShell>{children}</SiteShell>
}
