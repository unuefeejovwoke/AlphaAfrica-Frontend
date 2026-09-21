"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Drawer } from "@base-ui/react/drawer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  WhatsappIcon,
  Call02Icon,
  Mail01Icon,
  Cancel01Icon,
  Clock01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";
import { TrackLink } from "@/components/analytics/track-link";
import {
  company,
  getSupportWhatsAppUrl,
  getEmailHref,
} from "@/lib/content/company";

function getServiceContext(pathname: string): string {
  if (pathname.startsWith("/flights")) return "flight bookings";
  if (pathname.startsWith("/hotels")) return "hotel reservations";
  if (pathname.startsWith("/packages")) return "holiday packages";
  if (pathname.startsWith("/visa")) return "visa assistance";
  if (pathname.startsWith("/car-rentals")) return "car rentals";
  if (pathname.startsWith("/destinations")) return "destination planning";
  if (pathname.startsWith("/checkout")) return "booking checkout";
  return "travel planning";
}

export function AssistedSupportWidget() {
  const pathname = usePathname() || "/";
  const [isOpen, setIsOpen] = React.useState(false);

  const serviceContext = getServiceContext(pathname);
  // Canonical details sourced from lib/content/company.ts
  const whatsappUrl = getSupportWhatsAppUrl(serviceContext);
  const supportPhoneHref = `tel:${company.phone.e164}`;
  const supportEmailHref = getEmailHref(`Assistance with ${serviceContext}`);

  return (
    <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex touch-manipulation items-center gap-2.5 rounded-full border border-foreground/20 bg-background/90 py-2 pr-2 pl-3.5 text-foreground shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/35 hover:bg-background hover:shadow-[0_12px_36px_rgba(0,0,0,0.18)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] dark:border-border/80 dark:hover:border-foreground/20 dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
          aria-expanded={isOpen}
          aria-controls="travel-concierge"
          aria-label="Need Help? Chat with us on WhatsApp"
        >
          <span className="relative flex size-2 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <div className="flex items-center gap-1.5 text-left">
            <span className="text-xs font-semibold tracking-tight text-foreground">
              Need Help?
            </span>
            <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
              Chat on WhatsApp
            </span>
          </div>
          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
            <HugeiconsIcon icon={WhatsappIcon} size={15} aria-hidden="true" />
          </div>
        </button>
      )}

      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/20 backdrop-blur-xs transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 sm:bg-black/10" />
          <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
            <Drawer.Popup id="travel-concierge" className="w-[340px] max-w-[calc(100vw-2rem)] rounded-3xl border border-foreground/20 bg-background/95 p-2 text-foreground shadow-[0_24px_60px_-15px_rgba(0,0,0,0.25)] backdrop-blur-2xl transition-all sm:w-[380px] dark:border-border/70 dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.7)]">
              <Drawer.Content className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/60 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                      <span>WhatsApp Concierge</span>
                    </div>
                    <Drawer.Title className="text-base font-semibold tracking-tight text-foreground">
                      How can we help your journey?
                    </Drawer.Title>
                    <Drawer.Description className="text-xs leading-relaxed text-muted-foreground">
                      Connect with our travel team on WhatsApp for fast help with flights,
                      hotels, holiday packages, or {serviceContext}. We can also prepare custom
                      quotes or arrange a callback.
                    </Drawer.Description>
                  </div>
                  <Drawer.Close
                    aria-label="Close travel concierge widget"
                    className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden="true" />
                  </Drawer.Close>
                </div>

                <div className="flex flex-col gap-2.5">
                  <TrackLink
                    event="support_click"
                    eventProps={{ context: serviceContext, channel: "whatsapp" }}
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex touch-manipulation items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3.5 transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/[0.1] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)]">
                        <HugeiconsIcon icon={WhatsappIcon} size={20} aria-hidden="true" />
                      </div>
                      <div className="flex min-w-0 flex-col text-left">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                            Chat on WhatsApp
                          </span>
                          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-300">
                            Fastest
                          </span>
                        </div>
                        <span className="truncate text-[11px] text-muted-foreground">
                          Instant advice • Request a Callback
                        </span>
                      </div>
                    </div>
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 dark:text-emerald-400">
                      <HugeiconsIcon icon={ArrowUpRight01Icon} size={15} aria-hidden="true" />
                    </div>
                  </TrackLink>

                  <TrackLink
                    event="support_click"
                    eventProps={{ context: serviceContext, channel: "phone" }}
                    href={supportPhoneHref}
                    className="group flex touch-manipulation items-center justify-between rounded-xl border border-border/70 bg-muted/25 p-3.5 transition-all duration-200 hover:border-border hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                        <HugeiconsIcon icon={Call02Icon} size={19} aria-hidden="true" />
                      </div>
                      <div className="flex min-w-0 flex-col text-left">
                        <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                          Call Our Team
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {company.phone.display} • Direct phone line
                        </span>
                      </div>
                    </div>
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
                      <HugeiconsIcon icon={ArrowUpRight01Icon} size={15} aria-hidden="true" />
                    </div>
                  </TrackLink>

                  <TrackLink
                    event="support_click"
                    eventProps={{ context: serviceContext, channel: "email" }}
                    href={supportEmailHref}
                    className="group flex touch-manipulation items-center justify-between rounded-xl border border-border/70 bg-muted/25 p-3.5 transition-all duration-200 hover:border-border hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <HugeiconsIcon icon={Mail01Icon} size={19} aria-hidden="true" />
                      </div>
                      <div className="flex min-w-0 flex-col text-left">
                        <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                          Email Concierge
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {company.email} • Complex or corporate inquiries
                        </span>
                      </div>
                    </div>
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
                      <HugeiconsIcon icon={ArrowUpRight01Icon} size={15} aria-hidden="true" />
                    </div>
                  </TrackLink>
                </div>

                <div className="flex flex-col gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={Clock01Icon}
                      size={13}
                      className="shrink-0 text-muted-foreground/80"
                      aria-hidden="true"
                    />
                    <span>Available Mon – Sat, 8:00 AM – 6:00 PM (WAT)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Chat directly with real travel advisors. We assist with booking
                    confirmations, itinerary design, and travel questions.
                  </p>
                </div>
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
