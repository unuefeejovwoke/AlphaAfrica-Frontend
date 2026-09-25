import { z } from "zod"
import {
  emailSchema,
  futureDateStringSchema,
  nigerianPhoneSchema,
} from "../api/validation.ts"

// Plain field shape (no cross-field rules) for composition into plain
// ZodObjects — e.g. discriminated-union members, which must stay
// ZodObject at the type level. Cross-field rules live on
// travellerCompositionSchema below and are reused via safeParse delegation.
export const travellerPartyBaseSchema = z.object({
  adults: z
    .number()
    .int()
    .min(1, "At least 1 adult traveller is required")
    .max(9, "Maximum 9 adults"),
  children: z
    .number()
    .int()
    .min(0, "Children count cannot be negative")
    .max(9, "Maximum 9 children"),
  infants: z
    .number()
    .int()
    .min(0, "Infants count cannot be negative")
    .max(9, "Maximum 9 infants"),
})

export const travellerCompositionSchema = travellerPartyBaseSchema
  .refine((data) => data.adults + data.children + data.infants <= 9, {
    message: "Total travellers cannot exceed 9",
    path: ["adults"],
  })
  .refine((data) => data.infants <= data.adults, {
    message: "Infant count cannot exceed adult count",
    path: ["infants"],
  })

export type TravellerComposition = z.infer<typeof travellerCompositionSchema>

export const contactEnquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .min(7, "Phone number is too short")
    .regex(/^[+0-9\s-()]+$/, "Please enter a valid phone number"),
  service: z.enum(["flights", "hotels", "packages", "visa", "cars", "general"]),
  message: z
    .string()
    .min(10, "Please describe your travel plans (min 10 characters)"),
})

export type ContactEnquiry = z.infer<typeof contactEnquirySchema>

export const callbackRequestSchema = z.object({
  customerName: z.string().min(2, "Enter your name so we know who to call"),
  customerPhone: z
    .string()
    .min(7, "Enter a valid phone number so we can reach you")
    .regex(/^[+0-9\s-()]+$/, "Enter a valid phone number so we can reach you"),
  customerNotes: z
    .string()
    .max(280, "Keep details under 280 characters")
    .optional(),
})

export type CallbackRequest = z.infer<typeof callbackRequestSchema>

// ---------------------------------------------------------------------------
// Guided Traveller + Customer entry — Phase 3, ticket 06.
// Extends travellerCompositionSchema (counts) with per-Traveller details that
// mirror apidoc.yaml TravelerRequest: TravelerTypeEnum (ADULT, CHILD,
// HELD_INFANT) and GenderEnum (MALE, FEMALE). International paths require
// passport number, expiry, and nationality; domestic paths hide them.
// Date of birth hard-validates real non-future dates only — infant/child age
// bands surface as soft warnings via getTravellerAgeWarnings, never as
// rejections. Phones reuse nigerianPhoneSchema (accept + normalize).
// ---------------------------------------------------------------------------

export const travelerTypeSchema = z.enum(["ADULT", "CHILD", "HELD_INFANT"])
export type TravelerType = z.infer<typeof travelerTypeSchema>

export const genderSchema = z.enum(["MALE", "FEMALE"])
export type Gender = z.infer<typeof genderSchema>

const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Parse a YYYY-MM-DD string into a UTC-midnight date, or null when impossible. */
function parseCalendarDate(value: string): Date | null {
  if (!DATE_STRING_PATTERN.test(value)) return null
  const [y, m, d] = value.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (Number.isNaN(date.getTime())) return null
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null
  }
  return date
}

