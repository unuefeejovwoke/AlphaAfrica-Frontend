import { z } from "zod"
import { ApiError, apiGet, apiPost, SEARCH_TIMEOUT_MS, type PaginatedResponse } from "./client.ts"
import { digestKey } from "./booking-key.ts"
import {
  clearSessionKeys,
  resolveBookingOutcome,
  VERIFICATION_REQUEST,
  type VerificationOutcome,
} from "./verification.ts"
import { getSupportWhatsAppUrl } from "../content/company.ts"
import { formatNaira } from "../format.ts"
import { resolveListingImageUrl } from "../listings.ts"
import {
  emailSchema,
  fullNameSchema,
  nigerianPhoneSchema,
} from "./validation.ts"

/**
 * Car rental domain — Phase 5.
 *
 * CONTEXT.md vocabulary: Vehicle = sellable hire with name/slug, type,
 * hourly rate in Naira, passenger capacity, city, image. Car Booking =
 * Vehicle + pickup/drop-off free-text + future pickup_datetime + num_hours
 * + guest contact, paid via Paystack reference.
 *
 * Backend contract (apidoc + guide §7):
 * - `GET /api/cars/?vehicle_type=&max_rate=&ordering=` — public list
 * - `GET /api/cars/{slug}/` — public detail (ISR)
 * - `POST /api/cars/bookings/create/` — guest booking, returns Paystack
 *   authorization_url + reference. Total = hourly_rate × num_hours.
 * - `GET /api/cars/bookings/verify/{reference}/` — fallback verify;
 *   universal `GET /api/payments/order/<reference>/` is primary.
 *
 * Decisions locked with owner: route `/cars`, min hire 1hr, separate date +
 * time inputs submitted as UTC ISO, city display-only (no filter), hourly
 * pricing only (no day-rate helpers).
 */

export const VEHICLE_TYPES = [
  "sedan_executive",
  "suv_executive",
  "sedan_normal",
  "suv_normal",
  "coaster",
  "others",
] as const

export type VehicleType = (typeof VEHICLE_TYPES)[number]

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  sedan_executive: "Executive Sedan",
  suv_executive: "Executive SUV",
  sedan_normal: "Standard Sedan",
  suv_normal: "Standard SUV",
  coaster: "Coaster Bus",
  others: "Other Vehicle",
}

export const CAR_ORDERINGS = ["rate", "-rate", "name"] as const
export type CarOrdering = (typeof CAR_ORDERINGS)[number]

export const MAX_CAR_HOURLY_RATE = 10_000_000
export const MAX_HIRE_HOURS = 720
export const MIN_HIRE_HOURS = 1
const LOCATION_MIN_LENGTH = 3
const LOCATION_MAX_LENGTH = 255

// ---------------------------------------------------------------------------
// Search query — URL state is the single source of truth.
// ---------------------------------------------------------------------------

export const carSearchQuerySchema = z.object({
  vehicle_type: z.enum(VEHICLE_TYPES).optional(),
  max_rate: z
    .number()
    .int("Maximum rate must be whole Naira")
    .positive("Maximum rate must be above ₦0")
    .max(MAX_CAR_HOURLY_RATE, "Maximum rate is too high")
    .optional(),
  ordering: z.enum(CAR_ORDERINGS).optional(),
  page: z.number().int().min(1).optional().default(1),
})

export type CarSearchQueryInput = z.input<typeof carSearchQuerySchema>
export type CarSearchQuery = z.output<typeof carSearchQuerySchema>

export function validateCarSearchQuery(
  query: CarSearchQuery
): { success: true } | { success: false; message: string } {
  const parsed = carSearchQuerySchema.safeParse(query)
  if (parsed.success) return { success: true }
  return {
    success: false,
    message:
      parsed.error.issues[0]?.message ?? "Some hire details need attention.",
  }
}

export type RawSearchParams = Record<string, string | string[] | undefined>

export const CAR_SEARCH_PARAM_KEYS = [
  "vehicle_type",
  "max_rate",
  "ordering",
  "page",
] as const

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

export function hasCarSearchParams(input: RawSearchParams): boolean {
  for (const key of CAR_SEARCH_PARAM_KEYS) {
    const value = firstString(input[key])
    if (typeof value === "string" && value.trim() !== "") return true
  }
  return false
}

