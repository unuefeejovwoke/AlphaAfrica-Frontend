import test from "node:test"
import assert from "node:assert/strict"
import {
  AUTH_ATTENTION_COPY,
  buildAuthHeaders,
  buildChangePasswordRequest,
  buildLoginRequest,
  buildLoginTarget,
  buildPasswordResetConfirmRequest,
  buildProfileUpdateRequest,
  buildRefreshRequest,
  buildRegisterRequest,
  buildVerifyConfirmRequest,
  changePasswordSchema,
  loginSchema,
  mapAuthFieldErrors,
  needsEmailVerification,
  normalizeAuthUser,
  normalizeLoginResponse,
  normalizeRefreshResponse,
  normalizeRegisterResponse,
  normalizeTokenPair,
  otpCodeSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  profileUpdateSchema,
  registerSchema,
  resolveAuthSession,
  verifyConfirmSchema,
} from "../lib/api/auth.ts"

// ---------------------------------------------------------------------------
// Normalization: login and refresh payloads yield access, refresh, and user;
// missing or malformed token fields resolve to explicit unauthenticated
// rather than throwing through the UI.
// ---------------------------------------------------------------------------

const USER = {
  id: 7,
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Obi",
  phone_number: "+2348031234567",
  is_verified: true,
  date_joined: "2026-01-01T00:00:00Z",
}

test("Login normalize: token pair plus user yields authenticated", () => {
  const result = normalizeLoginResponse({
    access: "access-123",
    refresh: "refresh-123",
    user: USER,
  })
  assert.equal(result.status, "authenticated")
  if (result.status === "authenticated") {
    assert.equal(result.access, "access-123")
    assert.equal(result.refresh, "refresh-123")
    assert.equal(result.user?.email, "ada@example.com")
  }
})

test("Login normalize: legacy token aliases still yield authenticated", () => {
  // The exact live key names still need a sandbox check — accept both now
  // so either answer signs the Customer in instead of dropping the session.
  const result = normalizeLoginResponse({
    access_token: "access-123",
    refresh_token: "refresh-123",
    user: USER,
  })
  assert.equal(result.status, "authenticated")
  if (result.status === "authenticated") {
    assert.equal(result.access, "access-123")
    assert.equal(result.refresh, "refresh-123")
  }
})

test("Login normalize: malformed payloads resolve to unauthenticated, never throw", () => {
  for (const malformed of [
    null,
    undefined,
    "nope",
    {},
    { access: "   " },
    { refresh: "refresh-only" },
    { access: 42, user: USER },
  ]) {
    assert.deepEqual(normalizeLoginResponse(malformed), {
      status: "unauthenticated",
    })
  }
})

test("Login normalize: valid tokens with a broken user keep the session, drop the user", () => {
  // Tokens are usable and the profile refetches — a bad user blob must not
  // sign the Customer out.
  const result = normalizeLoginResponse({ access: "a", refresh: "r", user: {} })
  assert.equal(result.status, "authenticated")
  if (result.status === "authenticated") {
    assert.equal(result.user, null)
  }
})

test("Refresh normalize: access-only rotates, a rotated pair replaces both", () => {
  // The backend may or may not rotate refresh — absent stays null, present
  // replaces, so callers store exactly what they receive.
  assert.deepEqual(normalizeRefreshResponse({ access: "new-access" }), {
    status: "refreshed",
    access: "new-access",
    refresh: null,
  })
  assert.deepEqual(
    normalizeRefreshResponse({ access: "new-access", refresh: "new-refresh" }),
    { status: "refreshed", access: "new-access", refresh: "new-refresh" }
  )
  assert.deepEqual(normalizeRefreshResponse({ refresh: "orphan" }), {
    status: "unauthenticated",
  })
  assert.deepEqual(normalizeRefreshResponse(null), {
    status: "unauthenticated",
  })
})

test("Register normalize: created user yields registered with a verify signal", () => {
  // Register answers the User bare (201) or under a `user` key — both mean
  // an account exists and the email flag decides the verify redirect.
  const bare = normalizeRegisterResponse({ ...USER, is_verified: false })
  assert.equal(bare.status, "registered")
  if (bare.status === "registered") {
    assert.equal(needsEmailVerification(bare.user), true)
  }
  const enveloped = normalizeRegisterResponse({ user: USER })
  assert.equal(enveloped.status, "registered")
  if (enveloped.status === "registered") {
    assert.equal(needsEmailVerification(enveloped.user), false)
  }
  assert.deepEqual(normalizeRegisterResponse({ email: "x@y.z" }), {
    status: "unauthenticated",
  })
  assert.equal(needsEmailVerification(null), false)
})

