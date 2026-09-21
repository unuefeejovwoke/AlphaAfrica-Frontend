import { company } from "./content/company.ts";
import type { FaqGroup } from "./content/faqs.ts";

/**
 * Shared SEO helpers (Phase 2, PRD §18).
 * Single source for the site URL, canonical links, and JSON-LD graphs so
 * every public route emits consistent crawlable metadata.
 */

/** Absolute site root from the environment with a production fallback. */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim() || "";
  if (fromEnv.length > 0) {
    return fromEnv.replace(/\/+$/, "");
  }
  return "https://www.alphaaafrica.com";
}

/** Absolute canonical URL for a page path such as `/about`. */
export function canonicalUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized === "/" ? "/" : normalized}`;
}

interface OrganizationJsonLd {
  "@context": "https://schema.org";
  "@type": "TravelAgency";
  name: string;
  legalName: string;
  description: string;
  url: string;
  email: string;
  telephone: string;
  address: {
    "@type": "PostalAddress";
    streetAddress: string;
    addressLocality: string;
    addressCountry: string;
  };
  sameAs: string[];
  contactPoint: {
    "@type": "ContactPoint";
    contactType: string;
    telephone: string;
    email: string;
    availableLanguage: string[];
  }[];
}

/** Organization graph for Home, About, and Contact. */
export function organizationJsonLd(): OrganizationJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: company.brandName,
    legalName: company.legalName,
    description: company.positioning,
    url: getSiteUrl(),
    email: company.email,
    telephone: company.phone.e164,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.office.address,
      addressLocality: "Abuja",
      addressCountry: "NG",
    },
    sameAs: [
      company.socials.instagram,
      company.socials.x,
      company.socials.facebook,
      company.socials.tiktok,
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: company.phone.e164,
        email: company.email,
        availableLanguage: ["en"],
      },
    ],
  };
}

interface WebsiteJsonLd {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
  description: string;
}

/** WebSite graph for Home. */
export function websiteJsonLd(): WebsiteJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: company.brandName,
    url: getSiteUrl(),
    description: company.seo.description,
  };
}

interface FaqPageJsonLd {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: {
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }[];
}

/** FAQPage graph mirroring every published question and answer. */
export function faqPageJsonLd(groups: FaqGroup[]): FaqPageJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((group) =>
      group.faqs.map((faq) => ({
        "@type": "Question" as const,
        name: faq.question,
        acceptedAnswer: { "@type": "Answer" as const, text: faq.answer },
      })),
    ),
  };
}