function parseBoundedInt(
  value: string | string[] | undefined,
  min: number,
  max?: number
): number | undefined {
  const raw = firstString(value)?.trim()
  if (!raw) return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < min) return undefined
  if (max !== undefined && parsed > max) return undefined
  return parsed
}

function parseCarMaxRate(
  value: string | string[] | undefined
): number | undefined {
  const raw = firstString(value)?.trim().replace(/,/g, "")
  if (!raw) return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_CAR_HOURLY_RATE)
    return undefined
  return parsed
}

function parseVehicleType(
  value: string | string[] | undefined
): VehicleType | undefined {
  const raw = firstString(value)?.trim()
  if (!raw) return undefined
  return (VEHICLE_TYPES as readonly string[]).includes(raw)
    ? (raw as VehicleType)
    : undefined
}

function parseCarOrdering(
  value: string | string[] | undefined
): CarOrdering | undefined {
  const raw = firstString(value)?.trim()
  if (!raw) return undefined
  return (CAR_ORDERINGS as readonly string[]).includes(raw)
    ? (raw as CarOrdering)
    : undefined
}

export function parseCarSearchParams(input: RawSearchParams): CarSearchQuery {
  const query: CarSearchQuery = {
    vehicle_type: parseVehicleType(input.vehicle_type),
    max_rate: parseCarMaxRate(input.max_rate),
    ordering: parseCarOrdering(input.ordering),
    page: parseBoundedInt(input.page, 1) ?? 1,
  }
  const parsed = carSearchQuerySchema.safeParse(query)
  return parsed.success ? parsed.data : query
}

function carQueryEntries(query: CarSearchQuery): [string, string][] {
  const entries: [string, string][] = []
  if (query.vehicle_type !== undefined)
    entries.push(["vehicle_type", query.vehicle_type])
  if (query.max_rate !== undefined)
    entries.push(["max_rate", String(query.max_rate)])
  if (query.ordering !== undefined) entries.push(["ordering", query.ordering])
  if (query.page > 1) entries.push(["page", String(query.page)])
  return entries
}

export function buildCarSearchParams(query: CarSearchQuery): string {
  return new URLSearchParams(carQueryEntries(query)).toString()
}

export function toCarApiQuery(query: CarSearchQuery): Record<string, string> {
  return Object.fromEntries(carQueryEntries(query))
}

// ---------------------------------------------------------------------------
// Listing + detail reads
// ---------------------------------------------------------------------------

export const vehicleListSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  vehicle_type: z.enum(VEHICLE_TYPES),
  vehicle_type_display: z.string().optional().default(""),
  hourly_rate: z.string().optional().default("0.00"),
  capacity: z.number().int().min(0).optional().default(0),
  city: z.string().optional().default(""),
  main_image: z.string().optional().default(""),
})

export type VehicleList = z.infer<typeof vehicleListSchema>

export const paginatedVehicleListSchema = z.object({
  count: z.number().int().min(0),
  next: z.string().nullable().default(null),
  previous: z.string().nullable().default(null),
  results: z.array(vehicleListSchema),
})

export type PaginatedVehicles = PaginatedResponse<VehicleList>

export async function getVehicles(
  query: CarSearchQuery
): Promise<PaginatedVehicles> {
  const raw = await apiGet<unknown>("/api/cars/", {
    query: toCarApiQuery(query),
    noStore: true,
    timeoutMs: SEARCH_TIMEOUT_MS,
  })
  const parsed = paginatedVehicleListSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("Invalid response from the car rental service.", {
      status: 200,
      code: "server",
    })
  }
  return parsed.data
}

/**
 * Featured Vehicles for Home. The cars endpoint exposes no server-side
 * featured flag, so this reads the first browse-all page (ISR-cached like
 * `listVehicleSlugs`) and slices to `limit`. Empty stays empty (§12).
 */
export async function getFeaturedVehicles(limit = 3): Promise<VehicleList[]> {
  const raw = await apiGet<unknown>("/api/cars/", {
    query: { page: 1 },
    tags: ["cars"],
  })
  const parsed = paginatedVehicleListSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("Invalid response from the car rental service.", {
      status: 200,
      code: "server",
    })
  }
  return parsed.data.results.slice(0, Math.max(1, limit))
}

