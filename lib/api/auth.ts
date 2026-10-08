import { z } from "zod"
import { emailSchema, nigerianPhoneSchema } from "./validation.ts"

/**
 * Auth account seam (auth spec, ticket 01).
 *
 * The pure foundation every later auth slice builds on: request shaping,
 * response normalization, session-state resolution, Bearer construction,
 * form schemas, and backend field-error mapping. Pure means no `fetch`, no
 * cookies, no storage — same-origin handlers own those through the existing
 * proxy (`./proxy.ts`) and client (`./client.ts`), and error copy stays with
 * `ApiError`/`getHumanErrorMessage`. No second proxy, no second error mapper.
 *
 * Passwords are write-only end to end: builders pass them through untouched
 * and nothing here ever logs, persists, or renders them.
 */

// ---------------------------------------------------------------------------
// Token reading — blank strings count as absent, non-strings never pass.
// ---------------------------------------------------------------------------

function readToken(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function readRecord(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "object" || raw === null) return null
  return raw as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Auth user normalization — backend `User` shape (apidoc `User`).
// ---------------------------------------------------------------------------

const authUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string().nullish().transform((value) => value ?? ""),
  last_name: z.string().nullish().transform((value) => value ?? ""),
  phone_number: z.string().nullish().transform((value) => value ?? ""),
  is_verified: z.boolean().nullish().transform((value) => value ?? false),
  date_joined: z.string().nullish().transform((value) => value ?? ""),
})

export type AuthUser = z.infer<typeof authUserSchema>

