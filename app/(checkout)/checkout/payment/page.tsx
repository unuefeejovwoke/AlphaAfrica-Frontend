import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout | Alphaa Africa",
  description:
    "Traveller details, trip summary, and payment now happen in one step on secure checkout.",
  robots: {
    index: false,
    follow: false,
  },
}

/**
 * Payment merged into `/checkout` (single-page checkout), so the dedicated
 * payment route is retired. Old links, bookmarks, and back/forward history
 * land on the live checkout instead of a dead end.
 */
export default function CheckoutPaymentPage() {
  redirect("/checkout")
}