export const vehicleDetailSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  vehicle_type: z.enum(VEHICLE_TYPES),
  vehicle_type_display: z.string().optional().default(""),
  description: z.string().optional().default(""),
  hourly_rate: z.string().optional().default("0.00"),
  capacity: z.number().int().min(0).optional().default(0),
  city: z.string().optional().default(""),
  main_image: z.string().optional().default(""),
})

export type VehicleDetail = z.infer<typeof vehicleDetailSchema>

export async function getVehicleDetail(slug: string): Promise<VehicleDetail> {
  const raw = await apiGet<unknown>(`/api/cars/${encodeURIComponent(slug)}/`, {
    tags: ["cars", `car:${slug}`],
  })
  const parsed = vehicleDetailSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError("Invalid response from the car rental service.", {
      status: 200,
      code: "server",
    })
  }
  return parsed.data
}

export async function listVehicleSlugs(): Promise<string[]> {
  const raw = await apiGet<unknown>("/api/cars/", {
    query: { page: 1 },
    tags: ["cars"],
  })
  const parsed = paginatedVehicleListSchema.safeParse(raw)
  if (!parsed.success) return []
  return parsed.data.results.map((vehicle) => vehicle.slug)
}

// ---------------------------------------------------------------------------
// Card + detail display mapping
// ---------------------------------------------------------------------------

export interface VehicleCardDisplay {
  href: string
  imageSrc: string
  imageAlt: string
  typeLabel: string
  placeLabel: string | null
  capacityLabel: string | null
  priceLabel: string | null
}

export function formatCarHourlyRate(
  hourlyRate: string | null | undefined
): string | null {
  if (hourlyRate === null || hourlyRate === undefined) return null
  const trimmed = hourlyRate.replace(/,/g, "").trim()
  if (trimmed.length === 0) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return `${formatNaira(trimmed)}/hr`
}

function vehicleTypeLabel(vehicle: {
  vehicle_type: VehicleType
  vehicle_type_display?: string | null
}): string {
  const display = (vehicle.vehicle_type_display ?? "").trim()
  if (display.length > 0) return display
  return VEHICLE_TYPE_LABELS[vehicle.vehicle_type]
}

export function formatVehicleCapacity(capacity: number): string | null {
  if (!Number.isInteger(capacity) || capacity <= 0) return null
  return capacity === 1 ? "1 passenger" : `${capacity} passengers`
}

export function toVehicleCardDisplay(vehicle: VehicleList): VehicleCardDisplay {
  const city = vehicle.city.trim()
  return {
    href: `/cars/${vehicle.slug}`,
    imageSrc: resolveListingImageUrl(vehicle.main_image),
    imageAlt: `${vehicle.name} — ${vehicleTypeLabel(vehicle)}${city ? ` in ${city}` : ""}`,
    typeLabel: vehicleTypeLabel(vehicle),
    placeLabel: city.length > 0 ? city : null,
    capacityLabel: formatVehicleCapacity(vehicle.capacity),
    priceLabel: formatCarHourlyRate(vehicle.hourly_rate),
  }
}

export interface VehicleDetailDisplay extends VehicleCardDisplay {
  name: string
  description: string
}

export function toVehicleDetailDisplay(
  vehicle: VehicleDetail
): VehicleDetailDisplay {
  const card = toVehicleCardDisplay(vehicle)
  return {
    ...card,
    name: vehicle.name,
    description: vehicle.description,
  }
}

// ---------------------------------------------------------------------------
// Hire datetime + preview arithmetic (pure, tested seams)
// ---------------------------------------------------------------------------

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function parseCalendarDate(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) return null
  const [y, m, d] = value.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null
  }
  return date
}

/**
 * Combine separate date (YYYY-MM-DD) + time (HH:MM) inputs into a UTC ISO
 * string for `pickup_datetime`. Returns null when the pair is not a real
 * future datetime. Pure seam — no DOM, no fetch.
 */
