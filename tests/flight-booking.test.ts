import test from "node:test"
import assert from "node:assert/strict"
import {
  buildFlightVerifyUrl,
  clearBookingSession,
  findReusableBooking,
  hashBookingKey,
  normalizeFlightBookingCreateResult,
  readPaymentReference,
  readPendingBooking,
  resolveCreatePriceReview,
  savePaymentReference,
  savePendingBooking,
  type PendingBookingRecord,
} from "../lib/api/flight-bookings.ts"
import {
  clearFlightCheckoutSession,
  readConfirmedOffer,
  readSelectedOffer,
  readSelectedParty,
  readTravellersDraft,
  saveConfirmedOffer,
  saveSelectedOffer,
  saveSelectedParty,
  saveTravellersDraft,
  TRAVELLERS_DRAFT_SESSION_KEY,
} from "../lib/api/flights.ts"
import {
  clearSelectedDomesticCard,
  readSelectedDomesticCard,
  saveSelectedDomesticCard,
} from "../lib/api/domestic.ts"
import type {
  BookingCustomer,
  BookingTravellerPayload,
} from "../lib/schemas/travel.ts"

// ---------------------------------------------------------------------------
// Seam 1: duplicate-submission prevention (single-flight guard support)
// Same Confirmed Offer + travellers + contact reuses the pending reference;
// anything else — including an edited traveller detail — starts a new one.
// The travellers are part of the key because the airline order is built from
// the Pending Booking's stored travellers.
// ---------------------------------------------------------------------------

const OFFER_A = { id: "offer-a", total_amount: "250000.00", origin: "LOS" }
const OFFER_B = { id: "offer-b", total_amount: "310000.00", origin: "LOS" }

function traveller(firstName: string): BookingTravellerPayload {
  return {
    first_name: firstName,
    last_name: "Obi",
    date_of_birth: "1990-01-01",
    gender: "FEMALE",
    email: "ada@example.com",
    phone_country_code: "234",
    phone: "+2348031234567",
    traveler_type: "ADULT",
  }
}

const TRAVELLERS = [traveller("Ada")]
const CUSTOMER: BookingCustomer = {
  name: "Ada Obi",
  email: "ada@example.com",
  phone: "+2348031234567",
}

test("Pending booking: same offer, travellers, and contact reuse the reference; any edit starts new", () => {
  const stored: PendingBookingRecord = {
    key: hashBookingKey(OFFER_A, TRAVELLERS, CUSTOMER),
    reference: "FLT-REF-001",
    authorization_url: "https://paystack.test/pay/flt-ref-001",
  }

  const reuse = findReusableBooking(
    stored,
    hashBookingKey(OFFER_A, TRAVELLERS, CUSTOMER)
  )
  assert.deepEqual(reuse, {
    reference: "FLT-REF-001",
    authorization_url: "https://paystack.test/pay/flt-ref-001",
  })

  assert.equal(
    findReusableBooking(stored, hashBookingKey(OFFER_B, TRAVELLERS, CUSTOMER)),
    null,
    "A different offer must start a new Pending Booking"
  )
  assert.equal(
    findReusableBooking(
      stored,
      hashBookingKey(OFFER_A, [traveller("Ngozi")], CUSTOMER)
    ),
    null,
    "An edited traveller name must never reuse the stored booking"
  )
  assert.equal(
    findReusableBooking(
      stored,
      hashBookingKey(OFFER_A, TRAVELLERS, {
        ...CUSTOMER,
        phone: "+2348039999999",
      })
    ),
    null,
    "An edited paying contact must never reuse the stored booking"
  )
  assert.equal(
    findReusableBooking(null, hashBookingKey(OFFER_A, TRAVELLERS, CUSTOMER)),
    null
  )
})