test("User normalize: sparse backend user fills defaults, wrong id type fails", () => {
  // Optional profile fields may be missing or null — defaults keep renderers
  // total. A non-numeric id is unusable, so the whole user is null.
  const sparse = normalizeAuthUser({ id: 1, email: "a@b.c" })
  assert.equal(sparse?.first_name, "")
  assert.equal(sparse?.is_verified, false)
  assert.equal(normalizeAuthUser({ id: "7", email: "a@b.c" }), null)
  assert.equal(normalizeTokenPair("nope"), null)
})

// ---------------------------------------------------------------------------
// Session-state resolution: valid access is signed-in; expired access with a
// valid refresh retries; failed refresh signs out with a login target;
// unknown states fall conservatively to signed-out.
// ---------------------------------------------------------------------------

test("Session: valid access resolves to signed-in", () => {
  assert.deepEqual(resolveAuthSession({ access: "a", refresh: "r" }), {
    status: "signed-in",
  })
})

test("Session: rejected access with a valid refresh resolves to refresh-then-retry", () => {
  // A 401 on access is the one case worth a silent refresh — the action can
  // still succeed without re-login.
  assert.deepEqual(
    resolveAuthSession({ access: "stale", refresh: "r", accessInvalid: true }),
    { status: "refresh-then-retry" }
  )
  assert.deepEqual(resolveAuthSession({ refresh: "r" }), {
    status: "refresh-then-retry",
  })
})

test("Session: failed refresh resolves to signed-out with a login target", () => {
  // Refresh already failed — retrying would loop, so return to login with
  // the return target preserved.
  assert.deepEqual(
    resolveAuthSession(
      { access: "stale", refresh: "dead", accessInvalid: true, refreshInvalid: true },
      "/orders"
    ),
    { status: "signed-out", loginTarget: "/login?next=%2Forders" }
  )
})

test("Session: unknown states resolve conservatively to signed-out", () => {
  // Garbage tokens, blanks, and non-strings must never read as access — no
  // page may assume a session it cannot prove.
  assert.deepEqual(resolveAuthSession({}), {
    status: "signed-out",
    loginTarget: "/login",
  })
  assert.deepEqual(resolveAuthSession({ access: "   ", refresh: 42 }), {
    status: "signed-out",
    loginTarget: "/login",
  })
})

test("Login target: same-origin paths persist, anything else falls back to bare login", () => {
  // `next` restores context after re-login; absolute and protocol-relative
  // URLs would be open redirects, so they are dropped.
  assert.equal(buildLoginTarget("/profile"), "/login?next=%2Fprofile")
  assert.equal(buildLoginTarget(null), "/login")
  assert.equal(buildLoginTarget("https://evil.test/x"), "/login")
  assert.equal(buildLoginTarget("//evil.test/x"), "/login")
})

// ---------------------------------------------------------------------------
// Header construction: a present token yields one trimmed Bearer value;
// absent or blank yields no Authorization header at all.
// ---------------------------------------------------------------------------

test("Headers: present token yields a single trimmed Bearer value", () => {
  assert.deepEqual(buildAuthHeaders("  abc123  "), {
    Authorization: "Bearer abc123",
  })
})

test("Headers: absent or blank tokens yield no Authorization header", () => {
  // No header means the proxy forwards none — logged-out reads stay guest.
  for (const absent of [null, undefined, "", "   ", 42]) {
    assert.deepEqual(buildAuthHeaders(absent), {})
  }
})

// ---------------------------------------------------------------------------
// Request shaping: snake_case bodies mirroring apidoc.yaml. Emails trim;
// passwords travel untouched — write-only values are never normalized.
// ---------------------------------------------------------------------------

test("Request shaping: emails trim, passwords pass through untouched", () => {
  assert.deepEqual(
    buildLoginRequest({ email: "  ADA@EXAMPLE.COM ", password: " s3cret " }),
    { email: "ADA@EXAMPLE.COM", password: " s3cret " }
  )
  const register = buildRegisterRequest({
    email: " a@b.c ",
    first_name: " Ada ",
    last_name: " Obi ",
    phone_number: " +2348031234567 ",
    password: "new-secret-1",
    password2: "new-secret-1",
  })
  assert.equal(register.email, "a@b.c")
  assert.equal(register.first_name, "Ada")
  assert.equal(register.phone_number, "+2348031234567")
  assert.deepEqual(buildRefreshRequest(" r "), { refresh: "r" })
  assert.deepEqual(
    buildVerifyConfirmRequest({ email: " a@b.c ", code: " 123456 " }),
    { email: "a@b.c", code: "123456" }
  )
  assert.deepEqual(
    buildPasswordResetConfirmRequest({
      email: "a@b.c",
      code: "123456",
      new_password: "new-secret-1",
    }).new_password,
    "new-secret-1"
  )
  assert.deepEqual(
    buildChangePasswordRequest({ old_password: "o", new_password: "n3w-secret" }),
    { old_password: "o", new_password: "n3w-secret" }
  )
})

