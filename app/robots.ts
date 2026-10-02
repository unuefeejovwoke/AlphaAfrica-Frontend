import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/seo"

/**
 * Crawl budget (Phase 3, ticket 10; PRD §18 + spec §61 + API guide §11).
 * - Stable landings stay crawlable; result views (`?origin=…`), fare steps,
 *   the Paystack return target, token-gated order pages, and the guest
 *   checkout shell are noindex via page metadata AND disallowed here.
 * - AI search crawlers are explicitly allowed (ai-seo Pillar 3): blocking
 *   GPTBot/PerplexityBot/ClaudeBot/Google-Extended means those engines
 *   cannot cite the site. Only the training-only CCBot stays blocked.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/profile",
          "/flights/confirm",
          "/flights/verify",
          "/checkout",
          "/order",
          "/orders",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "anthropic-ai",
          "Google-Extended",
          "Bingbot",
        ],
        allow: "/",
      },
      { userAgent: "CCBot", disallow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
