"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon, Tick01Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  packageEnquirySchema,
  submitPackageEnquiry,
  type PackageEnquiryInput,
  type PackageEnquiryResult,
} from "@/lib/api/packages";
import { ApiError, getHumanErrorMessage } from "@/lib/api/client";
import { getWhatsAppUrl } from "@/lib/content/company";
import { notifyEnquirySent } from "@/lib/toast";
import { track } from "@/lib/analytics";
import { TrackLink } from "@/components/analytics/track-link";

const ENQUIRY_FIELD_NAMES = [
  "full_name",
  "email",
  "phone",
  "preferred_date",
  "num_adults",
  "num_children",
  "message",
] as const;

type EnquiryFieldName = (typeof ENQUIRY_FIELD_NAMES)[number];

function isEnquiryFieldName(name: string): name is EnquiryFieldName {
  return (ENQUIRY_FIELD_NAMES as readonly string[]).includes(name);
}

/**
 * Inline package Enquiry form (RHF + Zod, validated on blur and submit).
 * An Enquiry is a no-payment request — travel specialists follow up.
 * Duplicate submissions are prevented: the submit stays disabled while
 * sending, and a completed Enquiry replaces the form with its reference.
 */
export function PackageEnquiryForm({
  packageSlug,
  packageTitle,
  destinationName,
}: {
  packageSlug: string;
  packageTitle: string;
  destinationName: string;
}) {
  const [result, setResult] = React.useState<PackageEnquiryResult | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  // Guards double-clicks and double-submits after success.
  const submittedReference = React.useRef<string | null>(null);

  // Local (device) date for the `min` attribute — UTC would be a day
  // behind West African time late at night and allow a past date.
  const today = React.useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PackageEnquiryInput>({
    resolver: zodResolver(packageEnquirySchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      preferred_date: "",
      num_adults: 1,
      num_children: 0,
      message: "",
    },
    mode: "onTouched",
    shouldFocusError: true,
  });

  const onSubmit = handleSubmit(async (data) => {
    if (submittedReference.current) return;
    setSubmitError(null);
    try {
      const enquiry = await submitPackageEnquiry(packageSlug, data);
      submittedReference.current = enquiry.reference;
      setResult(enquiry);
      track("package_enquiry_submitted", {
        slug: packageSlug,
        travellers: String(
          enquiry.total_travelers ?? (enquiry.num_adults ?? 0) + (enquiry.num_children ?? 0),
        ),
      });
      notifyEnquirySent(destinationName);
    } catch (error) {
      // Map backend field errors onto the matching inputs (human copy only).
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (isEnquiryFieldName(field) && messages.length > 0) {
            setError(field, { type: "server", message: messages[0] });
          }
        }
      }
      setSubmitError(getHumanErrorMessage(error));
    }
  });

  const sendAnother = React.useCallback(() => {
    submittedReference.current = null;
    setResult(null);
    setSubmitError(null);
    reset();
  }, [reset]);

  if (result) {
    const totalTravellers =
      result.total_travelers ??
      (result.num_adults ?? 0) + (result.num_children ?? 0);
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6"
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <HugeiconsIcon icon={Tick01Icon} size={22} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-foreground">Enquiry received.</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Our travel team will follow up within one business day to plan{" "}
            <span className="font-semibold text-foreground">{result.package_title}</span>{" "}
            with you. No payment was taken.
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200/70 bg-white/70 p-4 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Reference
            </dt>
            <dd className="font-variant-numeric font-bold tabular-nums text-foreground">
              {result.reference}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Package
            </dt>
            <dd className="font-semibold text-foreground">{result.package_title}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Travellers
            </dt>
            <dd className="font-variant-numeric font-semibold tabular-nums text-foreground">
              {totalTravellers} {totalTravellers === 1 ? "traveller" : "travellers"}
            </dd>
          </div>
        </dl>
        <div className="flex flex-col gap-2">
          <Button
            render={
              <TrackLink
                event="support_click"
                eventProps={{ context: "package enquiry follow-up", channel: "whatsapp" }}
                href={getWhatsAppUrl(
                  `Hello Alphaa Africa! I just sent package enquiry ${result.reference} for ${result.package_title} (${totalTravellers} travellers). Please help me plan it.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            className="w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <HugeiconsIcon icon={Message01Icon} size={18} aria-hidden="true" />
            <span>Continue on WhatsApp with this reference</span>
          </Button>
          <button
            type="button"
            onClick={sendAnother}
            className="py-1 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Send another enquiry for this package
          </button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-label={`Enquire about ${packageTitle}`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-foreground">Send an enquiry</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          No payment needed — a specialist replies within one business day.
        </p>
      </div>

      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 p-3.5 text-xs leading-relaxed text-foreground"
        >
          <HugeiconsIcon icon={AlertCircleIcon} size={16} className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
          <span>{submitError}</span>
        </div>
      )}

      <Input
        label="Full name"
        type="text"
        autoComplete="name"
        placeholder="Adaeze Obi"
        error={errors.full_name?.message}
        {...register("full_name")}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Phone / WhatsApp"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          spellCheck={false}
          placeholder="0803 123 4567"
          helperText="Nigerian or international formats accepted."
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>
      <Input
        label="Preferred date (optional)"
        type="date"
        min={today}
        error={errors.preferred_date?.message}
        {...register("preferred_date")}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Adults"
          type="number"
          min={1}
          max={30}
          inputMode="numeric"
          error={errors.num_adults?.message}
          {...register("num_adults", { valueAsNumber: true })}
        />
        <Input
          label="Children"
          type="number"
          min={0}
          max={30}
          inputMode="numeric"
          error={errors.num_children?.message}
          {...register("num_children", { valueAsNumber: true })}
        />
      </div>
      <Textarea
        label="Message (optional)"
        autoComplete="off"
        placeholder="Honeymoon in December, 2 adults, mid-range budget…"
        helperText="Dates, party size, and budget help us reply faster."
        error={errors.message?.message}
        {...register("message")}
      />

      <Button type="submit" isLoading={isSubmitting} className="w-full touch-manipulation justify-center">
        <span>{isSubmitting ? "Sending enquiry…" : "Send enquiry"}</span>
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        By sending, you agree to be contacted about this trip. No account needed.
      </p>
    </form>
  );
}
