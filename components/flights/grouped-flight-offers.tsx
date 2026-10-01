"use client"

import * as React from "react"
import type { FlightOfferDisplay } from "@/lib/api/flights"
import {
  groupOffersByAirline,
} from "@/lib/api/flight-groups"
import { FlightOfferCard } from "@/components/flights/flight-offer-card"

export interface GroupedFlightOffersProps {
  visible: FlightOfferDisplay[]
  badgeIds: { cheapest: Set<string>; fastest: Set<string> }
  onSelect: (offer: FlightOfferDisplay) => void
}

/**
 * Off-screen rendering skip (ticket 22), matching the Hotel and Vehicle
 * grids: a long results list stops paying layout/paint cost for cards the
 * guest has not scrolled to. `contain-intrinsic-size` is the placeholder
 * estimate so the scrollbar stays honest before a card renders.
 */
const CARD_SKIP =
  "[content-visibility:auto] [contain-intrinsic-size:auto_320px]"

/**
 * One representative card per airline with an inline expand for the rest.
 * Each airline expands independently; other airlines stay at one card.
 * A single airline needs no grouping — every flight renders flat.
 */
export function GroupedFlightOffers({
  visible,
  badgeIds,
  onSelect,
}: GroupedFlightOffersProps) {
  const groups = React.useMemo(
    () => groupOffersByAirline(visible),
    [visible]
  )
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )

  const toggle = React.useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  // Flat list when grouping adds nothing (single airline).
  if (groups.length <= 1) {
    return (
      <>
        {visible.map((display) => (
          <FlightOfferCard
            key={display.id}
            offer={display}
            onSelect={onSelect}
            isCheapest={badgeIds.cheapest.has(display.id)}
            isFastest={badgeIds.fastest.has(display.id)}
            className={CARD_SKIP}
          />
        ))}
      </>
    )
  }

  return (
    <>
      {groups.map((group) => {
        const [representative, ...rest] = group.offers
        if (!representative) return null
        const isExpanded = expanded.has(group.key)
        return (
          <div
            key={group.key}
            role="group"
            aria-label={`${group.airline} flights`}
            className="flex flex-col gap-4"
          >
            <FlightOfferCard
              offer={representative}
              onSelect={onSelect}
              isCheapest={badgeIds.cheapest.has(representative.id)}
              isFastest={badgeIds.fastest.has(representative.id)}
              relatedFlightCount={group.offers.length}
              relatedExpanded={isExpanded}
              onViewRelated={() => toggle(group.key)}
              className={CARD_SKIP}
            />
            {isExpanded ? (
              <div className="flex flex-col gap-4 border-l-2 border-primary/20 pl-3 sm:ml-2">
                {rest.map((display) => (
                  <FlightOfferCard
                    key={display.id}
                    offer={display}
                    onSelect={onSelect}
                    isCheapest={badgeIds.cheapest.has(display.id)}
                    isFastest={badgeIds.fastest.has(display.id)}
                    className={CARD_SKIP}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
