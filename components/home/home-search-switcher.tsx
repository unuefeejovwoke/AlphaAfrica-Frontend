"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Building01Icon,
  Luggage01Icon,
  Passport01Icon,
  Car01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons"
import { HomeFlightSearch } from "@/components/home/home-flight-search"
import { ActiveIndicator } from "@/components/motion/active-indicator"
import { MOTION_SPRINGS } from "@/lib/motion/springs"

/** Only Flights renders in place; every other tab links to its live route. */
type InteractiveTabId = "flights"

interface TabItem {
  id: string
  label: string
  icon: typeof Airplane01Icon
  href?: string
}

const TABS: TabItem[] = [
  { id: "flights", label: "Flights", icon: Airplane01Icon },
  { id: "hotels", label: "Hotels", icon: Building01Icon, href: "/hotels" },
  { id: "cars", label: "Car Rentals", icon: Car01Icon, href: "/cars" },
  { id: "packages", label: "Packages", icon: Luggage01Icon, href: "/packages" },
  { id: "visa", label: "Visa Assistance", icon: Passport01Icon, href: "/visa" },
]

/**
 * Search switcher with Apple-style segmented tabs.
 * Flights renders the compact self-service search in place; Hotels, Car
 * Rentals, Packages, and Visa Assistance link directly to their live pages.
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
      {/* Five services never fit one 390px row. Three-up over two rows on
          mobile, five-up from sm: every service stays visible and evenly
          sized — no horizontal scroll to reach the last two. */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-border/50 bg-muted/70 p-1 sm:grid-cols-5 sm:p-1.5">
        {/* Tablist owns only the interactive tabs; links are siblings.
            `contents` lets its button join the grid instead of nesting a
            second track inside one cell. */}
        <div role="tablist" aria-label="Travel services" className="contents">
          {interactiveTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <motion.button
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
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.01 }}
                transition={MOTION_SPRINGS.tactile}
                className={`relative flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center text-[11px] leading-tight font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 sm:text-left sm:text-sm ${
                  isActive
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                }`}
              >
                {isActive ? (
                  <ActiveIndicator
                    layoutId="search-switcher-pill"
                    transition={MOTION_SPRINGS.layout}
                  />
                ) : null}
                <HugeiconsIcon
                  icon={tab.icon}
                  size={17}
                  aria-hidden="true"
                  className={
                    isActive
                      ? "relative z-10 shrink-0 text-primary"
                      : "relative z-10 shrink-0 text-muted-foreground"
                  }
                />
                <span className="relative z-10 min-w-0">{tab.label}</span>
              </motion.button>
            )
          })}
        </div>

        {linkTabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href ?? "#"}
            className="group flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center text-[11px] leading-tight font-medium text-muted-foreground transition-all hover:bg-card/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98] sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 sm:text-left sm:text-sm"
          >
            <HugeiconsIcon
              icon={tab.icon}
              size={17}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            />
            <span className="min-w-0">{tab.label}</span>
            <HugeiconsIcon
              icon={ArrowUpRight01Icon}
              size={13}
              aria-hidden="true"
              className="hidden shrink-0 opacity-50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 sm:block"
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
          <HomeFlightSearch />
        </div>
      </div>
    </div>
  )
}
