import * as React from "react"
import type { Metadata } from "next"
import { OrdersClient } from "@/components/orders/orders-client"
import { Skeleton } from "@/components/ui/skeleton"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "My orders | Alphaa Africa",
  description:
    "View all your Alphaa Africa bookings from your confirmation email link.",
  alternates: { canonical: canonicalUrl("/orders") },
  robots: { index: false, follow: false },
}

function OrdersFallback() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16 sm:px-6">
      <Skeleton className="h-8 w-64 rounded-xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  )
}

/**
 * `/orders?email=…&token=…` (static shell, never indexed): "View All My
 * Orders" from confirmation emails (guide §12). Guest access rides the
 * email + secure token; nothing conclusive renders on the server.
 */
export default function OrdersPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6">
      <React.Suspense fallback={<OrdersFallback />}>
        <OrdersClient />
      </React.Suspense>
    </div>
  )
}