test("Pending booking: reuse identity is a digest carrying no readable traveller data", () => {
  const key = hashBookingKey(OFFER_A, TRAVELLERS, CUSTOMER)
  assert.match(key, /^[0-9a-f]{16}$/, "The stored key must be a hex digest")
  for (const readable of ["Ada", "Obi", "1990-01-01", "ada@example.com"]) {
    assert.equal(
      key.includes(readable),
      false,
      `Digest must not leak readable data: ${readable}`
    )
  }
  assert.equal(
    hashBookingKey(OFFER_A, TRAVELLERS, CUSTOMER),
    key,
    "Unchanged retries hash identically so reuse keeps working"
  )
  assert.notEqual(
    hashBookingKey(OFFER_A, [traveller("Ngozi")], CUSTOMER),
    key,
    "An edited traveller hashes differently so reuse can never match"
  )
})

function readRawSession(key: string): string | null {
  const session = (
    (globalThis as { window?: unknown }).window as {
      sessionStorage: { getItem: (key: string) => string | null }
    }
  ).sessionStorage
  return session.getItem(key)
}

function writeRawSession(key: string, value: string): void {
  const session = (
    (globalThis as { window?: unknown }).window as {
      sessionStorage: { setItem: (key: string, value: string) => void }
    }
  ).sessionStorage
  session.setItem(key, value)
}

test("Travellers draft: storage holds no passport, birth date, or contact data", () => {
  installMemorySessionStorage()
  try {
    saveTravellersDraft({
      travellers: [
        {
          ...traveller("Ada"),
          passport_number: "A12345678",
          passport_expiry: "2030-01-01",
          nationality: "NG",
        },
      ],
      customer: CUSTOMER,
    })

    const raw = readRawSession(TRAVELLERS_DRAFT_SESSION_KEY)
    assert.ok(raw, "The draft must persist for resume")
    for (const banned of [
      "A12345678",
      "2030-01-01",
      "1990-01-01",
      "ada@example.com",
      "+2348031234567",
      "passport_number",
      "passport_expiry",
      "date_of_birth",
    ]) {
      assert.equal(
        raw.includes(banned),
        false,
        `Browser storage must never hold: ${banned}`
      )
    }

    const draft = readTravellersDraft()
    assert.ok(draft, "Party recovery still works from the stripped draft")
    assert.equal(draft.travellers[0].first_name, "Ada")
    assert.equal(draft.travellers[0].traveler_type, "ADULT")
    assert.equal(draft.customer.name, "Ada Obi")
    assert.equal(
      "passport_number" in (draft.travellers[0] as unknown as Record<
        string,
        unknown
      >),
      false
    )

    writeRawSession(TRAVELLERS_DRAFT_SESSION_KEY, "{not-json")
    assert.equal(
      readTravellersDraft(),
      null,
      "Corrupt storage reads as no draft rather than crashing"
    )
    writeRawSession(TRAVELLERS_DRAFT_SESSION_KEY, "[]")
    assert.equal(
      readTravellersDraft(),
      null,
      "Wrong-shaped storage reads as no draft rather than crashing"
    )

    // A pre-hardening full-shape draft is sanitized on read, not restored.
    writeRawSession(
      TRAVELLERS_DRAFT_SESSION_KEY,
      JSON.stringify({
        travellers: [
          {
            ...traveller("Ada"),
            passport_number: "A12345678",
            passport_expiry: "2030-01-01",
          },
        ],
        customer: CUSTOMER,
      })
    )
    const migrated = readTravellersDraft()
    assert.ok(migrated, "Legacy drafts still recover the party")
    assert.equal(
      "passport_number" in (migrated.travellers[0] as unknown as Record<
        string,
        unknown
      >),
      false,
      "Legacy passport data is dropped on read"
    )
    assert.equal(migrated.travellers[0].first_name, "Ada")
  } finally {
    uninstallWindowStub()
  }
})

// ---------------------------------------------------------------------------
// Seam 2: reference persistence (return URL query param + sessionStorage)
// The Payment Reference must survive refresh, back navigation, and a new tab
// after the Paystack handoff. sessionStorage is stubbed in-memory: node has
// no window, so the test installs the smallest viable Storage stand-in.
// ---------------------------------------------------------------------------