/** Start of today (local) as a UTC timestamp — day-precision comparisons. */
function startOfTodayUtc(): number {
  const now = new Date()
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Date of birth: real calendar date, today or earlier. Future is a hard error. */
export const dateOfBirthSchema = z
  .string()
  .trim()
  .regex(DATE_STRING_PATTERN, "Enter a valid date of birth (YYYY-MM-DD)")
  .refine((value) => parseCalendarDate(value) !== null, {
    message: "Enter a valid date of birth (YYYY-MM-DD)",
  })
  .refine(
    (value) => {
      const date = parseCalendarDate(value)
      if (date === null) return true // Validity reported above.
      return date.getTime() <= startOfTodayUtc()
    },
    { message: "Date of birth cannot be in the future" }
  )

/** Gender select — refine (not enum) so an untouched select reads human. */
function genderField(label: string) {
  return z
    .string()
    .refine((value) => value === "MALE" || value === "FEMALE", {
      message: `Select the ${label} gender`,
    })
    .transform((value) => value as Gender)
}

const travellerBaseFields = {
  first_name: z
    .string()
    .trim()
    .min(1, "Enter the traveller's first name")
    .max(100, "First name must be 100 characters or fewer"),
  last_name: z
    .string()
    .trim()
    .min(1, "Enter the traveller's last name")
    .max(100, "Last name must be 100 characters or fewer"),
  date_of_birth: dateOfBirthSchema,
  gender: genderField("traveller's"),
  email: emailSchema,
  phone_country_code: z
    .string()
    .trim()
    .regex(
      /^\d{1,4}$/,
      "Enter the country code as 1–4 digits (e.g. 234 for Nigeria)"
    ),
  phone: nigerianPhoneSchema("Phone number"),
  // Auto-assigned from the search-step composition — never user-edited.
  traveler_type: travelerTypeSchema,
}

const passportFields = {
  passport_number: z
    .string()
    .trim()
    .min(1, "Enter the passport number")
    .max(30, "Passport number must be 30 characters or fewer"),
  passport_expiry: futureDateStringSchema("Passport expiry"),
  nationality: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Enter the 2-letter nationality code (e.g. NG)"),
}

/** Domestic items carry no passport requirements — the UI hides them entirely. */
const domesticPassportFields = {
  passport_number: z.string().optional(),
  passport_expiry: z.string().optional(),
  nationality: z.string().optional(),
}

function travellerItemSchema(isInternational: boolean) {
  return isInternational
    ? z.object({ ...travellerBaseFields, ...passportFields })
    : z.object({ ...travellerBaseFields, ...domesticPassportFields })
}

/** Paying contact — strict only when contact-is-first-Traveller is unchecked. */
export const bookingCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the contact name (at least 2 characters)")
    .max(150, "Contact name is too long"),
  email: emailSchema,
  phone: nigerianPhoneSchema("Phone number"),
})

export type BookingCustomer = z.infer<typeof bookingCustomerSchema>

/** Single form shape for both paths — passport keys stay optional in the type. */
export interface TravellerFormTraveller {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: Gender
  email: string
  phone_country_code: string
  /** Normalized (`+<digits>`) after schema parse. */
  phone: string
  traveler_type: TravelerType
  passport_number?: string | undefined
  passport_expiry?: string | undefined
  nationality?: string | undefined
}

export interface TravellerFormValues {
  travellers: TravellerFormTraveller[]
  contactIsFirstTraveller: boolean
  /** Lenient until submit — strict-validated only when the copy box is unchecked. */
  customer: { name: string; email: string; phone: string }
}

export interface TravellerFormOptions {
  /** Expected party from the search step — counts are enforced against it. */
  party: TravellerComposition
  isInternational: boolean
}

