import { z } from "zod"
import { apiGet, pickFeatured, type PaginatedResponse } from "./client.ts"

/**
 * Destination types mirror `apidoc.yaml`:
 * `DestinationList`, `DestinationDetail`, `PaginatedDestinationListList`.
 * Uses CONTEXT.md language: a Destination is a travel place grouping that
 * lists its active packages with package count and starting price.
 */

export const destinationListSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  country: z.string(),
  main_image: z.string(),
  package_count: z.number().int().min(0),
  starting_price: z.string(),
  is_featured: z.boolean().optional(),
})

export type DestinationList = z.infer<typeof destinationListSchema>

export const packageSummarySchema = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().optional().default(""),
  destination_name: z.string(),
  duration_days: z.number().int().min(0),
  duration_nights: z.number().int().min(0).optional().default(0),
  price: z.string(),
  main_image: z.string(),
  inclusions_list: z.array(z.string()).optional().default([]),
  is_featured: z.boolean().optional(),
})

export const destinationDetailSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  country: z.string(),
  description: z.string().optional().default(""),
  main_image: z.string(),
  // Backend OpenAPI types this as a string, but the live payload is the
  // destination's active packages. Accept both and normalize to a list.
  packages: z
    .union([z.array(packageSummarySchema), z.string()])
    .optional()
    .default([]),
})

export type DestinationDetail = Omit<
  z.infer<typeof destinationDetailSchema>,
  "packages"
> & {
  packages: z.infer<typeof packageSummarySchema>[]
}

export type PaginatedDestinations = PaginatedResponse<DestinationList>

function normalizeDestinationDetail(
  raw: z.infer<typeof destinationDetailSchema>
): DestinationDetail {
  if (Array.isArray(raw.packages)) {
    return { ...raw, packages: raw.packages }
  }
  // Backend OpenAPI types `packages` as a string but the live payload is the
  // destination's active packages. Attempt a safe JSON parse before falling
  // back to an empty list (renderers must handle the empty state).
  if (typeof raw.packages === "string" && raw.packages.length > 0) {
    try {
      const parsed = z
        .array(packageSummarySchema)
        .parse(JSON.parse(raw.packages))
      return { ...raw, packages: parsed }
    } catch {
      return { ...raw, packages: [] }
    }
  }
  return { ...raw, packages: [] }
}

export async function getDestinations(params?: {
  page?: number
}): Promise<PaginatedDestinations> {
  return apiGet<PaginatedDestinations>("/api/packages/destinations/", {
    query: { page: params?.page },
    tags: ["destinations"],
  })
}

export async function getDestinationDetail(
  slug: string
): Promise<DestinationDetail> {
  const raw = await apiGet<z.infer<typeof destinationDetailSchema>>(
    `/api/packages/destinations/${encodeURIComponent(slug)}/`,
    { tags: ["destinations", `destination:${slug}`] }
  )
  const parsed = destinationDetailSchema.parse(raw)
  return normalizeDestinationDetail(parsed)
}

/**
 * Featured destinations for Home. Prefers backend-flagged entries and falls
 * back to the first results so the section never renders an empty container
 * while destinations exist (§12). The destinations endpoint exposes no
 * server-side featured filter, so selection happens client-side.
 */
export async function getFeaturedDestinations(
  limit = 6
): Promise<DestinationList[]> {
  const page = await getDestinations()
  return pickFeatured(page.results, limit)
}
