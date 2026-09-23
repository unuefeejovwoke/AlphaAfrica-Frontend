export type LoadingPreset =
  "flights" | "hotels" | "price" | "payment" | "general"

export interface LoadingPresetDetails {
  title: string
  description: string
}

const loadingPresets: Record<LoadingPreset, LoadingPresetDetails> = {
  flights: {
    title: "Searching Flights",
    description:
      "Checking availability across domestic and international airline reservation systems…",
  },
  hotels: {
    title: "Finding Hotels",
    description:
      "Checking room availability, live rates, and verified guest amenities…",
  },
  price: {
    title: "Confirming Fare",
    description:
      "Verifying live fare pricing and seat allocation with the carrier…",
  },
  payment: {
    title: "Confirming Payment",
    description:
      "Verifying transaction with Paystack. Please do not refresh or close this window…",
  },
  general: {
    title: "Loading Travel Details",
    description:
      "Preparing your travel information. This will only take a moment…",
  },
}

export function getLoadingPreset(preset: LoadingPreset): LoadingPresetDetails {
  return loadingPresets[preset] ?? loadingPresets.general
}

export type ErrorPreset =
  "timeout" | "no-flights" | "payment-failed" | "general"

export interface AlternateRoute {
  label: string
  href: string
}

export interface ErrorPresetDetails {
  title: string
  description: string
  whatsappText: string
  alternateRoute: AlternateRoute
}

const errorPresets: Record<ErrorPreset, ErrorPresetDetails> = {
  timeout: {
    title: "Connection Timed Out",
    description:
      "The reservation system took longer than expected to respond. No booking was made and no payment was charged. Please retry or contact our travel desk.",
    whatsappText:
      "Hello Alphaa, my search timed out. I need assistance checking availability for my trip.",
    alternateRoute: { label: "Adjust Dates & Retry", href: "/flights" },
  },
  "no-flights": {
    title: "No Matching Flights Found",
    description:
      "There are no scheduled flights matching this route and date combination. Try adjusting your dates by a few days or speak with our flight specialists.",
    whatsappText:
      "Hello Alphaa, I need help finding flight options for my desired route.",
    alternateRoute: { label: "Browse Destinations", href: "/destinations" },
  },
  "payment-failed": {
    title: "Payment Could Not Be Confirmed",
    description:
      "We could not verify authorization with the payment provider. If funds were deducted from your account, rest assured our team can locate and reconcile your booking.",
    whatsappText:
      "Hello Alphaa, my payment verification failed. Please assist me with my transaction.",
    alternateRoute: { label: "Review Booking Details", href: "/checkout" },
  },
  general: {
    title: "Travel Service Temporarily Unavailable",
    description:
      "We were unable to complete this action due to a temporary service interruption. You can retry the request or speak directly with our team.",
    whatsappText:
      "Hello Alphaa, I experienced an issue on the website and need assistance.",
    alternateRoute: { label: "Return Home", href: "/" },
  },
}

export function getErrorPreset(preset: ErrorPreset): ErrorPresetDetails {
  return errorPresets[preset] ?? errorPresets.general
}
