import { getApiBaseUrl } from "./api/client.ts"
import { canonicalUrl, getSiteUrl } from "./seo.ts"
import type { PackageFilters } from "./api/packages.ts"

/**
 * Pure listing helpers for Phase 2 Destinations + Packages (PRD §8.6, §8.9, §18).
 *
 * Seams (pre-agreed): URL searchParams <-> PackageFilters round-trip,
 * featured-first sorting, backend image resolution, and TouristTrip /
 * TouristDestination / ItemList JSON-LD graphs.
 *
 * All HTTP stays in `lib/api/` — this module never calls `fetch`.
 * Naira display reuses `lib/format.ts` — no second formatter here.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function parseMaxPrice(
  value: string | string[] | undefined
): number | undefined {
  const raw = firstString(value)?.trim()
  if (!raw) return undefined
  const parsed = Number(raw)
  // Domain rule: prices are positive. Zero/negative/non-numeric input is
  // treated as "no filter" (identical to omitting max_price backend-side).
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.floor(parsed)
}

function parseFeatured(
  value: string | string[] | undefined
): boolean | undefined {
  const raw = firstString(value)
  if (typeof raw !== "string") return undefined
  // Only `featured=true` narrows the listing. `featured=false` is
  // equivalent to omitting the filter backend-side, so it maps to undefined.
  return raw.trim().toLowerCase() === "true" ? true : undefined
}

/**
 * Parse the shareable/crawlable `?destination=&max_price=&featured=`
 * query into API filters. Invalid values are dropped, never thrown.
 */
export function parsePackageSearchParams(
  input: RawSearchParams
): PackageFilters {
  const destination = firstString(input.destination)?.trim()
  const max_price = parseMaxPrice(input.max_price)
  const featured = parseFeatured(input.featured)
  const filters: PackageFilters = {}
  if (destination) filters.destination = destination
  if (max_price !== undefined) filters.max_price = max_price
  if (featured !== undefined) filters.featured = featured
  return filters
}

/** Serialize filters back to a shareable query string (no leading `?`). */
export function buildPackageSearchParams(filters: PackageFilters): string {
  const params = new URLSearchParams()
  if (filters.destination) params.set("destination", filters.destination)
  if (filters.max_price !== undefined)
    params.set("max_price", String(filters.max_price))
  if (filters.featured) params.set("featured", "true")
  return params.toString()
}

/** Featured-first, stable otherwise. Never mutates the input. */
export function sortFeaturedFirst<T extends { is_featured?: boolean }>(
  items: T[]
): T[] {
  return [...items].sort(
    (a, b) => Number(b.is_featured === true) - Number(a.is_featured === true)
  )
}

/** Parse a backend decimal price string to a positive number, if possible. */
export function parsePriceAmount(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(String(value).replace(/,/g, "").trim())
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * Resolve backend imagery (absolute URL or relative `/media/` path) to an
 * absolute URL. Empty input falls back to a local brand asset so cards
 * never render a broken image.
 */
export function resolveListingImageUrl(src: string | null | undefined): string {
  const fallback = "/android-chrome-512x512.png"
  if (!src || src.trim().length === 0) return fallback
  const trimmed = src.trim()
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:"))
    return trimmed
  const base = getApiBaseUrl().replace(/\/+$/, "")
  if (trimmed.startsWith("/")) return `${base}${trimmed}`
  return `${base}/${trimmed}`
}

/** Humanize a URL slug for fallback titles, e.g. `cape-coast` → `Cape Coast`. */
export function humanizeSlug(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface DestinationListJsonLdInput {
  name: string
  slug: string
  country: string
  main_image: string
}

/** ItemList graph for `/destinations` — one node per card, no thin pages. */
export function destinationListJsonLd(items: DestinationListJsonLdInput[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: canonicalUrl(`/destinations/${item.slug}`),
      item: {
        "@type": "TouristDestination",
        name: item.name,
        address: { "@type": "PostalAddress", addressCountry: item.country },
        image: resolveListingImageUrl(item.main_image),
        url: canonicalUrl(`/destinations/${item.slug}`),
      },
    })),
  }
}

export interface DestinationDetailJsonLdInput {
  name: string
  slug: string
  country: string
  description?: string
  main_image: string
  packages: { title: string; slug: string }[]
}

