import test from "node:test"
import assert from "node:assert/strict"
import {
  createTravellerFormSchema,
  getTravellerAgeWarnings,
  type TravellerFormTraveller,
} from "../lib/schemas/travel.ts"

// ---------------------------------------------------------------------------
// Seam: Traveller validation (international passport branch vs domestic,
// age-band soft warnings, composition constraints)
// Vertical slices: one failing test → minimal implementation per cycle
// ---------------------------------------------------------------------------

function isoDate(offsetDays: number): string {
  return new Date(Date.now() + 86400000 * offsetDays).toISOString().slice(0, 10)
}

function yearsAgoDate(years: number): string {
  const now = new Date()
  const dob = new Date(
    Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate())
  )
  return dob.toISOString().slice(0, 10)
}

function validAdult(
  overrides: Partial<TravellerFormTraveller> = {}
): TravellerFormTraveller {
  return {
    first_name: "Adaeze",
    last_name: "Okafor",
    date_of_birth: yearsAgoDate(30),
    gender: "FEMALE",
    email: "adaeze.okafor@example.com",
    phone_country_code: "234",
    phone: "0803 123 4567",
    traveler_type: "ADULT",
    passport_number: "A12345678",
    passport_expiry: isoDate(365),
    nationality: "NG",
    ...overrides,
  }
}

function validInfant(
  overrides: Partial<TravellerFormTraveller> = {}
): TravellerFormTraveller {
  return {
    ...validAdult({
      first_name: "Chiamaka",
      date_of_birth: yearsAgoDate(1),
      traveler_type: "HELD_INFANT",
      passport_number: "B87654321",
    }),
    ...overrides,
  }
}

test("Traveller validation: intl passport required, domestic omits it, age bands warn softly", () => {
  const party = { adults: 1, children: 0, infants: 1 }
  const intl = createTravellerFormSchema({ party, isInternational: true })
  const base = {
    travellers: [validAdult(), validInfant()],
    contactIsFirstTraveller: true,
    customer: { name: "", email: "", phone: "" },
  }

  // International with valid passports passes; Nigerian phone normalizes.
  const ok = intl.safeParse(base)
  assert.equal(
    ok.success,
    true,
    "International party with valid passports must pass"
  )
  if (ok.success) {
    assert.equal(ok.data.travellers[0].phone, "+2348031234567")
    assert.equal(ok.data.travellers[0].nationality, "NG")
  }

  // International without the infant passport fails on that field only.
  const missingPassport = intl.safeParse({
    ...base,
    travellers: [validAdult(), validInfant({ passport_number: "" })],
  })
  assert.equal(
    missingPassport.success,
    false,
    "International without passport must fail"
  )
  if (!missingPassport.success) {
    const issue = missingPassport.error.issues.find(
      (i) => i.path.join(".") === "travellers.1.passport_number"
    )
    assert.ok(issue, "Must flag travellers.1.passport_number")
  }

  // Domestic without any passport keys passes.
  const domestic = createTravellerFormSchema({ party, isInternational: false })
  const { passport_number, passport_expiry, nationality, ...adultNoPassport } =
    validAdult()
  const {
    passport_number: _ip,
    passport_expiry: _ie,
    nationality: _in,
    ...infantNoPassport
  } = validInfant()
  void passport_number
  void passport_expiry
  void nationality
  void _ip
  void _ie
  void _in
  const domesticOk = domestic.safeParse({
    ...base,
    travellers: [adultNoPassport, infantNoPassport],
  })
  assert.equal(
    domesticOk.success,
    true,
    "Domestic party without passports must pass"
  )

  // Future date of birth is a hard failure.
  const futureDob = intl.safeParse({
    ...base,
    travellers: [validAdult({ date_of_birth: isoDate(1) }), validInfant()],
  })
  assert.equal(futureDob.success, false, "Future date of birth must fail")
  if (!futureDob.success) {
    const issue = futureDob.error.issues.find(
      (i) => i.path.join(".") === "travellers.0.date_of_birth"
    )
    assert.ok(issue, "Must flag travellers.0.date_of_birth")
    assert.match(issue!.message, /future/i)
  }

  // Infant older than 2 passes validation but raises a soft warning.
  const oldInfant = validInfant({
    date_of_birth: yearsAgoDate(3),
    traveler_type: "HELD_INFANT",
  })
  const softPass = intl.safeParse({
    ...base,
    travellers: [validAdult(), oldInfant],
  })
  assert.equal(
    softPass.success,
    true,
    "Over-age infant must still pass (warning only)"
  )
  const infantWarnings = getTravellerAgeWarnings([
    { date_of_birth: oldInfant.date_of_birth, traveler_type: "HELD_INFANT" },
  ])
  assert.equal(infantWarnings.length, 1, "Over-age infant must warn")
  assert.match(infantWarnings[0].message, /2 years/)

  // Child outside 2–11 warns softly instead of failing.
  const teenChild = {
    date_of_birth: yearsAgoDate(15),
    traveler_type: "CHILD" as const,
  }
  const childWarnings = getTravellerAgeWarnings([teenChild])
  assert.equal(childWarnings.length, 1, "Out-of-band child must warn")
  assert.match(childWarnings[0].message, /2–11/)

  // In-band infant and child stay silent.
  const quiet = getTravellerAgeWarnings([
    { date_of_birth: yearsAgoDate(1), traveler_type: "HELD_INFANT" },
    { date_of_birth: yearsAgoDate(7), traveler_type: "CHILD" },
  ])
  assert.equal(quiet.length, 0, "In-band ages must not warn")
})

test("Traveller composition: infants above adults fails, total above nine fails", () => {
  const party = { adults: 1, children: 0, infants: 0 }
  const schema = createTravellerFormSchema({ party, isInternational: false })
  const base = {
    contactIsFirstTraveller: true,
    customer: { name: "", email: "", phone: "" },
  }

  // Two held infants against one adult must fail with the composition message.
  const infantHeavy = schema.safeParse({
    ...base,
    travellers: [
      validAdult({ traveler_type: "ADULT" }),
      validInfant({ traveler_type: "HELD_INFANT" }),
      validInfant({ first_name: "Obinna", traveler_type: "HELD_INFANT" }),
    ],
  })
  assert.equal(infantHeavy.success, false, "Infants above adults must fail")
  if (!infantHeavy.success) {
    const messages = infantHeavy.error.issues.map((i) => i.message).join(" | ")
    assert.match(messages, /Infant count cannot exceed adult count/)
  }

  // Ten travellers exceed the nine-party cap.
  const crowd = Array.from({ length: 10 }, (_, i) =>
    validAdult({ first_name: `Traveller${i}`, traveler_type: "ADULT" })
  )
  const overCap = schema.safeParse({ ...base, travellers: crowd })
  assert.equal(overCap.success, false, "Total above nine must fail")
  if (!overCap.success) {
    const messages = overCap.error.issues.map((i) => i.message).join(" | ")
    assert.match(messages, /Total travellers cannot exceed 9/)
  }

  // The exact expected party passes the composition gate.
  const exact = schema.safeParse({ ...base, travellers: [validAdult()] })
  assert.equal(exact.success, true, "Exact expected party must pass")
})
