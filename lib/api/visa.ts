import { z } from "zod"
import { apiGet, apiPost, type PaginatedResponse } from "./client.ts"
import {
  emailSchema,
  fullNameSchema,
  nigerianPhoneSchema,
  optionalFutureDateStringSchema,
} from "./validation.ts"

/**
 * Visa types mirror `apidoc.yaml`: `VisaCountryList`, `VisaCountryDetail`,
 * `VisaApplicationCreateRequest`, `VisaApplication`,
 * `PaginatedVisaCountryListList`, `TravelPurposeEnum`.
 * Uses CONTEXT.md language: a Visa Consultation is a paid request for
 * country-specific visa guidance including consultation-fee payment.
 * Avoid: "Visa Application", "visa booking", "visa enquiry".
 */

export const travelPurposeSchema = z.enum([
  "tourism",
  "business",
  "study",
  "work",
  "medical",
  "family",
  "other",
])

export type TravelPurpose = z.infer<typeof travelPurposeSchema>

export const TRAVEL_PURPOSE_LABELS: Record<TravelPurpose, string> = {
  tourism: "Tourism",
  business: "Business",
  study: "Study",
  work: "Work",
  medical: "Medical",
  family: "Family Visit",
  other: "Other",
}

export const visaCountryListSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  consultation_fee: z.string(),
  processing_time: z.string().optional().default(""),
  flag_image: z.string(),
  is_featured: z.boolean().optional(),
})

export type VisaCountryList = z.infer<typeof visaCountryListSchema>

export const visaCountryDetailSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  consultation_fee: z.string(),
  processing_time: z.string().optional().default(""),
  description: z.string().optional().default(""),
  flag_image: z.string(),
})

export type VisaCountryDetail = z.infer<typeof visaCountryDetailSchema>
export type PaginatedVisaCountries = PaginatedResponse<VisaCountryList>

/**
 * RHF-validated Visa Consultation payload (PRD §10 parity):
 * phone normalized, preferred date today-or-later, applicants ≥ 1.
 */
export const visaConsultationSchema = z.object({
  country_id: z.coerce
    .number()
    .int()
    .min(1, "Choose a country for this consultation"),
  full_name: fullNameSchema,
  email: emailSchema,
  phone: nigerianPhoneSchema("Phone number"),
  travel_purpose: travelPurposeSchema.optional().default("tourism"),
  preferred_date: optionalFutureDateStringSchema("Preferred date"),
  num_applicants: z.coerce
    .number()
    .int()
    .min(1, "At least 1 applicant is required")
    .max(30, "Too many applicants for one consultation"),
  message: z
    .string()
    .trim()
    .max(2000, "Message is too long")
    .optional()
    .default(""),
})

export type VisaConsultationInput = z.input<typeof visaConsultationSchema>
export type VisaConsultationPayload = z.output<typeof visaConsultationSchema>

export const visaApplicationSchema = z.object({
  id: z.number().int(),
  reference: z.string(),
  country_name: z.string(),
  full_name: z.string(),
  email: z.string(),
  phone: z.string(),
  travel_purpose: travelPurposeSchema.optional().default("tourism"),
  travel_purpose_display: z.string().optional().default(""),
  preferred_date: z.string().nullable().optional(),
  num_applicants: z.number().int().optional(),
  message: z.string().optional().default(""),
  consultation_fee: z.string(),
  status: z.string(),
  created_at: z.string(),
})

export type VisaApplication = z.infer<typeof visaApplicationSchema>

/**
 * Backend creates the consultation and initializes Paystack, returning an
 * authorization URL plus a reference (apidoc: "returns authorization_url
 * and reference"). Shape is intentionally permissive beyond those two
 * required fields.
 */
export const visaConsultationResultSchema = z.object({
  reference: z.string(),
  authorization_url: z.string(),
})

export type VisaConsultationResult = z.infer<
  typeof visaConsultationResultSchema
>

export async function getVisaCountries(params?: {
  page?: number
}): Promise<PaginatedVisaCountries> {
  return apiGet<PaginatedVisaCountries>("/api/visa/countries/", {
    query: { page: params?.page },
    tags: ["visa-countries"],
  })
}

export async function getVisaCountryDetail(
  slug: string
): Promise<VisaCountryDetail> {
  const raw = await apiGet<unknown>(
    `/api/visa/countries/${encodeURIComponent(slug)}/`,
    {
      tags: ["visa-countries", `visa-country:${slug}`],
    }
  )
  return visaCountryDetailSchema.parse(raw)
}

/**
 * Start a Visa Consultation (paid): validates the RHF payload, creates the
 * consultation, and returns `{ reference, authorization_url }` for the
 * Paystack redirect. Verification happens via {@link verifyVisaPayment}.
 */
export async function submitVisaConsultation(
  input: VisaConsultationInput
): Promise<VisaConsultationResult> {
  const payload = visaConsultationSchema.parse(input)
  const raw = await apiPost<unknown, Record<string, unknown>>(
    "/api/visa/apply/",
    payload as Record<string, unknown>
  )
  return visaConsultationResultSchema.parse(raw)
}

export async function verifyVisaPayment(
  reference: string
): Promise<VisaApplication> {
  // Never cached: verification must reflect the live payment state (PRD §13).
  const raw = await apiGet<unknown>(
    `/api/visa/verify/${encodeURIComponent(reference)}/`,
    {
      noStore: true,
    }
  )
  return visaApplicationSchema.parse(raw)
}
