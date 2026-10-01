"use client"

import { RouteError, type RouteErrorProps } from "@/components/feedback/route-error"

/** Booking/checkout segment failures stay on an Alphaa screen (ticket 09). */
export default function CheckoutRouteError(props: RouteErrorProps) {
  return <RouteError {...props} flow="booking" />
}
