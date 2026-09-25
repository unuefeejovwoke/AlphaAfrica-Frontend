"use client"

import * as React from "react"
import {
  parseDurationMinutes,
  parseNairaAmount,
} from "@/lib/api/flight-filters"
import type { FlightOfferDisplay } from "@/lib/api/flights"

export interface ComparisonBadges {
  cheapest: Set<string>
  fastest: Set<string>
}

/**
 * Comparison badges over the visible set: cheapest (lowest parseable NGN)
 * and fastest (shortest parseable duration). Unknown values never badge;
 * ties share the badge. Memoized so lists stay cheap per render.
 */
export function useComparisonBadges(
  visible: FlightOfferDisplay[]
): ComparisonBadges {
  return React.useMemo(() => {
    let minPrice: number | null = null
    let minDuration: number | null = null
    for (const display of visible) {
      const price = parseNairaAmount(display.price)
      if (price !== null && (minPrice === null || price < minPrice)) {
        minPrice = price
      }
      const minutes = parseDurationMinutes(display.duration)
      if (minutes !== null && (minDuration === null || minutes < minDuration)) {
        minDuration = minutes
      }
    }
    const cheapest = new Set<string>()
    const fastest = new Set<string>()
    for (const display of visible) {
      if (minPrice !== null && parseNairaAmount(display.price) === minPrice) {
        cheapest.add(display.id)
      }
      if (
        minDuration !== null &&
        parseDurationMinutes(display.duration) === minDuration
      ) {
        fastest.add(display.id)
      }
    }
    return { cheapest, fastest }
  }, [visible])
}
