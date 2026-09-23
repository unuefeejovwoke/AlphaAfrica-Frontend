import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { travellerCompositionSchema } from "../lib/schemas/travel.ts"

test("Traveller composition schema enforces travel industry boundaries", () => {
  // Valid composition: 2 adults, 1 child, 1 infant
  const valid = travellerCompositionSchema.safeParse({
    adults: 2,
    children: 1,
    infants: 1,
  })
  assert.ok(valid.success, "2 adults, 1 child, 1 infant must be valid")

  // Invalid: 0 adults
  const noAdults = travellerCompositionSchema.safeParse({
    adults: 0,
    children: 1,
    infants: 0,
  })
  assert.strictEqual(noAdults.success, false, "At least 1 adult is required")

  // Invalid: Infants exceed adult count (aviation safety rule: 1 infant per adult lap)
  const tooManyInfants = travellerCompositionSchema.safeParse({
    adults: 1,
    children: 0,
    infants: 2,
  })
  assert.strictEqual(
    tooManyInfants.success,
    false,
    "Infant count cannot exceed adult count"
  )

  // Invalid: Total passengers exceed 9 (standard airline reservation limit)
  const tooManyPassengers = travellerCompositionSchema.safeParse({
    adults: 6,
    children: 4,
    infants: 0,
  })
  assert.strictEqual(
    tooManyPassengers.success,
    false,
    "Total travellers cannot exceed 9"
  )
})

test("Traveller stepper and Input components exist", () => {
  const stepperPath = path.resolve(
    process.cwd(),
    "components/ui/traveller-stepper.tsx"
  )
  const inputPath = path.resolve(process.cwd(), "components/ui/input.tsx")
  assert.ok(fs.existsSync(stepperPath), "traveller-stepper.tsx must exist")
  assert.ok(fs.existsSync(inputPath), "input.tsx must exist")
})
