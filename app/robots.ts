import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/seo"

/**
 * Crawl budget (Phase 3, ticket 10; PRD §18 + spec §61).
 * - The stable `/flights` entry stays crawlable.
 * - Dynamic result views (`?origin=…`), the fare-confirmation step, the
 *   Paystack return target, and the guest checkout shell are never thin
 *   indexable pages: they are noindex via page metadata AND disallowed here
 *   so crawlers do not waste budget on them.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/flights/confirm", "/flights/verify", "/checkout", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
