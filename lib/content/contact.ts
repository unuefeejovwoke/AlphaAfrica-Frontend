import { company, getWhatsAppUrl, type ContentSource } from "./company.ts"

/**
 * Contact channels, hours, and emergency guidance (Phase 2).
 * Numbers and addresses defer to `company.ts` — never hardcode here.
 */

export interface ContactChannel {
  id: "whatsapp" | "phone" | "email" | "office"
  label: string
  value: string
  href: string
  note: string
}

export interface ContactInfo {
  source: ContentSource
  updatedAt: string
  channels: ContactChannel[]
  hours: {
    label: string
    detail: string
    timezone: string
  }
  emergency: {
    title: string
    description: string
    phoneHref: string
    phoneDisplay: string
  }
  seo: {
    title: string
    description: string
  }
}

export const contact: ContactInfo = {
  source: "draft",
  updatedAt: "2026-09-25",
  channels: [
    {
      id: "whatsapp",
      label: "WhatsApp",
      value: company.whatsapp.display,
      href: getWhatsAppUrl(company.whatsapp.prefills.manual),
      note: "Usually the fastest way to reach us during desk hours.",
    },
    {
      id: "phone",
      label: "Phone",
      value: company.phone.display,
      href: company.phone.href,
      note: "Best for bookings in progress or travel-day issues.",
    },
    {
      id: "email",
      label: "Email",
      value: company.email,
      href: `mailto:${company.email}`,
      note: "For documents, detailed itineraries, and follow-ups.",
    },
    {
      id: "office",
      label: "Visit our office",
      value: company.office.address,
      href: `https://maps.google.com/maps?q=${encodeURIComponent(company.office.mapQuery)}`,
      note: "Open Monday through Saturday. Walk-ins are welcome.",
    },
  ],
  hours: {
    label: "Monday – Saturday, 8:00 AM – 6:00 PM (WAT)",
    detail:
      "Messages sent outside desk hours are answered the next working morning. For urgent travel-day issues, call the phone line.",
    timezone: "Africa/Lagos (WAT, UTC+1)",
  },
  emergency: {
    title: "Travelling today or payment uncertain?",
    description:
      "If a payment was deducted but your booking is unclear, keep your reference and contact us right away — our team can locate and reconcile it.",
    phoneHref: company.phone.href,
    phoneDisplay: company.phone.display,
  },
  seo: {
    title: "Contact Alphaa Africa — WhatsApp, Phone & Email",
    description:
      "Message on WhatsApp, call, or email Alphaa Africa. Get help with flights, hotels, holiday packages, visa applications, and car rentals — wherever you are.",
  },
}