export function combinePickupDateTime(
  date: string,
  time: string,
  now: Date = new Date()
): string | null {
  const cleanDate = date.trim()
  const cleanTime = time.trim()
  if (!DATE_PATTERN.test(cleanDate) || !TIME_PATTERN.test(cleanTime))
    return null
  const calendar = parseCalendarDate(cleanDate)
  if (calendar === null) return null
  const [hh, mm] = cleanTime.split(":").map(Number)
  const pickup = new Date(
    Date.UTC(
      calendar.getUTCFullYear(),
      calendar.getUTCMonth(),
      calendar.getUTCDate(),
      hh,
      mm,
      0,
      0
    )
  )
  if (Number.isNaN(pickup.getTime())) return null
  if (pickup.getTime() <= now.getTime()) return null
  return pickup.toISOString()
}

/** Split a stored ISO datetime back into date + time inputs (lenient). */
export function splitPickupDateTime(iso: string): {
  date: string
  time: string
} {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return { date: "", time: "" }
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(parsed.getUTCDate())}`,
    time: `${pad(parsed.getUTCHours())}:${pad(parsed.getUTCMinutes())}`,
  }
}

export interface HirePreviewInput {
  hourlyRate: string | null | undefined
  numHours: number | null | undefined
}

/**
 * Preview arithmetic: hourly_rate × hours in whole Naira. Display only —
 * the charged total comes exclusively from backend creation/verification.
 */
export function previewHireTotal(input: HirePreviewInput): number | null {
  const hours = input.numHours ?? 0
  if (!Number.isInteger(hours) || hours < MIN_HIRE_HOURS) return null
  const raw = (input.hourlyRate ?? "").replace(/,/g, "").trim()
  if (raw.length === 0) return null
  const rate = Number(raw)
  if (!Number.isFinite(rate) || rate <= 0) return null
  return Math.round(rate * hours)
}

// ---------------------------------------------------------------------------
// Hire handoff — URL carries trip only (no PII, no payment data)
// ---------------------------------------------------------------------------

export interface CarHireStay {
  pickup_location: string
  dropoff_location: string
  pickup_date: string
  pickup_time: string
  num_hours: number
}

export interface ParsedCarHireStay {
  pickup_location: string
  dropoff_location: string
  pickup_date: string
  pickup_time: string
  num_hours?: number
}

export function buildCarHireParams(stay: CarHireStay): string {
  const params = new URLSearchParams()
  if (stay.pickup_location.trim().length > 0)
    params.set("pickup_location", stay.pickup_location.trim())
  if (stay.dropoff_location.trim().length > 0)
    params.set("dropoff_location", stay.dropoff_location.trim())
  if (stay.pickup_date.trim().length > 0)
    params.set("pickup_date", stay.pickup_date.trim())
  if (stay.pickup_time.trim().length > 0)
    params.set("pickup_time", stay.pickup_time.trim())
  params.set("num_hours", String(stay.num_hours))
  return params.toString()
}

export function parseCarHireParams(input: RawSearchParams): ParsedCarHireStay {
  const hoursRaw = firstString(input.num_hours)?.trim() ?? ""
  const hours =
    /^\d+$/.test(hoursRaw) &&
    Number(hoursRaw) >= MIN_HIRE_HOURS &&
    Number(hoursRaw) <= MAX_HIRE_HOURS
      ? Number(hoursRaw)
      : undefined
  return {
    pickup_location: firstString(input.pickup_location)?.trim() ?? "",
    dropoff_location: firstString(input.dropoff_location)?.trim() ?? "",
    pickup_date: firstString(input.pickup_date)?.trim() ?? "",
    pickup_time: firstString(input.pickup_time)?.trim() ?? "",
    num_hours: hours,
  }
}

const locationSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(
      LOCATION_MIN_LENGTH,
      `${label} needs at least ${LOCATION_MIN_LENGTH} characters`
    )
    .max(LOCATION_MAX_LENGTH, `${label} is too long`)

/** Trip shape validated on blur + submit + pre-payment. */
export const carHireSchema = z.object({
  pickup_location: locationSchema("Pickup location"),
  dropoff_location: locationSchema("Drop-off location"),
  pickup_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid pickup date (YYYY-MM-DD)"),
  pickup_time: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Enter a valid pickup time (HH:MM)"),
  num_hours: z
    .number()
    .int("Hours must be a whole number")
    .min(MIN_HIRE_HOURS, "At least 1 hour is required")
    .max(MAX_HIRE_HOURS, `Hire cannot exceed ${MAX_HIRE_HOURS} hours`),
})

export type CarHireInput = z.input<typeof carHireSchema>

// ---------------------------------------------------------------------------
// Guest form + creation with Paystack redirect
// ---------------------------------------------------------------------------

export const carGuestSchema = z.object({
  guest_name: fullNameSchema,
  guest_email: emailSchema,
  guest_phone: nigerianPhoneSchema("Phone number"),
})

export type CarGuestInput = z.input<typeof carGuestSchema>
export type CarGuest = z.output<typeof carGuestSchema>

export const carBookingCreateRequestSchema = z.object({
  vehicle_id: z.number().int().positive(),
  pickup_location: locationSchema("Pickup location"),
  dropoff_location: locationSchema("Drop-off location"),
  pickup_datetime: z
    .string()
    .trim()
    .min(1, "Add a pickup date and time")
    .refine(
      (value) => {
        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) return false
        return parsed.getTime() > Date.now()
      },
      { message: "Pickup must be in the future" }
    ),
  num_hours: z.number().int().min(MIN_HIRE_HOURS).max(MAX_HIRE_HOURS),
  guest_name: fullNameSchema,
  guest_email: emailSchema,
  guest_phone: nigerianPhoneSchema("Phone number"),
})

export type CarBookingCreatePayload = z.infer<
  typeof carBookingCreateRequestSchema
>

export interface BuildCarBookingPayloadInput {
  vehicle_id: number
  pickup_location: string
  dropoff_location: string
  pickup_datetime: string
  num_hours: number
  guest_name: string
  guest_email: string
  guest_phone: string
}

export function buildCarBookingPayload(
  input: BuildCarBookingPayloadInput
): CarBookingCreatePayload {
  return carBookingCreateRequestSchema.parse(input)
}

export const carBookingCreateResultSchema = z.object({
  reference: z.string().min(1),
  authorization_url: z.string().min(1),
})

export type CarBookingCreateResult = z.infer<
  typeof carBookingCreateResultSchema
>

/** Either live shape: flat (apidoc) or `{ booking, payment }` envelope. */
const carBookingCreateEnvelopeSchema = z
  .object({
    reference: z.string().optional(),
    authorization_url: z.string().optional(),
    booking: z
      .object({ reference: z.string().optional() })
      .passthrough()
      .optional(),
    payment: z
      .object({
        reference: z.string().optional(),
        authorization_url: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export function normalizeCarBookingCreateResult(
  raw: unknown
): CarBookingCreateResult | null {
  const direct = carBookingCreateResultSchema.safeParse(raw)
  if (direct.success) return direct.data
  const parsed = carBookingCreateEnvelopeSchema.safeParse(raw)
  if (!parsed.success) return null
  const { booking, payment } = parsed.data
  const reference =
    payment?.reference ?? booking?.reference ?? parsed.data.reference
  const authorization_url =
    payment?.authorization_url ?? parsed.data.authorization_url
  if (!reference || !authorization_url) return null
  return { reference, authorization_url }
}

export async function createCarBooking(
  payload: CarBookingCreatePayload
): Promise<CarBookingCreateResult> {
  const raw = await apiPost<unknown, Record<string, unknown>>(
    "/api/cars/bookings/create/",
    payload as Record<string, unknown>,
    { sameOrigin: true }
  )
  const normalized = normalizeCarBookingCreateResult(raw)
  if (!normalized) {
    throw new ApiError("Invalid response from the car rental service.", {
      status: 201,
      code: "server",
    })
  }
  return normalized
}

// ---------------------------------------------------------------------------
// Single-flight creation guard
// ---------------------------------------------------------------------------

export interface PendingCarBookingRecord {
  key: string
  reference: string
  authorization_url: string
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null"
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`
  }
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`
}

export function hashCarBookingKey(payload: CarBookingCreatePayload): string {
  return digestKey(stableStringify(payload))
}

export function findReusableCarBooking(
  stored: PendingCarBookingRecord | null,
  key: string
): { reference: string; authorization_url: string } | null {
  if (!stored || stored.key !== key) return null
  if (!stored.reference || !stored.authorization_url) return null
  return {
    reference: stored.reference,
    authorization_url: stored.authorization_url,
  }
}

export const PENDING_CAR_BOOKING_SESSION_KEY = "alphaa:pending-car-booking:v1"
export const CAR_PAYMENT_REFERENCE_SESSION_KEY =
  "alphaa:car-payment-reference:v1"

export function savePendingCarBooking(record: PendingCarBookingRecord): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      PENDING_CAR_BOOKING_SESSION_KEY,
      JSON.stringify(record)
    )
  } catch {
    // private mode — creation still ran
  }
}

export function readPendingCarBooking(): PendingCarBookingRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(PENDING_CAR_BOOKING_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== "object" || parsed === null) return null
    const record = parsed as Record<string, unknown>
    if (
      typeof record.key !== "string" ||
      typeof record.reference !== "string" ||
      typeof record.authorization_url !== "string"
    ) {
      return null
    }
    return {
      key: record.key,
      reference: record.reference,
      authorization_url: record.authorization_url,
    }
  } catch {
    return null
  }
}

export function saveCarPaymentReference(reference: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(CAR_PAYMENT_REFERENCE_SESSION_KEY, reference)
  } catch {
    // URL copy still works
  }
}

export function readCarPaymentReference(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(CAR_PAYMENT_REFERENCE_SESSION_KEY)
  } catch {
    return null
  }
}

/**
 * Drop the stored Car Booking and Payment Reference once a payment is
 * verified as paid. Back/forward can then never re-enter checkout with a
 * completed hire; the confirmation page keeps rendering from its fetched
 * booking, and the reference stays in the URL for refreshes.
 */
export function clearCarBookingSession(): void {
  clearSessionKeys([
    PENDING_CAR_BOOKING_SESSION_KEY,
    CAR_PAYMENT_REFERENCE_SESSION_KEY,
  ])
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Terminal verification outcome for a Car Booking. Delegates to the shared
 * verification seam so every booking type resolves the same vocabulary:
 * `confirmed` — plus the order lookup's money-movement synonyms
 * (`paid`/`success`) — counts as confirmed so an order-first flow never
 * renders a paid hire as "still processing". Unrecognized states stay
 * pending so the customer keeps checking instead of assuming failure.
 */
export type CarVerificationOutcome = VerificationOutcome

export function resolveCarVerificationState(booking: {
  status?: string | null
}): CarVerificationOutcome {
  return resolveBookingOutcome("car", booking.status)
}

export const carBookingSchema = z.object({
  reference: z.string(),
  vehicle_name: z.string().optional().default(""),
  vehicle_type: z.string().optional().default(""),
  guest_name: z.string().optional().default(""),
  guest_email: z.string().optional().default(""),
  guest_phone: z.string().optional().default(""),
  pickup_location: z.string().optional().default(""),
  dropoff_location: z.string().optional().default(""),
  pickup_datetime: z.string().optional().default(""),
  num_hours: z.number().int().nonnegative().optional().default(0),
  hourly_rate: z.union([z.string(), z.number()]).optional().default(""),
  total_amount: z.union([z.string(), z.number()]).optional().default(""),
  status: z.string().optional().default("pending"),
})

export type CarBooking = z.infer<typeof carBookingSchema>

export async function verifyCarBooking(reference: string): Promise<CarBooking> {
  const raw = await apiGet<unknown>(
    `/api/cars/bookings/verify/${encodeURIComponent(reference)}/`,
    { ...VERIFICATION_REQUEST }
  )
  return carBookingSchema.parse(raw)
}

export function buildCarConfirmationUrl(reference: string): string {
  return `/cars/confirmation?reference=${encodeURIComponent(reference)}`
}

// ---------------------------------------------------------------------------
// Support context
// ---------------------------------------------------------------------------

export interface CarHireContext {
  pickup_location?: string | null
  num_hours?: number | null
  vehicle_name?: string | null
}

export function describeCarHire(hire: CarHireContext): string {
  const parts: string[] = []
  if (hire.vehicle_name && hire.vehicle_name.trim().length > 0) {
    parts.push(hire.vehicle_name.trim())
  }
  if (hire.pickup_location && hire.pickup_location.trim().length > 0) {
    parts.push(`pickup at ${hire.pickup_location.trim()}`)
  }
  if (hire.num_hours && hire.num_hours > 0) {
    parts.push(
      `for ${hire.num_hours} ${hire.num_hours === 1 ? "hour" : "hours"}`
    )
  }
  return parts.join(" ")
}

export function getCarSupportWhatsAppUrl(
  topic: string,
  hire?: CarHireContext
): string {
  const detail = hire ? describeCarHire(hire) : ""
  const context = detail ? `${topic} (${detail})` : topic
  return getSupportWhatsAppUrl(context)
}

// ---------------------------------------------------------------------------
// Listing presentation — pure, tested seams for the sidebar listing.
// Backend contract stays `vehicle_type/max_rate/ordering/page` only.
// ---------------------------------------------------------------------------

/** Sort vocabulary for the sidebar (backend `ordering` only). */
export const CAR_ORDERING_OPTIONS: {
  value: CarOrdering | ""
  label: string
}[] = [
  { value: "", label: "Default order" },
  { value: "rate", label: "Rate: low to high" },
  { value: "-rate", label: "Rate: high to low" },
  { value: "name", label: "Name A–Z" },
]

/** Hourly-cap presets — single-tap alternatives to typing a custom cap. */
export const CAR_MAX_RATE_BANDS: { value: number | null; label: string }[] = [
  { value: null, label: "Any rate" },
  { value: 25000, label: "Up to ₦25,000" },
  { value: 50000, label: "Up to ₦50,000" },
  { value: 100000, label: "Up to ₦100,000" },
  { value: 150000, label: "Up to ₦150,000" },
  { value: 250000, label: "Up to ₦250,000" },
]

/** Number of active server-filter groups (type + rate + sort). */
export function countActiveCarFilters(query: {
  vehicle_type?: VehicleType
  max_rate?: number
  ordering?: CarOrdering
}): number {
  return (
    (query.vehicle_type !== undefined ? 1 : 0) +
    (query.max_rate !== undefined ? 1 : 0) +
    (query.ordering !== undefined ? 1 : 0)
  )
}

export interface CarPaginationInput {
  page: number
  totalCount: number
  pageSize: number
  visibleCount: number
}

export interface CarPagination {
  totalPages: number
  start: number
  end: number
}

/**
 * Numbered-pagination arithmetic over DRF `count/next/previous` shapes.
 * `pageSize` is the observed full-page length (first full page wins);
 * `visibleCount` is this page's result length so the last-page range stays
 * honest (`Showing 11–13 of 13`, never `11–20 of 13`).
 */
export function getCarPagination(input: CarPaginationInput): CarPagination {
  const { page, totalCount, visibleCount } = input
  const pageSize =
    Number.isInteger(input.pageSize) && input.pageSize > 0
      ? input.pageSize
      : visibleCount > 0
        ? visibleCount
        : 1
  if (totalCount <= 0 || visibleCount <= 0) {
    return { totalPages: 0, start: 0, end: 0 }
  }
  const safePage = Number.isInteger(page) && page > 0 ? page : 1
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const start = (safePage - 1) * pageSize + 1
  const end = Math.min(totalCount, start + visibleCount - 1)
  return { totalPages, start, end }
}

export type CarPageItem = number | "ellipsis"

/**
 * Compact page-item window: always the first/last page plus
 * `sibling` neighbours around the current page, with ellipsis gaps.
 * Pure seam so the pagination UI is unit-testable.
 */
export function getCarPageItems(
  page: number,
  totalPages: number,
  sibling = 1
): CarPageItem[] {
  if (!Number.isInteger(totalPages) || totalPages <= 0) return []
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const safePage = Math.min(Math.max(1, page), totalPages)
  const near = new Set<number>([1, totalPages, safePage])
  for (let i = 1; i <= Math.max(0, sibling); i++) {
    if (safePage - i > 1) near.add(safePage - i)
    if (safePage + i < totalPages) near.add(safePage + i)
  }
  const sorted = [...near].sort((a, b) => a - b)
  const items: CarPageItem[] = []
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]
    const prev = sorted[i - 1]
    if (i > 0 && current - prev > 1) items.push("ellipsis")
    items.push(current)
  }
  return items
}
