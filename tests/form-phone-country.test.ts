import test from "node:test"
import assert from "node:assert/strict"
import {
  countryFlag,
  getCountryByCode,
  getCountryByDial,
  orderedCountries,
  searchCountries,
} from "../lib/data/countries.ts"
import { splitPhoneValue, toE164 } from "../lib/phone.ts"

test("Country catalogue: Nigeria defaults, flags derive, search finds by name/code/dial", () => {
  assert.equal(getCountryByCode("NG").dial, "234")
  assert.equal(getCountryByCode("ng").name, "Nigeria")
  assert.equal(getCountryByCode("XX").code, "NG")
  assert.equal(getCountryByDial("234").code, "NG")
  assert.equal(getCountryByDial("44").code, "GB")
  assert.equal(getCountryByDial("1").code, "CA")
  assert.equal(countryFlag("NG").length > 0, true)
  assert.equal(countryFlag("X1"), "")

  const ordered = orderedCountries()
  assert.equal(ordered[0].code, "NG")
  assert.ok(ordered.length > 200, "any-country coverage")

  const byName = searchCountries("ghana")
  assert.ok(byName.some((c) => c.code === "GH"))
  const byDial = searchCountries("234")
  assert.ok(byDial.some((c) => c.code === "NG"))
  const byCode = searchCountries("gb")
  assert.ok(byCode.some((c) => c.code === "GB"))
})

test("Phone helpers: split E.164/national/trunk, combine back to E.164", () => {
  assert.deepEqual(splitPhoneValue("+2348031234567", "234"), {
    dial: "234",
    national: "8031234567",
  })
  assert.deepEqual(splitPhoneValue("+448001234567", "234"), {
    dial: "44",
    national: "8001234567",
  })
  assert.deepEqual(splitPhoneValue("0803 123 4567", "234"), {
    dial: "234",
    national: "8031234567",
  })
  assert.deepEqual(splitPhoneValue("", "234"), { dial: "234", national: "" })

  assert.equal(toE164("234", "08031234567"), "+2348031234567")
  assert.equal(toE164("44", "800 123 4567"), "+448001234567")
  assert.equal(toE164("234", ""), "+234")
  assert.equal(toE164("", ""), "")
})
