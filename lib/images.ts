/**
 * Site imagery (site-owned, first-party files in `public/images/`).
 *
 * Every path here is a local file served from the site root, so `next/image`
 * optimises it and the app never depends on a third-party image host. Swap a
 * file in `public/images/` and the whole site updates — no component edits.
 *
 * Listing/entity imagery (Hotels, Vehicles, Destinations, Packages, Visas,
 * Posts) is NOT here: it comes from the backend per record. See
 * `resolveListingImageUrl` in `lib/listings.ts` for those.
 */

/** Home hero — full-bleed, dark left third reserved for the headline. */
export const HERO = "/images/hero.webp"

/**
 * Home hero slideshow frames (`public/images/hero/`), in display order.
 * Rendered as a decorative background layer — the headline carries the
 * meaning, so the component marks them `aria-hidden` with empty `alt`.
 * `alt` is kept here as source documentation for each frame.
 */
export const HERO_SLIDES = [
  {
    src: "/images/hero/abudhabiairport.webp",
    alt: "Abu Dhabi airport terminal at dusk",
  },
  {
    src: "/images/hero/downloaddubia.webp",
    alt: "Dubai skyline rising above the marina",
  },
  {
    src: "/images/hero/transcorp.webp",
    alt: "Transcorp hotel exterior in the city",
  },
  {
    src: "/images/hero/zanziba.webp",
    alt: "White-sand beach in Zanzibar with turquoise water",
  },
] as const

/** Home "Don't want to plan it all yourself?" editorial card. */
export const HOME_BENTO = "/images/homepage-bento.webp"

/** Explore mega-menu + mobile drawer service tiles. */
export const SERVICE_IMAGES = {
  flights: "/images/flight.webp",
  hotels: "/images/hotel.webp",
  destinations: "/images/destination.webp",
  visa: "/images/visa.webp",
  cars: "/images/car.webp",
  packages: "/images/packages.webp",
} as const

/** Shared concierge CTA band (used by `TerminalCta` and page-level CTAs). */
export const CTA_DEFAULT = "/images/default-cta.webp"
export const CTA_PACKAGES_PAGE = "/images/packages-page-cta.webp"
export const CTA_FAQ = "/images/default-cta.webp"
export const CTA_BLOG_LISTING = "/images/blog-listing-cta.webp"
export const CTA_BLOG_POST = "/images/blog-post-cta.webp"

/** 1200x630 social share card. */
export const OG_SHARE_CARD = "/images/og-share-card.webp"
