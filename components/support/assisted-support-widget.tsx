"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Drawer } from "@base-ui/react/drawer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message01Icon,
  Call02Icon,
  Cancel01Icon,
  Clock01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrackLink } from "@/components/analytics/track-link";
import { callbackRequestSchema, type CallbackRequest } from "@/lib/schemas/travel";
import { notifyCallbackRequested } from "@/lib/toast";
import { company, getSupportWhatsAppUrl } from "@/lib/content/company";

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

  const serviceContext = getServiceContext(pathname);
  // Single source of truth: numbers come from lib/content/company.ts.
  const whatsappUrl = getSupportWhatsAppUrl(serviceContext);
  const supportPhoneHref = `tel:${company.phone.e164}`;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CallbackRequest>({
    resolver: zodResolver(callbackRequestSchema),
    defaultValues: { customerName: "", customerPhone: "", customerNotes: "" },
    mode: "onTouched",
    shouldFocusError: true,
  });

  const onCallbackSubmit = handleSubmit((data) => {
    void data;
    setCallbackSubmitted(true);
    notifyCallbackRequested();
    window.setTimeout(() => {
      setCallbackSubmitted(false);
      setIsOpen(false);
      reset();
    }, 2500);
  });

  return (
    <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex touch-manipulation items-center gap-2.5 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-colors duration-200 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
          aria-expanded={isOpen}
          aria-label="Open assisted service support drawer"
        >
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none"></span>
            <span className="relative inline-flex size-3 rounded-full bg-white"></span>
          </span>
          <HugeiconsIcon icon={Message01Icon} size={18} aria-hidden="true" />
          <span className="font-medium">Need Help? / WhatsApp</span>
        </button>
      )}

      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Portal>
          <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
            <Drawer.Popup className="w-[340px] rounded-2xl border border-border bg-card p-5 text-foreground overscroll-contain shadow-2xl sm:w-[380px]">
              <Drawer.Content className="flex min-w-0 flex-col gap-0">
                <div className="flex items-start justify-between border-b border-border/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-green-500" aria-hidden="true"></span>
                      <span className="text-xs font-semibold tracking-wider text-green-600 uppercase">
                        Support Desk Online
                      </span>
                    </div>
                    <Drawer.Title className="mt-1 text-base font-bold text-foreground">
                      Speak with a Specialist
                    </Drawer.Title>
                    <Drawer.Description className="text-xs text-muted-foreground">
                      Assisted service for {serviceContext}
                    </Drawer.Description>
                  </div>
                  <Drawer.Close
                    aria-label="Close support dialog"
                    className="rounded-lg p-1.5 touch-manipulation text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
                  </Drawer.Close>
                </div>

                <div className="mt-4 flex min-w-0 flex-col gap-3">
                  <TrackLink
                    event="support_click"
                    eventProps={{ context: serviceContext, channel: "whatsapp" }}
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex touch-manipulation items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-white transition-colors hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-white/20">
                        <HugeiconsIcon icon={Message01Icon} size={20} aria-hidden="true" />
                      </div>
                      <div className="flex min-w-0 flex-col text-left">
                        <span className="truncate text-sm leading-tight font-semibold">
                          Chat on WhatsApp
                        </span>
                        <span className="text-[11px] text-emerald-100">
                          Typical reply in under 5 minutes
                        </span>
                      </div>
                    </div>
                    <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-bold">Fast</span>
                  </TrackLink>

                  <TrackLink
                    event="support_click"
                    eventProps={{ context: serviceContext, channel: "phone" }}
                    href={supportPhoneHref}
                    className="flex touch-manipulation items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <HugeiconsIcon icon={Call02Icon} size={20} aria-hidden="true" />
                    </div>
                    <div className="flex min-w-0 flex-col text-left">
                      <span className="text-sm font-semibold">Call Abuja Office</span>
                      <span className="text-[11px] break-words text-muted-foreground">
                        {company.phone.display}
                      </span>
                    </div>
                  </TrackLink>

                  <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
                    <HugeiconsIcon icon={Clock01Icon} size={14} className="shrink-0" aria-hidden="true" />
                    <span>Abuja Desk: Mon – Sat, 8:00 AM – 6:00 PM (WAT)</span>
                  </div>

                  <div className="mt-2 border-t border-border/80 pt-3">
                    {callbackSubmitted ? (
                      <div
                        role="status"
                        aria-live="polite"
                        className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
                      >
                        <HugeiconsIcon
                          icon={Tick01Icon}
                          size={18}
                          className="shrink-0 text-emerald-600"
                          aria-hidden="true"
                        />
                        <span>Request received! A specialist will contact you shortly.</span>
                      </div>
                    ) : (
                      <form onSubmit={onCallbackSubmit} noValidate className="flex flex-col gap-2.5">
                        <span className="text-xs font-semibold text-foreground">
                          Or Request a Callback
                        </span>
                        <Input
                          label="Your Name"
                          type="text"
                          autoComplete="name"
                          placeholder="Adaeze Obi…"
                          error={errors.customerName?.message}
                          {...register("customerName")}
                        />
                        <Input
                          label="WhatsApp / Phone Number"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          spellCheck={false}
                          placeholder={`${company.phone.display}…`}
                          error={errors.customerPhone?.message}
                          {...register("customerPhone")}
                        />
                        <Input
                          label="Brief Details (Optional)"
                          type="text"
                          autoComplete="off"
                          placeholder="2 travellers to London in July…"
                          error={errors.customerNotes?.message}
                          {...register("customerNotes")}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          isLoading={isSubmitting}
                          className="w-full touch-manipulation text-xs"
                        >
                          Request a Callback
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