/** "1 adult traveller" / "2 adult travellers" — shared with checkout UI. */
export function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`
}

/** Party counts summed — shared by checkout progress and summaries. */
export function totalTravellers(party: TravellerComposition): number {
  return party.adults + party.children + party.infants
}

/**
 * Guided traveller-entry schema. Composition is enforced from the travellers
 * array itself (total ≤ 9, infants ≤ adults — same copy as the search step)
 * plus equality against the expected search-step party.
 */
export function createTravellerFormSchema(
  options: TravellerFormOptions
): z.ZodType<TravellerFormValues, any> {
  const { party, isInternational } = options
  const itemSchema = travellerItemSchema(isInternational)

  return z
    .object({
      travellers: z.array(itemSchema).superRefine((travellers, ctx) => {
        // Single pass over the party (vercel: js-combine-iterations).
        let adults = 0
        let children = 0
        let infants = 0
        for (const traveller of travellers) {
          if (traveller.traveler_type === "ADULT") adults += 1
          else if (traveller.traveler_type === "CHILD") children += 1
          else infants += 1
        }
        if (travellers.length > 9) {
          ctx.addIssue({
            code: "custom",
            message: "Total travellers cannot exceed 9",
            path: ["travellers"],
          })
        }
        if (infants > adults) {
          ctx.addIssue({
            code: "custom",
            message: "Infant count cannot exceed adult count",
            path: ["travellers"],
          })
        }
        if (adults !== party.adults) {
          ctx.addIssue({
            code: "custom",
            message: `This booking needs ${pluralize(party.adults, "adult traveller")} — change the party on the search step`,
            path: ["travellers"],
          })
        }
        if (children !== party.children) {
          ctx.addIssue({
            code: "custom",
            message: `This booking needs ${pluralize(party.children, "child traveller")} — change the party on the search step`,
            path: ["travellers"],
          })
        }
        if (infants !== party.infants) {
          ctx.addIssue({
            code: "custom",
            message: `This booking needs ${pluralize(party.infants, "held infant")} — change the party on the search step`,
            path: ["travellers"],
          })
        }
      }),
      contactIsFirstTraveller: z.boolean(),
      customer: z.object({
        name: z.string(),
        email: z.string(),
        phone: z.string(),
      }),
    })
    .superRefine((data, ctx) => {
      if (data.contactIsFirstTraveller) return
      const parsed = bookingCustomerSchema.safeParse(data.customer)
      if (parsed.success) return
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: ["customer", ...issue.path.map(String)],
        })
      }
    })
}

// ---------------------------------------------------------------------------
// Soft age-band warnings — pure over literal inputs, never rejections.
// ---------------------------------------------------------------------------

export interface TravellerAgeWarning {
  index: number
  traveler_type: TravelerType
  ageYears: number
  message: string
}

function wholeYearsBetween(birthUtc: Date, nowUtc: number): number {
  const now = new Date(nowUtc)
  let age = now.getUTCFullYear() - birthUtc.getUTCFullYear()
  if (
    now.getUTCMonth() < birthUtc.getUTCMonth() ||
    (now.getUTCMonth() === birthUtc.getUTCMonth() &&
      now.getUTCDate() < birthUtc.getUTCDate())
  ) {
    age -= 1
  }
  return age
}

/**
 * Infant older than 2, or child outside 2–11, yields a warning the guest can
 * continue past. Invalid dates yield nothing — the schema hard-errors those.
 */
export function getTravellerAgeWarnings(
  travellers: ReadonlyArray<{
    date_of_birth: string
    traveler_type: TravelerType
  }>
): TravellerAgeWarning[] {
  const today = startOfTodayUtc()
  const warnings: TravellerAgeWarning[] = []
  travellers.forEach((traveller, index) => {
    const birth = parseCalendarDate(traveller.date_of_birth.trim())
    if (birth === null || birth.getTime() > today) return
    const age = wholeYearsBetween(birth, today)
    if (traveller.traveler_type === "HELD_INFANT" && age > 2) {
      warnings.push({
        index,
        traveler_type: traveller.traveler_type,
        ageYears: age,
        message: `Traveller ${index + 1} is ${age} years old — older than 2 years, so most airlines require a child fare instead of an infant fare. You can continue.`,
      })
    } else if (traveller.traveler_type === "CHILD" && (age < 2 || age > 11)) {
      warnings.push({
        index,
        traveler_type: traveller.traveler_type,
        ageYears: age,
        message: `Traveller ${index + 1} is ${age} years old — outside the usual 2–11 year child range. You can continue.`,
      })
    }
  })
  return warnings
}

// ---------------------------------------------------------------------------
// Submission payload — mirrors apidoc.yaml TravelerRequest (snake_case).
// ---------------------------------------------------------------------------

export interface BookingTravellerPayload {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: Gender
  email: string
  phone_country_code: string
  phone: string
  traveler_type: TravelerType
  passport_number?: string | undefined
  passport_expiry?: string | undefined
  nationality?: string | undefined
}

export interface BookingTravellersPayload {
  travellers: BookingTravellerPayload[]
  customer: BookingCustomer
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim()
  return trimmed === "" ? undefined : trimmed
}

/** Contact-is-first-Traveller copy: name, email, and phone from Traveller 1. */
export function deriveCustomerFromTraveller(
  traveller: Pick<
    TravellerFormTraveller,
    "first_name" | "last_name" | "email" | "phone"
  >
): { name: string; email: string; phone: string } {
  return {
    name: `${traveller.first_name.trim()} ${traveller.last_name.trim()}`.trim(),
    email: traveller.email,
    phone: traveller.phone,
  }
}

/**
 * Build the normalized submission payload from schema-parsed values
 * (resolver output — phones already E.164-ish). Passport keys are included
 * only when filled, so domestic payloads carry none. No raw backend errors
 * can surface here: inputs are schema-valid by construction.
 */
export function buildBookingTravellersPayload(
  values: TravellerFormValues
): BookingTravellersPayload {
  const travellers: BookingTravellerPayload[] = values.travellers.map(
    (traveller) => {
      const passport_number = emptyToUndefined(traveller.passport_number)
      const passport_expiry = emptyToUndefined(traveller.passport_expiry)
      const nationality = emptyToUndefined(traveller.nationality)
      return {
        first_name: traveller.first_name.trim(),
        last_name: traveller.last_name.trim(),
        date_of_birth: traveller.date_of_birth.trim(),
        gender: traveller.gender,
        email: traveller.email,
        phone_country_code: traveller.phone_country_code.trim(),
        phone: traveller.phone,
        traveler_type: traveller.traveler_type,
        ...(passport_number !== undefined ? { passport_number } : null),
        ...(passport_expiry !== undefined ? { passport_expiry } : null),
        ...(nationality !== undefined
          ? { nationality: nationality.toUpperCase() }
          : null),
      }
    }
  )

  const rawCustomer = values.contactIsFirstTraveller
    ? (() => {
        const first = values.travellers[0]
        if (!first)
          throw new Error("Add at least one traveller before continuing")
        return deriveCustomerFromTraveller(first)
      })()
    : values.customer
  const customer = bookingCustomerSchema.parse(rawCustomer)

  return { travellers, customer }
}

/** Fixed slots from the search-step party — types auto-assigned in order. */
export function createTravellerSlots(
  party: TravellerComposition
): TravellerFormTraveller[] {
  const slots: TravellerFormTraveller[] = []
  const push = (traveler_type: TravelerType) => {
    slots.push({
      first_name: "",
      last_name: "",
      date_of_birth: "",
      gender: "" as Gender,
      email: "",
      phone_country_code: "234",
      phone: "",
      traveler_type,
      passport_number: "",
      passport_expiry: "",
      nationality: "",
    })
  }
  for (let i = 0; i < party.adults; i += 1) push("ADULT")
  for (let i = 0; i < party.children; i += 1) push("CHILD")
  for (let i = 0; i < party.infants; i += 1) push("HELD_INFANT")
  return slots
}

/**
 * Rebuild form defaults from a saved Travellers draft so a refresh, or a
 * return from Paystack, restores exactly what the guest typed. Returns null
 * when the draft no longer matches the expected party composition — callers
 * then start from empty slots rather than guessing.
 */
export function draftToTravellerFormValues(
  party: TravellerComposition,
  draft: BookingTravellersPayload
): TravellerFormValues | null {
  const travellers = draft.travellers
  let adults = 0
  let children = 0
  let infants = 0
  for (const traveller of travellers) {
    if (traveller.traveler_type === "ADULT") adults += 1
    else if (traveller.traveler_type === "CHILD") children += 1
    else infants += 1
  }
  if (
    travellers.length !== party.adults + party.children + party.infants ||
    adults !== party.adults ||
    children !== party.children ||
    infants !== party.infants
  ) {
    return null
  }

  const first = travellers[0]
  const contactFromFirst = first ? deriveCustomerFromTraveller(first) : null
  const contactIsFirstTraveller = contactFromFirst
    ? contactFromFirst.name === draft.customer.name &&
      contactFromFirst.email === draft.customer.email &&
      contactFromFirst.phone === draft.customer.phone
    : true

  return {
    travellers: travellers.map((traveller) => ({
      first_name: traveller.first_name,
      last_name: traveller.last_name,
      date_of_birth: traveller.date_of_birth,
      gender: traveller.gender,
      email: traveller.email,
      phone_country_code: traveller.phone_country_code,
      phone: traveller.phone,
      traveler_type: traveller.traveler_type,
      passport_number: traveller.passport_number ?? "",
      passport_expiry: traveller.passport_expiry ?? "",
      nationality: traveller.nationality ?? "",
    })),
    contactIsFirstTraveller,
    customer: { ...draft.customer },
  }
}
