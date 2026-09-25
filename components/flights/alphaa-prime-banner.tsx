"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { StarIcon, Cancel01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Button } from "@/components/ui/button"
import { TrackLink } from "@/components/analytics/track-link"
import { getFlightSupportWhatsAppUrl, type FlightTripContext } from "@/lib/api/flights"

export interface AlphaaPrimeBannerProps {
  trip?: FlightTripContext
  className?: string
}

export function AlphaaPrimeBanner({ trip, className }: AlphaaPrimeBannerProps) {
  const [open, setOpen] = React.useState(false)

  const supportUrl = getFlightSupportWhatsAppUrl(
    "learning about Alphaa Prime membership fares",
    trip
  )

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border border-secondary bg-secondary p-4 text-secondary-foreground shadow-xs sm:p-5 ${
          className || ""
        }`}
      >
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-amber-300 uppercase">
            <HugeiconsIcon icon={StarIcon} size={14} className="fill-amber-300" aria-hidden="true" />
            <span>ALPHAA PRIME</span>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-extrabold leading-snug text-white sm:text-base">
              Join Prime and pay member fares on every trip
            </h3>
            <p className="text-xs leading-relaxed text-purple-100">
              Save up to 10% on international & domestic flights with member-only pricing.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setOpen(true)}
            className="mt-1 w-full justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]"
          >
            <span>Join Prime</span>
          </Button>
        </div>
      </div>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs" />
          <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <DialogPrimitive.Popup className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-foreground shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 text-amber-500">
                  <HugeiconsIcon icon={StarIcon} size={20} className="fill-amber-500" aria-hidden="true" />
                  <DialogPrimitive.Title className="text-lg font-bold text-foreground">
                    Alphaa Prime Membership
                  </DialogPrimitive.Title>
                </div>
                <DialogPrimitive.Close
                  aria-label="Close"
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden="true" />
                </DialogPrimitive.Close>
              </div>

              <DialogPrimitive.Description className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Unlock exclusive member airline pricing across all major carriers, waived booking service fees, and priority WhatsApp travel concierge.
              </DialogPrimitive.Description>

              <div className="my-5 space-y-3 rounded-2xl bg-muted/50 p-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600">
                    <HugeiconsIcon icon={Tick01Icon} size={12} aria-hidden="true" />
                  </span>
                  <span>Instant discounts on every ticket (up to ₦60,000 off)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600">
                    <HugeiconsIcon icon={Tick01Icon} size={12} aria-hidden="true" />
                  </span>
                  <span>Zero payment convenience fee on Naira card & bank transfers</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600">
                    <HugeiconsIcon icon={Tick01Icon} size={12} aria-hidden="true" />
                  </span>
                  <span>Dedicated travel specialist on WhatsApp 24/7</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600">
                    <HugeiconsIcon icon={Tick01Icon} size={12} aria-hidden="true" />
                  </span>
                  <span>Free date change assistance & emergency rebooking</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Button
                  render={
                    <TrackLink
                      event="support_click"
                      eventProps={{
                        context: "joining alphaa prime",
                        channel: "whatsapp",
                      }}
                      href={supportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  size="lg"
                  className="w-full justify-center bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
                >
                  <span>Chat with Concierge to Activate</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="w-full justify-center text-xs"
                >
                  <span>Maybe later</span>
                </Button>
              </div>
            </DialogPrimitive.Popup>
          </DialogPrimitive.Viewport>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
