import { company } from "./content/company.ts";
import type { FaqGroup } from "./content/faqs.ts";

/**
 * Shared SEO helpers (Phase 2, PRD §18; Phase 3 ticket 10 flights).
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

// ---------------------------------------------------------------------------
// Flights discoverability (Phase 3, ticket 10; PRD §18 + spec §61)
// - Only the stable `/flights` entry is indexable. Any URL carrying search
//   state (origin/destination/legs/dates/party) is a dynamic result view and
//   must be noindex/nofollow with a canonical back to `/flights` — never a
//   thin indexable page per route/date combination.
// ---------------------------------------------------------------------------

/** Stable, indexable flights landing metadata (single source for the route). */
export const FLIGHTS_LANDING_TITLE =
  "Search Flights — One-way, Round-trip & Multi-city | Alphaa Africa";

export const FLIGHTS_LANDING_DESCRIPTION =
  "Search one-way, round-trip, and multi-city flights by airport, date, party and cabin. Airport autocomplete from IATA, city or name. Live fares in NGN, no account needed. Confirm the live fare before paying.";

/** Query keys that turn `/flights` into a dynamic, non-indexable result view. */
const FLIGHT_SEARCH_PARAM_KEYS = [
  "origin",
  "destination",
  "departureDate",
  "returnDate",
  "legs",
  "adults",
  "children",
  "infants",
] as const;

/**
 * True when the query carries search state. Pure seam: the flights page uses
 * it in `generateMetadata` so `?origin=LOS&…` result URLs are noindex while
 * the clean `/flights` entry stays indexable.
 */
export function hasFlightSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): boolean {
  for (const key of FLIGHT_SEARCH_PARAM_KEYS) {
    const value = searchParams[key];
    if (Array.isArray(value) ? value.length > 0 && value[0] !== "" : value) {
      // Party-only defaults (?adults=1) from a fresh form mount carry no
      // route/date intent — require a route or date signal to count as a
      // dynamic result view.
      if (key === "adults" || key === "children" || key === "infants") continue;
      return true;
    }
  }
  return false;
}

/** Robots for `/flights`: index only the clean landing, never result URLs. */
export function flightRobotsForSearchParams(hasSearch: boolean): {
  index: boolean;
  follow: boolean;
} {
  return hasSearch ? { index: false, follow: false } : { index: true, follow: true };
}

interface FlightTravelActionJsonLd {
  "@context": "https://schema.org";
  "@type": "TravelAction";
  name: string;
  description: string;
  url: string;
  agent: {
    "@type": "TravelAgency";
    name: string;
    url: string;
    telephone: string;
    email: string;
  };
  object: {
    "@type": "Flight";
    name: string;
    url: string;
  };
  result: {
    "@type": "WebPage";
    name: string;
    url: string;
  };
}

/**
 * TravelAction graph for the stable `/flights` entry (GEO/AI-SEO).
 * Describes the bookable action without inventing routes, prices, or
 * schedules — dynamic results are never embedded in structured data.
 */
export function flightTravelActionJsonLd(): FlightTravelActionJsonLd {
  const url = canonicalUrl("/flights");
  return {
    "@context": "https://schema.org",
    "@type": "TravelAction",
    name: "Search and book flights with live fares",
    description: FLIGHTS_LANDING_DESCRIPTION,
    url,
    agent: {
      "@type": "TravelAgency",
      name: company.brandName,
      url: getSiteUrl(),
      telephone: company.phone.e164,
      email: company.email,
    },
    object: {
      "@type": "Flight",
      name: "One-way, round-trip, and multi-city flight search in NGN",
      url,
    },
    result: {
      "@type": "WebPage",
      name: FLIGHTS_LANDING_TITLE,
      url,
    },
  };
}
