import type { MetadataRoute } from "next"
import { extractSlugs } from "@/lib/api/shared.ts"
import { getSiteUrl } from "@/lib/seo"
import { getBlogPosts } from "@/lib/api/blog.ts"
import { getDestinations } from "@/lib/api/destinations.ts"
import { getPackages } from "@/lib/api/packages.ts"
import { getVisaCountries } from "@/lib/api/visa.ts"
import { listHotelSlugs } from "@/lib/api/hotels.ts"
import { listVehicleSlugs } from "@/lib/api/cars.ts"

/**
 * Frontend-owned sitemap (API guide §11).
 * The backend `/sitemap.xml` lists landings only — no blog posts, no detail
 * pages, and a `/coming-soon` URL with no matching route. This route takes
 * precedence over the dashboard rewrite and emits landings plus every
 * first-page detail slug; deeper pages are discovered via on-page links.
 * Every source is best-effort: a backend outage degrades to the static
 * landings, never to a 500.
 */

export const revalidate = 3600

const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/flights", priority: 0.8 },
  { path: "/hotels", priority: 0.8 },
  { path: "/packages", priority: 0.8 },
  { path: "/destinations", priority: 0.8 },
  { path: "/cars", priority: 0.8 },
  { path: "/visa", priority: 0.8 },
  { path: "/blog", priority: 0.7 },
  { path: "/faq", priority: 0.6 },
  { path: "/contact", priority: 0.5 },
  { path: "/foundation", priority: 0.5 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
]

async function trySlugs(
  read: () => Promise<string[]>
): Promise<string[]> {
  try {
    return await read()
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl()
  const now = new Date()
  const [blog, hotels, cars, packages, destinations, visa] = await Promise.all(
    [
      trySlugs(async () => {
        const page = await getBlogPosts({ page: 1 })
        return extractSlugs(page.results)
      }),
      trySlugs(listHotelSlugs),
      trySlugs(listVehicleSlugs),
      trySlugs(async () => {
        const page = await getPackages({ page: 1 })
        return extractSlugs(page.results)
      }),
      trySlugs(async () => {
        const page = await getDestinations({ page: 1 })
        return extractSlugs(page.results)
      }),
      trySlugs(async () => {
        const page = await getVisaCountries({ page: 1 })
        return extractSlugs(page.results)
      }),
    ]
  )

  const detail = (base: string, slugs: string[], priority: number) =>
    slugs.map((slug) => ({
      url: `${site}/${base}/${slug}`,
      lastModified: now,
      priority,
    }))

  return [
    ...STATIC_ROUTES.map(({ path, priority }) => ({
      url: `${site}${path}`,
      lastModified: now,
      priority,
    })),
    ...detail("blog", blog, 0.6),
    ...detail("hotels", hotels, 0.6),
    ...detail("cars", cars, 0.6),
    ...detail("packages", packages, 0.6),
    ...detail("destinations", destinations, 0.6),
    ...detail("visa", visa, 0.6),
  ]
}
