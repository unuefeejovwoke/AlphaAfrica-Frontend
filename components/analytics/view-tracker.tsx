"use client"

import { useEffect } from "react"
import {
  track,
  type AnalyticsEvent,
  type AnalyticsProps,
} from "@/lib/analytics"

/**
 * Fire-and-forget view event for RSC pages (package viewed, visa country
 * viewed, confirmation viewed). Props are sanitized by `track()` — never
 * pass passport, payment, or token material here.
 */
export function ViewTracker({
  event,
  props,
}: {
  event: AnalyticsEvent
  props?: AnalyticsProps
}) {
  const serialized = JSON.stringify(props ?? {})
  useEffect(() => {
    track(event, JSON.parse(serialized) as AnalyticsProps)
    // Serialized once per mount — view events fire exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, serialized])
  return null
}
