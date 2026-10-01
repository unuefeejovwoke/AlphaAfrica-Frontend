"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Message01Icon,
  Tick01Icon,
  AlertCircleIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { Button, ButtonLink, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CardSkeleton } from "@/components/ui/skeleton"
import { verifyVisaPayment, type VisaApplication } from "@/lib/api/visa"
import {
  emitVerificationEventOnce,
  fetchOrderWithSettleRetry,
  isPaidOrder,
  resolveBookingOutcome,
  type VerificationOutcome,
} from "@/lib/api/verification"
import type { PaymentOrder } from "@/lib/api/payments"
import { getHumanErrorMessage, getPaymentSafetyCopy } from "@/lib/api/client"
import { formatNaira } from "@/lib/format"
import { getSupportWhatsAppUrl, getWhatsAppUrl } from "@/lib/content/company"
import { TrackLink } from "@/components/analytics/track-link"

type VerifyState =
  | { kind: "verifying" }
  | {
      kind: "verified"
      application: VisaApplication
      order: PaymentOrder | null
    }
  | {
      kind: "unresolved"
      application: VisaApplication
      order: PaymentOrder | null
    }
  | { kind: "failed"; message: string }

/**
 * Paystack return handler for Visa Consultations. A return from payment
 * proves nothing by itself: this client fetches the live verification and
 * then the final order before rendering any outcome (PRD §13). Guests are
 * welcome — verification needs only the reference.
 */
export function VisaVerifyClient({ reference }: { reference: string }) {
  const [state, setState] = React.useState<VerifyState>({ kind: "verifying" })
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setState({ kind: "verifying" })
      try {
        const application = await verifyVisaPayment(reference)
        // The visa verification is authoritative for the consultation, but
        // the universal order is the final word on money movement — fetch
        // it too, tolerating its absence. The shared seam retries once while
        // the payment settles and reads the authoritative `payment_status`
        // field (legacy `status` is only a fallback), so a paid order can
        // never render as unpaid.
        let order: PaymentOrder | null = null
        try {
          order = await fetchOrderWithSettleRetry(reference)
        } catch {
          order = null
        }
        if (cancelled) return
        const outcome: VerificationOutcome = resolveBookingOutcome(
          "visa",
          application.status
        )
        const paid = isPaidOrder(order) || outcome === "confirmed"
        if (paid) {
          emitVerificationEventOnce(
            `${reference}::visa_payment_completed`,
            "visa_payment_completed",
            { applicants: String(application.num_applicants ?? 1) }
          )
          emitVerificationEventOnce(
            `${reference}::visa_confirmation_viewed`,
            "booking_confirmation_viewed",
            { type: "visa" }
          )
          setState({ kind: "verified", application, order })
        } else {
          setState({ kind: "unresolved", application, order })
        }
      } catch (error) {
        if (cancelled) return
        setState({ kind: "failed", message: getHumanErrorMessage(error) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reference, attempt])

  if (state.kind === "verifying") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HugeiconsIcon
              icon={Clock01Icon}
              size={24}
              className="animate-pulse"
              aria-hidden="true"
            />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            We&apos;re confirming your payment.
          </h1>
          <p
            className="max-w-md text-sm leading-relaxed text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Checking reference{" "}
            <span className="font-variant-numeric font-semibold tabular-nums">
              {reference}
            </span>{" "}
            with Paystack. Do not close this page yet.
          </p>
        </div>
        <CardSkeleton />
      </div>
    )
  }

  if (state.kind === "verified") {
    const { application } = state
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <HugeiconsIcon icon={Tick01Icon} size={22} aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Payment verified — consultation received.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A specialist will contact you shortly about your{" "}
              {application.country_name} visa consultation. Keep your reference
              safe.
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200/70 bg-white/70 p-4 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Reference
              </dt>
              <dd className="font-variant-numeric font-bold break-all text-foreground tabular-nums">
                {application.reference}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Status
              </dt>
              <dd className="font-semibold text-foreground">
                {application.status}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Fee paid
              </dt>
              <dd className="font-semibold text-foreground">
                {formatNaira(application.consultation_fee)}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2">
            <TrackLink
              event="support_click"
              eventProps={{
                context: "verified visa consultation",
                channel: "whatsapp",
              }}
              href={getWhatsAppUrl(
                `Hello Alphaa Africa! My ${application.country_name} visa consultation ${application.reference} is verified. Please guide me on next steps.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants(),
                "w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              <HugeiconsIcon
                icon={Message01Icon}
                size={18}
                aria-hidden="true"
              />
              <span>Continue on WhatsApp with this reference</span>
            </TrackLink>
            <ButtonLink
              href="/visa"
              variant="outline"
              className="w-full justify-center"
            >
              <span>Browse other visa countries</span>
            </ButtonLink>
          </div>
        </div>
      </div>
    )
  }

  const application = state.kind === "unresolved" ? state.application : null
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
      <div
        role="alert"
        className="flex flex-col gap-4 rounded-2xl border border-destructive/25 bg-card p-6 sm:p-8"
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <HugeiconsIcon icon={AlertCircleIcon} size={22} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Your consultation wasn&apos;t completed.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {state.kind === "failed"
              ? state.message
              : "We checked with Paystack and this payment is not complete yet. It may still be processing — wait a moment and check again."}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {getPaymentSafetyCopy()}
          </p>
          {application && (
            <p className="font-variant-numeric mt-1 text-xs text-muted-foreground tabular-nums">
              Reference: {application.reference}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            variant="outline"
            className="w-full justify-center"
          >
            <span>Check payment again</span>
          </Button>
          <TrackLink
            event="support_click"
            eventProps={{
              context: "unresolved visa payment",
              channel: "whatsapp",
            }}
            href={getSupportWhatsAppUrl(
              application
                ? `visa consultation ${application.reference}`
                : `visa payment ${reference}`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants(),
              "w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            <HugeiconsIcon icon={Message01Icon} size={18} aria-hidden="true" />
            <span>Contact support on WhatsApp</span>
          </TrackLink>
          <ButtonLink
            href="/visa"
            variant="ghost"
            className="w-full justify-center"
          >
            <span>Back to visa countries</span>
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
