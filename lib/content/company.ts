/**
 * Canonical company content (Phase 2).
 * Single source of truth for office, phones, WhatsApp, email, socials.
 * All consumer components must read from here — no hardcoded numbers.
 */

export type ContentSource = "draft" | "verified"

export interface CompanySeo {
  title: string
  description: string
}

export interface CompanyInfo {
  source: ContentSource
  updatedAt: string
  legalName: string
  brandName: string
  positioning: string
  promise: string
  /** Site brand mark in `public/` — single source for nav, footer, JSON-LD. */
  logo: string
  office: {
    label: string
    address: string
    mapQuery: string
  }
  phone: {
    display: string
    /** E.164 digits with leading `+`, e.g. `+2347066851051`. */
    e164: string
    href: string
    secondaryDisplay: string | null
  }
  whatsapp: {
    /** Digits only, no `+`, for `wa.me/<number>`. */
    number: string
    display: string
    /** Production prefill messages, copied verbatim from alphaaafrica.com. */
    prefills: {
      /** Hero / "book manually" call to action. */
      manual: string
      /** Footer and floating chat call to action. */
      services: string
    }
  }
  email: string
  socials: {
    /** X/Twitter is intentionally absent — no published handle exists. */
    instagram: string
    facebook: string
    tiktok: string
  }
  seo: CompanySeo
}

export const company: CompanyInfo = {
  // Owner-verified Oct 2026: phone/WhatsApp/office plus email + socials below.
  source: "draft",
  updatedAt: "2026-10-02",
  legalName: "Alphaa Africa Limited",
  brandName: "Alphaa Africa",
  logo: "/logo.webp",
  positioning:
    "A trusted travel partner that combines modern self-service booking with real human assistance.",
  promise: "Make travel easier, clearer, and less stressful.",
  office: {
    label: "Abuja Office — Wuse II",
    address:
      "Olive Plaza, SF19, Alexandria Cres, off Aminu Kano Crescent, Wuse II, Abuja 900107, Federal Capital Territory",
    mapQuery:
      "Olive Plaza, SF19, Alexandria Cres, off Aminu Kano Crescent, Wuse II, Abuja 900107, Federal Capital Territory",
  },
  phone: {
    // One desk line: voice calls and WhatsApp reach the same number.
    display: "+234 706 685 1051",
    e164: "+2347066851051",
    href: "tel:+2347066851051",
    secondaryDisplay: null,
  },
  whatsapp: {
    number: "2347066851051",
    display: "+234 706 685 1051",
    prefills: {
      manual: "Hello Alphaa.Africa,\nI'd like to book a trip manually!",
      services:
        "Hello Alphaa.Africa,\nI'd like to book: 1. Flight 2. Hotel 3. Visa Assistance 4. Airport Transfer",
    },
  },
  // Owner-confirmed inbox (Oct 2026).
  email: "info@alphaaafrica.com",
  socials: {
    instagram: "https://www.instagram.com/alphaa_africatravelandtours",
    facebook: "https://web.facebook.com/alphaaafrica/",
    tiktok: "https://www.tiktok.com/@alphaaafrica",
  },
  seo: {
    title:
      "Get the Cheapest and Best flights, Hotels and Tours anywhere in the world with Alphaa Africa",
    description:
      "Get the cheapest and best flight deals, luxury hotel bookings, curated holiday tours, and visa assistance anywhere in the world with Alphaa Africa.",
  },
}

/** Google Maps embed without an API key, driven by the canonical address. */
export function getOfficeMapEmbedUrl(): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(company.office.mapQuery)}&output=embed`
}

export function getWhatsAppUrl(message: string): string {
  return `https://wa.me/${company.whatsapp.number}?text=${encodeURIComponent(message)}`
}

export function getSupportWhatsAppUrl(context = "travel planning"): string {
  return getWhatsAppUrl(
    `Hello Alphaa Africa! I need assistance with ${context}.`
  )
}

export function getPhoneHref(): string {
  return company.phone.href
}

export function getEmailHref(subject?: string): string {
  return subject
    ? `mailto:${company.email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${company.email}`
}
