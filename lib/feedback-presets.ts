export type LoadingPreset = "flights" | "hotels" | "price" | "payment" | "general";

export interface LoadingPresetDetails {
  title: string;
  description: string;
}

export function getLoadingPreset(preset: LoadingPreset): LoadingPresetDetails {
  switch (preset) {
    case "flights":
      return {
        title: "Searching Flights",
        description: "Checking availability across domestic and international airline reservation systems…",
      };
    case "hotels":
      return {
        title: "Finding Hotels",
        description: "Checking room availability, live rates, and verified guest amenities…",
      };
    case "price":
      return {
        title: "Confirming Fare",
        description: "Verifying live ticket pricing and seat allocation with the carrier…",
      };
    case "payment":
      return {
        title: "Confirming Payment",
        description: "Verifying transaction with Paystack. Please do not refresh or close this window…",
      };
    case "general":
    default:
      return {
        title: "Loading Travel Details",
        description: "Preparing your travel information. This will only take a moment…",
      };
  }
}

export type ErrorPreset = "timeout" | "no-flights" | "payment-failed" | "general";

export interface ErrorPresetDetails {
  title: string;
  description: string;
  whatsappText: string;
}

export function getErrorPreset(preset: ErrorPreset): ErrorPresetDetails {
  switch (preset) {
    case "timeout":
      return {
        title: "Connection Timed Out",
        description:
          "The reservation system took longer than expected to respond. No booking was made and no payment was charged. Please retry or contact our travel desk.",
        whatsappText: "Hello Alphaa, my search timed out. I need assistance checking availability for my trip.",
      };
    case "no-flights":
      return {
        title: "No Matching Flights Found",
        description:
          "There are no scheduled flights matching this route and date combination. Try adjusting your dates by a few days or speak with our flight specialists.",
        whatsappText: "Hello Alphaa, I need help finding flight options for my desired route.",
      };
    case "payment-failed":
      return {
        title: "Payment Could Not Be Confirmed",
        description:
          "We could not verify authorization with the payment provider. If funds were deducted from your account, rest assured our team can locate and reconcile your booking.",
        whatsappText: "Hello Alphaa, my payment verification failed. Please assist me with my transaction.",
      };
    case "general":
    default:
      return {
        title: "Travel Service Temporarily Unavailable",
        description:
          "We were unable to complete this action due to a temporary service interruption. You can retry the request or speak directly with our team.",
        whatsappText: "Hello Alphaa, I experienced an issue on the website and need assistance.",
      };
  }
}