function installMemorySessionStorage(): void {
  const store = new Map<string, string>()
  const storage = {
    getItem: (key: string): string | null =>
      store.has(key) ? (store.get(key) as string) : null,
    setItem: (key: string, value: string): void => {
      store.set(key, value)
    },
    removeItem: (key: string): void => {
      store.delete(key)
    },
  }
  ;(globalThis as { window?: unknown }).window = { sessionStorage: storage }
}

function uninstallWindowStub(): void {
  delete (globalThis as { window?: unknown }).window
}

test("Pending booking: reference persists in both the return URL and sessionStorage", () => {
  installMemorySessionStorage()
  try {
    assert.equal(readPaymentReference(), null)

    savePaymentReference("FLT-REF-001")

    assert.equal(readPaymentReference(), "FLT-REF-001")

    const url = buildFlightVerifyUrl("FLT-REF-001")
    assert.match(url, /reference=FLT-REF-001/)
  } finally {
    uninstallWindowStub()
  }
})

test("Pending booking: verified payment clears the stored pending booking and reference", () => {
  installMemorySessionStorage()
  try {
    savePaymentReference("FLT-REF-001")
    savePendingBooking({
      key: "k",
      reference: "FLT-REF-001",
      authorization_url: "https://paystack.test/pay/flt-ref-001",
    })

    clearBookingSession()

    assert.equal(readPaymentReference(), null)
    assert.equal(readPendingBooking(), null)
  } finally {
    uninstallWindowStub()
  }
})

// ---------------------------------------------------------------------------
// Seam 3: create-time price review
// The create call re-prices the offer. When the backend returns the final
// amount it must be compared with the approved total; a fare never changes
// silently. Without an amount the status stays unknown and checkout proceeds.
// ---------------------------------------------------------------------------

test("Create price review: unknown, same, and changed fare branches", () => {
  // Branch 1 — backend returns no amount (today's contract): proceed.
  assert.deepEqual(
    resolveCreatePriceReview({
      confirmedTotal: "250000.00",
      result: { reference: "r", authorization_url: "https://paystack.test" },
    }),
    { status: "unknown" }
  )

  // Branch 2 — same fare, numeric equality across string shapes.
  assert.deepEqual(
    resolveCreatePriceReview({
      confirmedTotal: "250000.00",
      result: {
        reference: "r",
        authorization_url: "https://paystack.test",
        total_amount: "250000",
      },
    }),
    { status: "same" }
  )

  // Branch 3 — increased fare carries previous, new, difference, and direction.
  const increased = resolveCreatePriceReview({
    confirmedTotal: "250000.00",
    result: {
      reference: "r",
      authorization_url: "https://paystack.test",
      total_amount: "275000.00",
    },
  })
  assert.equal(increased.status, "changed")
  if (increased.status === "changed") {
    assert.equal(increased.previousTotal, "250000.00")
    assert.equal(increased.newTotal, "275000.00")
    assert.equal(increased.difference, "25000.00")
    assert.equal(increased.increased, true)
    assert.equal(increased.currency, "NGN")
  }

  // Branch 4 — decreased fare via the legacy `amount` alias.
  const decreased = resolveCreatePriceReview({
    confirmedTotal: "250000.00",
    result: {
      reference: "r",
      authorization_url: "https://paystack.test",
      amount: 225000,
    },
  })
  assert.equal(decreased.status, "changed")
  if (decreased.status === "changed") {
    assert.equal(decreased.increased, false)
    assert.equal(decreased.difference, "25000.00")
  }

  // Branch 5 — unreadable approved total or amount: never guess a change.
  assert.deepEqual(
    resolveCreatePriceReview({
      confirmedTotal: "—",
      result: {
        reference: "r",
        authorization_url: "https://paystack.test",
        total_amount: "250000.00",
      },
    }),
    { status: "unknown" }
  )
  assert.deepEqual(
    resolveCreatePriceReview({
      confirmedTotal: "250000.00",
      result: {
        reference: "r",
        authorization_url: "https://paystack.test",
        total_amount: "not-a-number",
      },
    }),
    { status: "unknown" }
  )
})

