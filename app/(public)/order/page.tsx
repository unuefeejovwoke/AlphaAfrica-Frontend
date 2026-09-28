import * as React from "react"
import type { Metadata } from "next"
import { OrderClient } from "@/components/orders/order-client"
import { Skeleton } from "@/components/ui/skeleton"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Order confirmation | Alphaa Africa",
  description:
    "Verify your payment and view your booking confirmation. Returning here does not mean the payment succeeded.",
  alternates: { canonical: canonicalUrl("/order") },
  robots: { index: false, follow: false },
}

function OrderFallback() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16 sm:px-6">
      <Skeleton className="h-8 w-64 rounded-xl" />
      <Skeleton className="h-4 w-96 rounded-lg" />
      <Skeleton className="mt-4 h-64 w-full rounded-[2rem]" />
    </div>
  )
}

/**
 * `/order?reference=…&email=…&token=…` (static shell, never indexed): the
 * universal Paystack return target from confirmation emails (guide §12).
 * Renders nothing conclusive on the server — the client verifies the live
 * order and routes each booking type to its confirmation UI.
 */
export default function OrderPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6">
      <React.Suspense fallback={<OrderFallback />}>
        <OrderClient />
      </React.Suspense>
    </div>
  )
}