test("Profile update: only provided, non-blank fields travel", () => {
  // PATCH is partial — an untouched phone must never overwrite the stored
  // one with an empty string.
  assert.deepEqual(
    buildProfileUpdateRequest({ first_name: " Ada ", phone_number: "  " }),
    { first_name: "Ada" }
  )
  assert.deepEqual(buildProfileUpdateRequest({}), {})
})

// ---------------------------------------------------------------------------
// Schema validation: happy paths accept; empty, malformed, too-long, and
// mismatched inputs reject with the customer-facing message the form renders.
// ---------------------------------------------------------------------------

test("Login schema: happy path accepts, blanks reject with rendered copy", () => {
  assert.ok(
    loginSchema.safeParse({ email: "ada@example.com", password: "anything" })
      .success
  )
  // Existing weak passwords must still sign in — strength rules apply to
  // chosen passwords only, so login requires presence, not length.
  assert.ok(loginSchema.safeParse({ email: "ada@example.com", password: "x" }).success)
  const empty = loginSchema.safeParse({ email: "", password: "" })
  assert.equal(empty.success, false)
  if (!empty.success) {
    // Empty email trips both the required and the format rules — the form
    // renders the first and the field stays flagged until both pass.
    assert.deepEqual(
      empty.error.issues.map((issue) => issue.message),
      [
        "Enter your email address",
        "Enter a valid email address",
        "Enter your password",
      ]
    )
  }
  const badEmail = loginSchema.safeParse({ email: "not-an-email", password: "x" })
  assert.equal(badEmail.success, false)
  if (!badEmail.success) {
    assert.equal(badEmail.error.issues[0]?.message, "Enter a valid email address")
  }
})

test("Register schema: happy path accepts with Nigerian phone normalization", () => {
  // Phone normalization matches booking-contact rules — 080… becomes +234…
  // before submission, so checkout pre-fill agrees everywhere.
  const parsed = registerSchema.safeParse({
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Obi",
    phone_number: "0803 123 4567",
    password: "secret-123",
    password2: "secret-123",
  })
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.phone_number, "+2348031234567")
  }
})

test("Register schema: short password and mismatch reject on the rendered fields", () => {
  const short = registerSchema.safeParse({
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Obi",
    phone_number: "08031234567",
    password: "short",
    password2: "short",
  })
  assert.equal(short.success, false)
  if (!short.success) {
    assert.ok(
      short.error.issues.some(
        (issue) => issue.message === "Password must be at least 8 characters"
      )
    )
  }
  const mismatch = registerSchema.safeParse({
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Obi",
    phone_number: "08031234567",
    password: "secret-123",
    password2: "secret-456",
  })
  assert.equal(mismatch.success, false)
  if (!mismatch.success) {
    assert.deepEqual(mismatch.error.issues.map((issue) => issue.path.join(".")), [
      "password2",
    ])
    assert.equal(mismatch.error.issues[0]?.message, "Passwords do not match")
  }
})

test("OTP schema: six digits accept, everything else rejects with one message", () => {
  assert.ok(otpCodeSchema.safeParse("123456").success)
  // Empty, short, long, and non-numeric codes all read the same — the form
  // shows one actionable line, never a format lecture.
  for (const bad of ["", "12345", "1234567", "12a456", " 12345 "]) {
    const parsed = otpCodeSchema.safeParse(bad)
    assert.equal(parsed.success, false, bad)
    if (!parsed.success) {
      assert.equal(
        parsed.error.issues[0]?.message,
        "Enter the 6-digit code from your email"
      )
    }
  }
  assert.ok(
    verifyConfirmSchema.safeParse({ email: "ada@example.com", code: "123456" })
      .success
  )
})

test("Password reset confirm: code plus matching new password accepts", () => {
  assert.ok(
    passwordResetConfirmSchema.safeParse({
      email: "ada@example.com",
      code: "123456",
      new_password: "new-secret-1",
      confirm_password: "new-secret-1",
    }).success
  )
  const mismatch = passwordResetConfirmSchema.safeParse({
    email: "ada@example.com",
    code: "123456",
    new_password: "new-secret-1",
    confirm_password: "other-secret-1",
  })
  assert.equal(mismatch.success, false)
  if (!mismatch.success) {
    assert.equal(mismatch.error.issues[0]?.message, "Passwords do not match")
  }
  assert.ok(
    passwordResetRequestSchema.safeParse({ email: "ada@example.com" }).success
  )
  assert.equal(passwordResetRequestSchema.safeParse({ email: "" }).success, false)
})

