import { z } from "zod"
import {
  apiGet,
  apiPost,
  pickFeatured,
  SEARCH_TIMEOUT_MS,
  type PaginatedResponse,
} from "./client.ts"
import {
  emailSchema,
  fullNameSchema,
  nigerianPhoneSchema,
  optionalFutureDateStringSchema,
} from "./validation.ts"

/**
 * Package types mirror `apidoc.yaml`: `PackageList`, `PackageDetail`,
 * `PackageEnquiryRequest`, `PackageEnquiryResult`, `PaginatedPackageListList`.
 * Uses CONTEXT.md language: a Package is a curated sellable itinerary with
 * duration, from-price per person, and inclusions/highlights. Submitting
 * interest is an Enquiry (no payment; travel specialists follow up).
 */

export const packageListSchema = z.object({
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

export type PackageList = z.infer<typeof packageListSchema>

export const packageImageSchema = z.object({
  id: z.number().int(),
  image: z.string(),
  caption: z.string().optional().default(""),
})

export const packageDetailSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().optional().default(""),
  description: z.string().optional().default(""),
  destination_name: z.string(),
  destination_slug: z.string(),
  duration_days: z.number().int().min(0),
  duration_nights: z.number().int().min(0).optional().default(0),
  price: z.string(),
  inclusions_list: z.array(z.string()).optional().default([]),
  highlights_list: z.array(z.string()).optional().default([]),
  main_image: z.string(),
  images: z.array(packageImageSchema).optional().default([]),
  is_featured: z.boolean().optional(),
})

export type PackageDetail = z.infer<typeof packageDetailSchema>
export type PaginatedPackages = PaginatedResponse<PackageList>

/**
 * RHF-validated Enquiry payload (PRD §10 parity):
 * - full name, valid email, Nigerian/international phone (normalized)
 * - preferred date today-or-later when supplied
 * - num_adults ≥ 1, num_children ≥ 0 (mirrors backend minimums)
 */
export const packageEnquirySchema = z.object({
  full_name: fullNameSchema,
  email: emailSchema,
  phone: nigerianPhoneSchema("Phone number"),
  preferred_date: optionalFutureDateStringSchema("Preferred date"),
  num_adults: z.coerce
    .number()
    .int()
    .min(1, "At least 1 adult traveller is required")
    .max(30),
  num_children: z.coerce
    .number()
    .int()
    .min(0, "Children count cannot be negative")
    .max(30),
  message: z
    .string()
    .trim()
    .max(2000, "Message is too long")
    .optional()
    .default(""),
})

export type PackageEnquiryInput = z.input<typeof packageEnquirySchema>
export type PackageEnquiryPayload = z.output<typeof packageEnquirySchema>

export const packageEnquiryResultSchema = z.object({
  reference: z.string(),
  package_title: z.string(),
  full_name: z.string(),
  email: z.string(),
  phone: z.string(),
  preferred_date: z.string().nullable().optional(),
  num_adults: z.number().int().optional(),
  num_children: z.number().int().optional(),
  total_travelers: z.number().int(),
  status: z.string().optional().default("new"),
  created_at: z.string(),
})

export type PackageEnquiryResult = z.infer<typeof packageEnquiryResultSchema>

export interface PackageFilters {
  destination?: string
  featured?: boolean
  max_price?: number
  ordering?: string
  page?: number
}

export async function getPackages(
  filters: PackageFilters = {}
): Promise<PaginatedPackages> {
  return apiGet<PaginatedPackages>("/api/packages/", {
    query: {
      destination: filters.destination,
      featured: filters.featured,
      max_price: filters.max_price,
      ordering: filters.ordering,
      page: filters.page,
    },
    tags: ["packages"],
    timeoutMs: SEARCH_TIMEOUT_MS,
  })
}

export async function getPackageDetail(slug: string): Promise<PackageDetail> {
  const raw = await apiGet<unknown>(
    `/api/packages/${encodeURIComponent(slug)}/`,
    {
      tags: ["packages", `package:${slug}`],
    }
  )
  return packageDetailSchema.parse(raw)
}

/**
 * Featured packages for Home. Requests the server-side featured filter, then
 * shares selection logic with destinations; falls back to the first results
 * so the section never renders an empty container while packages exist (§12).
 */
export async function getFeaturedPackages(limit = 6): Promise<PackageList[]> {
  const page = await getPackages({ featured: true })
  if (page.results.length > 0) {
    return pickFeatured(page.results, limit)
  }
  const fallback = await getPackages()
  return pickFeatured(fallback.results, limit)
}

/**
 * Submit a package Enquiry. Accepts an RHF-validated payload, validates
 * again with Zod (server-side validation still applies backend-side),
 * and returns the booking reference for the confirmation screen.
 */
export async function submitPackageEnquiry(
  slug: string,
  input: PackageEnquiryInput
): Promise<PackageEnquiryResult> {
  const payload = packageEnquirySchema.parse(input)
  const raw = await apiPost<unknown, Record<string, unknown>>(
    `/api/packages/${encodeURIComponent(slug)}/enquire/`,
    payload as Record<string, unknown>
  )
  return packageEnquiryResultSchema.parse(raw)
}
