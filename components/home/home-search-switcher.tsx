"use client";

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Airplane01Icon,
  Building01Icon,
  Luggage01Icon,
  Passport01Icon,
  Car01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ComingSoonHatch } from "@/components/home/coming-soon-hatch";

const TABS = [
  { id: "flights", label: "Flights", icon: Airplane01Icon },
  { id: "hotels", label: "Hotels", icon: Building01Icon },
  { id: "packages", label: "Packages", icon: Luggage01Icon },
  { id: "visa", label: "Visa Assistance", icon: Passport01Icon },
  { id: "cars", label: "Car Rentals", icon: Car01Icon },
] as const;

type TabId = (typeof TABS)[number]["id"];

const COMING_SOON: Record<string, { service: string; context: string; blurb: string }> = {
  flights: {
    service: "Flight bookings",
    context: "flight bookings",
    blurb:
      "Self-service flight search lands in Phase 3. Until then, tell us your route and dates and a specialist will price options for you today.",
  },
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
};

/**
 * Interactive search switcher. Tabs whose booking flows are not built yet
 * (flights/hotels/cars) render a coming-soon support hatch — never a link
 * to an unbuilt route. Packages/visa continue to their listing pages.
 */
export function HomeSearchSwitcher() {
  const [activeTab, setActiveTab] = React.useState<TabId>("flights");
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (event: React.KeyboardEvent, id: TabId) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const ids = TABS.map((tab) => tab.id);
    const index = ids.indexOf(id);
    const next =
      event.key === "ArrowRight" ? ids[(index + 1) % ids.length] : ids[(index - 1 + ids.length) % ids.length];
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  };

  const comingSoon = COMING_SOON[activeTab];

  return (
    <div className="mt-12 rounded-2xl border border-border bg-card p-4 sm:p-6 w-full">
      <div role="tablist" aria-label="Travel services" className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-border/80">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`search-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`search-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => onKeyDown(event, tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <HugeiconsIcon icon={tab.icon} size={18} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="pt-6">
        {comingSoon ? (
          <div
            role="tabpanel"
            id={`search-panel-${activeTab}`}
            aria-labelledby={`search-tab-${activeTab}`}
          >
            <ComingSoonHatch
              service={comingSoon.service}
              whatsappContext={comingSoon.context}
              blurb={comingSoon.blurb}
            />
          </div>
        ) : (
          <div
            role="tabpanel"
            id={`search-panel-${activeTab}`}
            aria-labelledby={`search-tab-${activeTab}`}
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {activeTab === "packages"
                ? "Browse curated itineraries with duration, from-price per person, and inclusions — then send a no-payment Enquiry and a specialist plans with you."
                : "Browse assisted countries with consultation fees and processing times — then start a Visa Consultation with secure Paystack payment."}
            </p>
            <div>
              <Button
                render={<Link href={activeTab === "packages" ? "/packages" : "/visa"} />}
                size="lg"
                className="shrink-0"
              >
                <span>Continue to {activeTab === "packages" ? "Packages" : "Visa Help"}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
