"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message01Icon,
  Call02Icon,
  Cancel01Icon,
  Clock01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

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
  const [callbackSubmitted, setCallbackSubmitted] = React.useState(false);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customerNotes, setCustomerNotes] = React.useState("");

  const serviceContext = getServiceContext(pathname);
  const whatsappNumber = "2348000000000";
  const supportPhone = "+2348000000000";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hello Alphaa Africa! I need assistance with ${serviceContext}.`
  )}`;

  // Handle escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleCallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone) return;
    setCallbackSubmitted(true);
    setTimeout(() => {
      setCallbackSubmitted(false);
      setIsOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerNotes("");
    }, 2500);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200"
          aria-expanded={isOpen}
          aria-label="Open assisted service support drawer"
        >
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex size-3 rounded-full bg-white"></span>
          </span>
          <HugeiconsIcon icon={Message01Icon} size={18} />
          <span className="font-medium">Need Help? / WhatsApp</span>
        </button>
      )}

      {/* Support Drawer / Popover Modal */}
      {isOpen && (
        <div className="w-[340px] sm:w-[380px] rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-green-500"></span>
                <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">
                  Support Desk Online
                </span>
              </div>
              <h3 className="mt-1 font-bold text-base text-foreground">Speak with a Specialist</h3>
              <p className="text-xs text-muted-foreground">
                Assisted service for {serviceContext}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close support dialog"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
            </button>
          </div>

          {/* Channels */}
          <div className="mt-4 flex flex-col gap-3">
            {/* Primary Channel: WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-white/20">
                  <HugeiconsIcon icon={Message01Icon} size={20} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold leading-tight">Chat on WhatsApp</span>
                  <span className="text-[11px] text-emerald-100">Typical reply in under 5 minutes</span>
                </div>
              </div>
              <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">Fast</span>
            </a>

            {/* Direct Call */}
            <a
              href={`tel:${supportPhone}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-foreground hover:bg-muted transition-colors"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HugeiconsIcon icon={Call02Icon} size={20} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold">Call Abuja Office</span>
                <span className="text-[11px] text-muted-foreground">+234 800 000 0000</span>
              </div>
            </a>

            {/* Office Hours Info */}
            <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
              <HugeiconsIcon icon={Clock01Icon} size={14} className="shrink-0" />
              <span>Abuja Desk: Mon – Sat, 8:00 AM – 6:00 PM (WAT)</span>
            </div>

            {/* Request Callback Form */}
            <div className="mt-2 border-t border-border/80 pt-3">
              {callbackSubmitted ? (
                <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                  <HugeiconsIcon icon={Tick01Icon} size={18} className="text-emerald-600 shrink-0" />
                  <span>Request received! A specialist will contact you shortly.</span>
                </div>
              ) : (
                <form onSubmit={handleCallbackSubmit} className="flex flex-col gap-2.5">
                  <span className="text-xs font-semibold text-foreground">
                    Or Request a Callback
                  </span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your Name"
                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="WhatsApp / Phone Number"
                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  />
                  <input
                    type="text"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Brief details (e.g. 2 adults to London in July)"
                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <Button type="submit" size="sm" variant="secondary" className="w-full text-xs">
                    Request a Callback
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
