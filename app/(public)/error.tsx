"use client"

import { RouteError, type RouteErrorProps } from "@/components/feedback/route-error"

/** Browse/search segment failures stay on an Alphaa screen (ticket 09). */
export default function PublicRouteError(props: RouteErrorProps) {
  return <RouteError {...props} flow="browse" />
}