/** TouristDestination + ItemList graph for `/destinations/[slug]` (GEO). */
export function destinationDetailJsonLd(input: DestinationDetailJsonLdInput) {
  const url = canonicalUrl(`/destinations/${input.slug}`)
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristDestination",
        "@id": `${url}#destination`,
        name: input.name,
        description:
          input.description && input.description.length > 0
            ? input.description
            : `${input.name}, ${input.country} — curated holiday packages with human planning help.`,
        address: { "@type": "PostalAddress", addressCountry: input.country },
        image: resolveListingImageUrl(input.main_image),
        url,
      },
      {
        "@type": "ItemList",
        name: `Holiday packages in ${input.name}`,
        itemListElement: input.packages.map((pkg, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: canonicalUrl(`/packages/${pkg.slug}`),
          item: {
            "@type": "TouristTrip",
            name: pkg.title,
            url: canonicalUrl(`/packages/${pkg.slug}`),
          },
        })),
      },
    ],
  }
}

export interface VisaCountryListJsonLdInput {
  name: string
  slug: string
  consultation_fee: string
  processing_time?: string
  flag_image: string
}

/** ItemList graph for `/visa` — one Service node per country, no thin pages. */
export function visaCountryListJsonLd(items: VisaCountryListJsonLdInput[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: canonicalUrl(`/visa/${item.slug}`),
      item: {
        "@type": "Service",
        name: `${item.name} Visa Consultation`,
        description:
          item.processing_time && item.processing_time.length > 0
            ? `Visa consultation for ${item.name}. Typical processing: ${item.processing_time}.`
            : `Visa consultation for ${item.name} with human guidance.`,
        image: resolveListingImageUrl(item.flag_image),
        url: canonicalUrl(`/visa/${item.slug}`),
        provider: {
          "@type": "TravelAgency",
          name: "Alphaa Africa",
          url: getSiteUrl(),
        },
      },
    })),
  }
}

export interface VisaCountryDetailJsonLdInput {
  name: string
  slug: string
  consultation_fee: string
  processing_time?: string
  flag_image: string
  description?: string
}

/** Service graph for `/visa/[slug]` with an NGN consultation-fee offer. */
export function visaCountryDetailJsonLd(input: VisaCountryDetailJsonLdInput) {
  const url = canonicalUrl(`/visa/${input.slug}`)
  const price = parsePriceAmount(input.consultation_fee)
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${input.name} Visa Consultation`,
    description:
      input.description && input.description.length > 0
        ? input.description
        : `Paid visa consultation for ${input.name} with human guidance from Alphaa Africa.`,
    image: resolveListingImageUrl(input.flag_image),
    url,
    provider: {
      "@type": "TravelAgency",
      name: "Alphaa Africa",
      url: getSiteUrl(),
    },
    areaServed: {
      "@type": "Country",
      name: input.name,
    },
    offers: {
      "@type": "Offer",
      price: price !== null ? String(price) : input.consultation_fee,
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
      url,
    },
  }
}
export interface PackageDetailJsonLdInput {
  title: string
  slug: string
  destination_name: string
  destination_slug?: string
  price: string
  main_image: string
  description?: string
}

/** TouristTrip graph for `/packages/[slug]` with an NGN offer. */
export function packageDetailJsonLd(input: PackageDetailJsonLdInput) {
  const url = canonicalUrl(`/packages/${input.slug}`)
  const price = parsePriceAmount(input.price)
  const destinationUrl = input.destination_slug
    ? canonicalUrl(`/destinations/${input.destination_slug}`)
    : getSiteUrl()
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: input.title,
    description:
      input.description && input.description.length > 0
        ? input.description
        : `${input.title} — a curated itinerary to ${input.destination_name} with human planning help.`,
    image: resolveListingImageUrl(input.main_image),
    url,
    touristType: "Leisure",
    itinerary: {
      "@type": "ItemList",
      name: `${input.title} itinerary`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@type": "TouristDestination",
            name: input.destination_name,
            url: destinationUrl,
          },
        },
      ],
    },
    offers: {
      "@type": "Offer",
      price: price !== null ? String(price) : input.price,
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
      url,
    },
  }
}
