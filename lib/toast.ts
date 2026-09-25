import { toast } from "sonner"
import { getPaymentSafetyCopy } from "@/lib/api/client"

export function notifyEnquirySent(destination?: string) {
  toast.success("Enquiry sent", {
    description: destination
      ? `Our ${destination} specialist will reply within one business day…`
      : "Our travel specialist will reply within one business day…",
  })
}

export function notifyCallbackRequested() {
  toast.success("Callback requested", {
    description: "A specialist will call you shortly during desk hours…",
  })
}

export function notifyBookingActionFailed(retry?: () => void) {
  toast.error("Action could not be completed", {
    description:
      "Please retry, or speak with Alphaa on WhatsApp for assistance…",
    action: retry
      ? {
          label: "Retry",
          onClick: retry,
        }
      : undefined,
  })
}

/**
 * Payment-attempt failure that must not hide at the top of a long form.
 * Carries the specific human message plus the payment-safety reassurance and
 * stays up long enough to read.
 */
export function notifyPaymentFailed(message: string) {
  toast.error("Your booking was not created", {
    description: `${message} ${getPaymentSafetyCopy()}`,
    duration: 10_000,
  })
}

export function notifySearchStarted(service: string, work: Promise<unknown>) {
  return toast.promise(work, {
    loading: `Searching ${service}…`,
    success: `${service} results are ready`,
    error: `Could not load ${service}. Please retry or contact support…`,
  })
}