/** Malformed user payloads normalize to null — never throw through the UI. */
export function normalizeAuthUser(raw: unknown): AuthUser | null {
  const parsed = authUserSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

/** Register lands on verify while the email flag is still false. */
export function needsEmailVerification(user: AuthUser | null): boolean {
  if (!user) return false
  return !user.is_verified
}

// ---------------------------------------------------------------------------
// Token-pair normalization — login and refresh payloads.
// Login answers `{ access, refresh, user }`; refresh answers
// `{ access, refresh? }`. `*_token` aliases are accepted because the exact
// live key names still need a sandbox check (spec Further Notes).
// ---------------------------------------------------------------------------

export interface AuthTokenPair {
  access: string
  refresh: string | null
}

/** A pair without a usable access token is not a pair — null, never partial. */
export function normalizeTokenPair(raw: unknown): AuthTokenPair | null {
  const record = readRecord(raw)
  if (!record) return null
  const access = readToken(record.access ?? record.access_token)
  if (!access) return null
  return {
    access,
    refresh: readToken(record.refresh ?? record.refresh_token),
  }
}

export type AuthLoginResult =
  | { status: "authenticated"; access: string; refresh: string | null; user: AuthUser | null }
  | { status: "unauthenticated" }

/**
 * Login payloads yield tokens plus the user when present. Missing or
 * malformed token fields resolve to explicit unauthenticated — a 200 with
 * no tokens must never look signed in.
 */
export function normalizeLoginResponse(raw: unknown): AuthLoginResult {
  const pair = normalizeTokenPair(raw)
  if (!pair) return { status: "unauthenticated" }
  const record = readRecord(raw)
  return {
    status: "authenticated",
    access: pair.access,
    refresh: pair.refresh,
    user: record ? normalizeAuthUser(record.user) : null,
  }
}

export type AuthRefreshResult =
  | { status: "refreshed"; access: string; refresh: string | null }
  | { status: "unauthenticated" }

/** Refresh rotates access and may rotate refresh; garbage means re-login. */
export function normalizeRefreshResponse(raw: unknown): AuthRefreshResult {
  const pair = normalizeTokenPair(raw)
  if (!pair) return { status: "unauthenticated" }
  return { status: "refreshed", access: pair.access, refresh: pair.refresh }
}

export type AuthRegisterResult =
  | { status: "registered"; user: AuthUser | null }
  | { status: "unauthenticated" }

/**
 * Register answers the created `User` (201), bare or under a `user` key.
 * Callers check {@link needsEmailVerification} for the verify redirect.
 */
export function normalizeRegisterResponse(raw: unknown): AuthRegisterResult {
  const user =
    normalizeAuthUser(raw) ?? normalizeAuthUser(readRecord(raw)?.user)
  if (!user) return { status: "unauthenticated" }
  return { status: "registered", user }
}

// ---------------------------------------------------------------------------
// Session-state resolution — one classifier for signed-in, refresh-then-retry,
// and signed-out with a login target. Unknown states fall conservatively to
// signed-out so no page ever assumes access.
// ---------------------------------------------------------------------------

export const AUTH_LOGIN_PATH = "/login"

export type AuthSessionState =
  | { status: "signed-in" }
  | { status: "refresh-then-retry" }
  | { status: "signed-out"; loginTarget: string }

export interface AuthSessionInput {
  access?: unknown
  refresh?: unknown
  /** The access token was rejected (401) — retry via refresh, not as-is. */
  accessInvalid?: boolean
  /** The refresh attempt already failed — re-authenticate, never loop. */
  refreshInvalid?: boolean
}

/**
 * Only same-origin paths become `next` targets — an absolute or
 * protocol-relative URL falls back to bare login, never an open redirect.
 * Tokens never enter query construction: only the return path travels.
 */
export function buildLoginTarget(returnTo?: string | null): string {
  if (
    typeof returnTo === "string" &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//")
  ) {
    return `${AUTH_LOGIN_PATH}?next=${encodeURIComponent(returnTo)}`
  }
  return AUTH_LOGIN_PATH
}

export function resolveAuthSession(
  input: AuthSessionInput,
  returnTo?: string | null
): AuthSessionState {
  if (readToken(input.access) && !input.accessInvalid) {
    return { status: "signed-in" }
  }
  if (readToken(input.refresh) && !input.refreshInvalid) {
    return { status: "refresh-then-retry" }
  }
  return { status: "signed-out", loginTarget: buildLoginTarget(returnTo) }
}

// ---------------------------------------------------------------------------
// Bearer construction — tokens travel in headers only. No auth helper takes
// a token into a query, so a copied link can never leak access.
// ---------------------------------------------------------------------------

export function buildAuthHeaders(token: unknown): Record<string, string> {
  const bearer = readToken(token)
  return bearer ? { Authorization: `Bearer ${bearer}` } : {}
}

// ---------------------------------------------------------------------------
// Request shaping — snake_case bodies mirroring apidoc.yaml. Emails trim;
// passwords and codes pass through untouched (write-only, never logged).
// ---------------------------------------------------------------------------

export function buildLoginRequest(input: {
  email: string
  password: string
}): { email: string; password: string } {
  return { email: input.email.trim(), password: input.password }
}

export function buildRegisterRequest(input: {
  email: string
  first_name: string
  last_name: string
  phone_number: string
  password: string
  password2: string
}): {
  email: string
  first_name: string
  last_name: string
  phone_number: string
  password: string
  password2: string
} {
  return {
    email: input.email.trim(),
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    phone_number: input.phone_number.trim(),
    password: input.password,
    password2: input.password2,
  }
}

export function buildRefreshRequest(refresh: string): { refresh: string } {
  return { refresh: refresh.trim() }
}

export function buildVerifyConfirmRequest(input: {
  email: string
  code: string
}): { email: string; code: string } {
  return { email: input.email.trim(), code: input.code.trim() }
}

export function buildVerifyRequestRequest(email: string): { email: string } {
  return { email: email.trim() }
}

export function buildPasswordResetRequestRequest(email: string): {
  email: string
} {
  return { email: email.trim() }
}

export function buildPasswordResetConfirmRequest(input: {
  email: string
  code: string
  new_password: string
}): { email: string; code: string; new_password: string } {
  return {
    email: input.email.trim(),
    code: input.code.trim(),
    new_password: input.new_password,
  }
}

export function buildChangePasswordRequest(input: {
  old_password: string
  new_password: string
}): { old_password: string; new_password: string } {
  return { old_password: input.old_password, new_password: input.new_password }
}

/**
 * Partial-update body (PATCH): only provided, non-blank fields travel, so
 * an untouched phone never overwrites a stored one with an empty string.
 */
export function buildProfileUpdateRequest(input: {
  first_name?: string
  last_name?: string
  phone_number?: string
}): { first_name?: string; last_name?: string; phone_number?: string } {
  const body: { first_name?: string; last_name?: string; phone_number?: string } = {}
  const firstName = input.first_name?.trim()
  const lastName = input.last_name?.trim()
  const phone = input.phone_number?.trim()
  if (firstName) body.first_name = firstName
  if (lastName) body.last_name = lastName
  if (phone) body.phone_number = phone
  return body
}

// ---------------------------------------------------------------------------
// Form schemas — compose the shared email and Nigerian-phone primitives
// (profile validation matches booking-contact strictness, spec story 30).
// Login passwords stay lenient (min 1) so existing weak passwords can still
// sign in; only chosen passwords (register, reset, change) require length.
// ---------------------------------------------------------------------------

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code from your email")

/** Existing credentials are accepted as-is — strength rules apply to new ones only. */
const currentPasswordSchema = z.string().min(1, "Enter your password")

export const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer")

const firstNameSchema = z
  .string()
  .trim()
  .min(1, "Enter your first name")
  .max(150, "First name is too long")

const lastNameSchema = z
  .string()
  .trim()
  .min(1, "Enter your last name")
  .max(150, "Last name is too long")

export const loginSchema = z.object({
  email: emailSchema,
  password: currentPasswordSchema,
})

export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    email: emailSchema,
    first_name: firstNameSchema,
    last_name: lastNameSchema,
    phone_number: nigerianPhoneSchema("Phone number"),
    password: newPasswordSchema,
    password2: newPasswordSchema,
  })
  .refine((values) => values.password === values.password2, {
    message: "Passwords do not match",
    path: ["password2"],
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const verifyConfirmSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
})

