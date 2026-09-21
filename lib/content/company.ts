/**
 * Canonical company content (Phase 2).
 * Single source of truth for office, phones, WhatsApp, email, socials.
 * All consumer components must read from here — no hardcoded numbers.
 */

export type ContentSource = "draft" | "verified";

export interface CompanySeo {
  title: string;
  description: string;
}

export interface CompanyInfo {
  source: ContentSource;
  updatedAt: string;
  legalName: string;
  brandName: string;
  positioning: string;
  promise: string;
  office: {
    label: string;
    address: string;
    mapQuery: string;
    coordinates: { lat: number; lng: number };
  };
  phone: {
    display: string;
    /** E.164 digits with leading `+`, e.g. `+2348000000000`. */
    e164: string;
    href: string;
    secondaryDisplay: string | null;
  };
  whatsapp: {
    /** Digits only, no `+`, for `wa.me/<number>`. */
    number: string;
    display: string;
  };
  email: string;
  socials: {
    instagram: string;
    x: string;
    facebook: string;
    tiktok: string;
  };
  seo: CompanySeo;
}

export const company: CompanyInfo = {
  source: "draft",
  updatedAt: "2026-09-21",
  legalName: "Alphaa Africa Limited",
  brandName: "Alphaa Africa",
  positioning:
    "A trusted travel partner that combines modern self-service booking with real human assistance.",
  promise: "Make travel easier, clearer, and less stressful.",
  office: {
    label: "Abuja Office — Central Business District",
    address:
      "Suite B4, Statement Hotel Building, Plot 1002 1st Avenue, Off Shehu Shagari Way, Central Business District, Abuja, Nigeria.",
    mapQuery:
      "Suite B4, Statement Hotel Building, Plot 1002 1st Avenue, Off Shehu Shagari Way, Central Business District, Abuja, Nigeria",
    coordinates: { lat: 9.0579, lng: 7.4951 },
  },
  phone: {
    display: "+234 800 000 0000",
    e164: "+2348000000000",
    href: "tel:+2348000000000",
    secondaryDisplay: "+234 9 292 0000",
  },
  whatsapp: {
    number: "2348000000000",
    display: "+234 800 000 0000",
  },
  email: "support@alphaaafrica.com",
  socials: {
    instagram: "https://instagram.com/alphaaafrica",
    x: "https://x.com/alphaaafrica",
    facebook: "https://facebook.com/alphaaafrica",
    tiktok: "https://tiktok.com/@alphaaafrica",
  },
  seo: {
    title: "Alphaa Africa — Flights, Hotels, Packages, Visa Help & Car Rentals",
    description:
      "Abuja-based assisted-service travel platform. Book flights, hotels, and car rentals yourself, or get human help with holiday packages and visa consultations.",
  },
};

/** Google Maps embed without an API key, driven by the canonical address. */
export function getOfficeMapEmbedUrl(): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(company.office.mapQuery)}&output=embed`;
}

export function getWhatsAppUrl(message: string): string {
  return `https://wa.me/${company.whatsapp.number}?text=${encodeURIComponent(message)}`;
}

export function getSupportWhatsAppUrl(context = "travel planning"): string {
  return getWhatsAppUrl(`Hello Alphaa Africa! I need assistance with ${context}.`);
}

export function getPhoneHref(): string {
  return company.phone.href;
}

export function getEmailHref(subject?: string): string {
  return subject
    ? `mailto:${company.email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${company.email}`;
}