// ---------------------------------------------------------------------------
// Seam 4: create response normalization
// The live endpoint answers with `{ booking, payment }` while the apidoc
// documents a flat shape. Both must normalize to reference + checkout link +
// final amount, so a successful 201 can never surface as "booking not created".
// ---------------------------------------------------------------------------

test("Create response: envelope and flat shapes normalize; missing link is rejected", () => {
  const envelope = normalizeFlightBookingCreateResult({
    booking: {
      reference: "ALPHAA-TEST",
      total_amount: "758338.35",
      currency: "NGN",
      status: "pending",
    },
    payment: {
      reference: "ALPHAA-TEST",
      authorization_url: "https://checkout.paystack.com/test",
      access_code: "test",
      amount: "758338.35",
    },
  })
  assert.deepEqual(envelope, {
    reference: "ALPHAA-TEST",
    authorization_url: "https://checkout.paystack.com/test",
    total_amount: "758338.35",
    currency: "NGN",
  })

  const flat = normalizeFlightBookingCreateResult({
    reference: "FLAT-1",
    authorization_url: "https://paystack.test/flat",
    total_amount: 250000,
  })
  assert.deepEqual(flat, {
    reference: "FLAT-1",
    authorization_url: "https://paystack.test/flat",
    total_amount: 250000,
  })

  assert.equal(normalizeFlightBookingCreateResult({ booking: {} }), null)
  assert.equal(normalizeFlightBookingCreateResult(null), null)
  assert.equal(normalizeFlightBookingCreateResult("nope"), null)
})

test("Create price review reads the envelope's payment amount through normalization", () => {
  const normalized = normalizeFlightBookingCreateResult({
    booking: {
      reference: "ALPHAA-TEST",
      total_amount: "275000.00",
      currency: "NGN",
    },
    payment: {
      reference: "ALPHAA-TEST",
      authorization_url: "https://paystack.test",
      amount: "275000.00",
    },
  })
  assert.ok(normalized, "Envelope must normalize")
  const review = resolveCreatePriceReview({
    confirmedTotal: "250000.00",
    result: normalized,
  })
  assert.equal(review.status, "changed")
  if (review.status === "changed") {
    assert.equal(review.newTotal, "275000.00")
    assert.equal(review.increased, true)
  }
})

// ---------------------------------------------------------------------------
// Seam 5: paid-checkout teardown
// Paid verification clears every session-backed input — both offer branches,
// the party, the draft, the pending booking, the reference, and the domestic
// selection card.
// ---------------------------------------------------------------------------

test("Paid checkout teardown clears every session-backed input", () => {
  installMemorySessionStorage()
  try {
    saveSelectedOffer({ id: "offer" })
    saveConfirmedOffer({ id: "offer" })
    saveSelectedParty({ adults: 1, children: 0, infants: 0 })
    saveTravellersDraft({
      travellers: [traveller("Ada")],
      customer: CUSTOMER,
    })
    saveSelectedDomesticCard({ id: "domestic" })
    savePaymentReference("FLT-REF-001")
    savePendingBooking({
      key: "k",
      reference: "FLT-REF-001",
      authorization_url: "https://paystack.test/pay",
    })

    clearFlightCheckoutSession()
    clearSelectedDomesticCard()
    clearBookingSession()

    assert.equal(readSelectedOffer(), null)
    assert.equal(readConfirmedOffer(), null)
    assert.equal(readSelectedParty(), null)
    assert.equal(readTravellersDraft(), null)
    assert.equal(readSelectedDomesticCard(), null)
    assert.equal(readPaymentReference(), null)
    assert.equal(readPendingBooking(), null)
  } finally {
    uninstallWindowStub()
  }
})