export type VerifyConfirmInput = z.infer<typeof verifyConfirmSchema>

export const verifyRequestSchema = z.object({
  email: emailSchema,
})

export type VerifyRequestInput = z.infer<typeof verifyRequestSchema>

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>

export const passwordResetConfirmSchema = z
  .object({
    email: emailSchema,
    code: otpCodeSchema,
    new_password: newPasswordSchema,
    confirm_password: newPasswordSchema,
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>

export const changePasswordSchema = z
  .object({
    old_password: currentPasswordSchema,
    new_password: newPasswordSchema,
    confirm_password: newPasswordSchema,
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const profileUpdateSchema = z.object({
  first_name: firstNameSchema,
  last_name: lastNameSchema,
  phone_number: nigerianPhoneSchema("Phone number"),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

// ---------------------------------------------------------------------------
// Backend field-error mapping — same contract as `mapGuestFieldErrors` but
// generic over each form's known keys: matching inputs take the first
// message in backend order; unknown keys and empty lists surface in the
// form-level alert. Callers render the form alert whenever `fields` comes
// back empty.
// ---------------------------------------------------------------------------

export interface AuthFieldIssue {
  field: string
  message: string
}

export interface MappedAuthFieldErrors {
  fields: AuthFieldIssue[]
  formAlert: string[]
}

/**
 * Form-level fallback when the backend names a field but sends no message.
 * Same wording as `NEEDS_ATTENTION_COPY` in `./guest-booking.ts` — one
 * customer voice, separate modules (importing the guest domain here would
 * drag booking payloads behind every auth handler).
 */
export const AUTH_ATTENTION_COPY =
  "Some details need attention before we can continue."

export function mapAuthFieldErrors(
  fieldErrors: Record<string, string[]> | null | undefined,
  knownFields: readonly string[]
): MappedAuthFieldErrors {
  const fields: AuthFieldIssue[] = []
  const formAlert: string[] = []
  if (!fieldErrors) return { fields, formAlert }
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (knownFields.includes(key) && messages.length > 0) {
      fields.push({ field: key, message: messages[0] })
    } else if (messages.length > 0) {
      formAlert.push(...messages)
    } else {
      // A key with no messages names nothing to attach to an input — the
      // generic alert carries it so the failure still surfaces at form level.
      formAlert.push(AUTH_ATTENTION_COPY)
    }
  }
  return { fields, formAlert }
}
