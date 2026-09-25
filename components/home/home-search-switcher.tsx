"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Building01Icon,
  Luggage01Icon,
  Passport01Icon,
  Car01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons"
import { ComingSoonHatch } from "@/components/home/coming-soon-hatch"
import { HomeFlightSearch } from "@/components/home/home-flight-search"

type InteractiveTabId = "flights" | "hotels" | "cars"

interface TabItem {
  id: string
  label: string
  icon: typeof Airplane01Icon
  href?: string
}

const TABS: TabItem[] = [
  { id: "flights", label: "Flights", icon: Airplane01Icon },
  { id: "hotels", label: "Hotels", icon: Building01Icon },
  { id: "cars", label: "Car Rentals", icon: Car01Icon },
  { id: "packages", label: "Packages", icon: Luggage01Icon, href: "/packages" },
  { id: "visa", label: "Visa Assistance", icon: Passport01Icon, href: "/visa" },
]

const COMING_SOON: Record<
  Exclude<InteractiveTabId, "flights">,
  { service: string; context: string; blurb: string }
> = {
  hotels: {
    service: "Hotel reservations",
    context: "hotel reservations",
    blurb:
      "Self-service hotel search lands in Phase 4. Until then, share your city and dates and we will confirm availability and rates.",
  },
  cars: {
    service: "Car rentals",
    context: "car rentals",
    blurb:
      "Self-service vehicle booking lands in Phase 5. Until then, share pickup, hours, and traveller count for an instant quote.",
  },
}

/**
 * Interactive search switcher with Apple-style segmented tabs.
 * Flights renders the compact self-service search; Hotels and Car Rentals
 * switch assisted service previews until their self-service phases land.
 * Packages and Visa Assistance link directly to their dedicated pages.
 */
export function HomeSearchSwitcher() {
  const [activeTab, setActiveTab] = React.useState<InteractiveTabId>("flights")
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})

  const interactiveTabs = React.useMemo(
    () => TABS.filter((t): t is TabItem & { id: InteractiveTabId } => !t.href),
    []
  )
  const linkTabs = React.useMemo(() => TABS.filter((t) => t.href), [])

  const onKeyDown = (event: React.KeyboardEvent, id: InteractiveTabId) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
    event.preventDefault()
    const ids = interactiveTabs.map((tab) => tab.id)
    const index = ids.indexOf(id)
    const next =
      event.key === "ArrowRight"
        ? ids[(index + 1) % ids.length]
        : ids[(index - 1 + ids.length) % ids.length]
    setActiveTab(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="w-full rounded-3xl border border-border/80 bg-card/95 p-4 shadow-xl shadow-black/[0.04] backdrop-blur-xl sm:p-6 md:p-7">
      <div className="inline-flex max-w-full scrollbar-none items-center gap-1 overflow-x-auto rounded-2xl border border-border/50 bg-muted/70 p-1 sm:gap-1.5 sm:p-1.5 dark:bg-muted/40">
        {/* Tablist owns only the interactive tabs; links are siblings. */}
        <div
          role="tablist"
          aria-label="Travel services"
          className="flex items-center gap-1 sm:gap-1.5"
        >
          {interactiveTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[tab.id] = node
                }}
                type="button"
                role="tab"
                id={`search-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`search-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => onKeyDown(event, tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-4 sm:text-sm ${
                  isActive
                    ? "bg-card font-semibold text-foreground shadow-xs ring-1 ring-border/80"
                    : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                }`}
              >
                <HugeiconsIcon
                  icon={tab.icon}
                  size={17}
                  aria-hidden="true"
                  className={
                    isActive
                      ? "shrink-0 text-primary"
                      : "shrink-0 text-muted-foreground"
                  }
                />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {linkTabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href ?? "#"}
            className="group inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-card/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-4 sm:text-sm"
          >
            <HugeiconsIcon
              icon={tab.icon}
              size={17}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            />
            <span>{tab.label}</span>
            <HugeiconsIcon
              icon={ArrowUpRight01Icon}
              size={13}
              aria-hidden="true"
              className="shrink-0 opacity-50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
            />
          </Link>
        ))}
      </div>

      <div className="pt-5 sm:pt-6">
        <div
          role="tabpanel"
          id={`search-panel-${activeTab}`}
          aria-labelledby={`search-tab-${activeTab}`}
        >
          {activeTab === "flights" ? (
            <HomeFlightSearch />
          ) : (
            <ComingSoonHatch
              service={COMING_SOON[activeTab].service}
              whatsappContext={COMING_SOON[activeTab].context}
              blurb={COMING_SOON[activeTab].blurb}
            />
          )}
        </div>
      </div>
    </div>
  )
}