test("Change password: old plus matching new accepts, mismatch rejects", () => {
  assert.ok(
    changePasswordSchema.safeParse({
      old_password: "old-secret",
      new_password: "new-secret-1",
      confirm_password: "new-secret-1",
    }).success
  )
  const mismatch = changePasswordSchema.safeParse({
    old_password: "old-secret",
    new_password: "new-secret-1",
    confirm_password: "different-1",
  })
  assert.equal(mismatch.success, false)
  if (!mismatch.success) {
    assert.deepEqual(mismatch.error.issues.map((issue) => issue.path.join(".")), [
      "confirm_password",
    ])
  }
})

test("Profile schema: name and phone share booking-contact strictness", () => {
  // Story 30 — phone formats must behave identically in profile and booking
  // contact, so both compose the same primitive.
  const parsed = profileUpdateSchema.safeParse({
    first_name: "Ada",
    last_name: "Obi",
    phone_number: "2348031234567",
  })
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.phone_number, "+2348031234567")
  }
  const tooLong = profileUpdateSchema.safeParse({
    first_name: "A".repeat(151),
    last_name: "Obi",
    phone_number: "08031234567",
  })
  assert.equal(tooLong.success, false)
  if (!tooLong.success) {
    assert.equal(tooLong.error.issues[0]?.message, "First name is too long")
  }
})

// ---------------------------------------------------------------------------
// Field-error mapping: backend field-keyed arrays map onto matching inputs
// in order; unknown keys fall to the form alert.
// ---------------------------------------------------------------------------

const LOGIN_KEYS = ["email", "password"] as const

test("Field errors: known keys map in backend order with the first message", () => {
  // Backend order is preserved so the first invalid field the server names
  // is the first the form highlights.
  const mapped = mapAuthFieldErrors(
    {
      password: ["Wrong password."],
      email: ["Enter a valid email.", "Second message dropped."],
    },
    LOGIN_KEYS
  )
  assert.deepEqual(mapped.fields, [
    { field: "password", message: "Wrong password." },
    { field: "email", message: "Enter a valid email." },
  ])
  assert.deepEqual(mapped.formAlert, [])
})

test("Field errors: unknown keys and empty lists never attach to an input", () => {
  // Server-only keys (rate limits, non-field errors) surface in the form
  // alert with a way back; a key with no message still raises the generic
  // alert so the failure is never silent.
  const mapped = mapAuthFieldErrors(
    {
      non_field_errors: ["Too many attempts. Wait a moment and try again."],
      email: [],
    },
    LOGIN_KEYS
  )
  assert.deepEqual(mapped.fields, [])
  assert.deepEqual(mapped.formAlert, [
    "Too many attempts. Wait a moment and try again.",
    AUTH_ATTENTION_COPY,
  ])
  assert.deepEqual(mapAuthFieldErrors(null, LOGIN_KEYS), {
    fields: [],
    formAlert: [],
  })
})

test("Boundaries: too-long email, password, and phone reject with rendered copy", () => {
  // Every bounded input names its ceiling before submit — the Customer
  // corrects inline instead of discovering limits through failure.
  const longEmail = loginSchema.safeParse({
    email: `${"a".repeat(250)}@b.co`,
    password: "x",
  })
  assert.equal(longEmail.success, false)
  if (!longEmail.success) {
    assert.ok(
      longEmail.error.issues.some(
        (issue) => issue.message === "Email address is too long"
      )
    )
  }
  const longPassword = registerSchema.safeParse({
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Obi",
    phone_number: "08031234567",
    password: "x".repeat(129),
    password2: "x".repeat(129),
  })
  assert.equal(longPassword.success, false)
  if (!longPassword.success) {
    assert.ok(
      longPassword.error.issues.some(
        (issue) => issue.message === "Password must be 128 characters or fewer"
      )
    )
  }
  const longPhone = profileUpdateSchema.safeParse({
    first_name: "Ada",
    last_name: "Obi",
    phone_number: "08031234567890123456789",
  })
  assert.equal(longPhone.success, false)
  if (!longPhone.success) {
    assert.ok(
      longPhone.error.issues.some(
        (issue) => issue.message === "Phone number is too long"
      )
    )
  }
})

test("Tokens never enter query construction: the login target carries only next", () => {
  // The login target is the seam's only query builder — it carries the
  // return path and nothing else, so a copied link can never leak access.
  // Session tokens travel in headers (buildAuthHeaders) and the refresh
  // token travels in its POST body per apidoc TokenRefreshRequest; neither
  // shape has a query parameter for them.
  const target = buildLoginTarget("/orders")
  const query = new URLSearchParams(target.slice(target.indexOf("?") + 1))
  assert.deepEqual([...query.keys()], ["next"])
  assert.equal(query.get("next"), "/orders")
  assert.equal(buildLoginTarget(null).includes("?"), false)
  assert.deepEqual(buildAuthHeaders("abc123"), {
    Authorization: "Bearer abc123",
  })
})
