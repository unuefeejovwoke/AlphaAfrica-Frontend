import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Fare Confirmation | Alphaa Africa",
  description:
    "Fare confirmation now happens on the flight results page, where the live airline fare is rechecked before traveller details.",
  robots: {
    index: false,
    follow: false,
  },
}

/**
 * Fare confirmation moved into the results-page modal (Wakanow-style), so the
 * dedicated route is retired. Old links and bookmarks land back on a fresh
 * search rather than a dead end.
 */
export default function ConfirmFlightPage() {
  redirect("/flights")
}
