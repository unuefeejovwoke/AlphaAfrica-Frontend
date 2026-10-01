import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

// Ticket 09 — every route group has an error boundary.
//
// The mapping from a thrown value to the customer-safe vocabulary is pure
// (`lib/route-error.ts`) and asserted behaviourally here. Boundary wiring
// (ErrorState + retry, never raw output) is asserted against the boundary
// modules themselves.

import { ApiError } from "../lib/api/client.ts"
import { getErrorPreset } from "../lib/feedback-presets.ts"
import {
  resolveRouteErrorPreset,
  shouldResetRouteError,
} from "../lib/route-error.ts"

const ROOT = path.resolve(import.meta.dirname, "..")

function readRepo(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), "utf8")
}

test("Timeout failures keep the honest timeout preset; everything else is general", () => {
  assert.equal(
    resolveRouteErrorPreset(
      new ApiError("upstream slow", { code: "timeout", status: null })
    ),
    "timeout"
  )
  for (const error of [
    new ApiError("backend exploded", { code: "server", status: 500 }),
    new ApiError("bad field", { code: "validation", status: 400 }),
    new ApiError("no route", { code: "network", status: null }),
    new Error("Something broke honestly"),
    null,
    undefined,
  ]) {
    assert.equal(resolveRouteErrorPreset(error), "general")
  }
})

test("Boundaries never surface raw backend messages, field dumps, or stacks", () => {
  const hostile = new ApiError(
    'booking failed: {"contact_email":["taken"],"pnr":"ABC123"}',
    { code: "server", status: 500 }
  )
  const preset = resolveRouteErrorPreset(hostile)
  const copy = getErrorPreset(preset)
  for (const text of [copy.title, copy.description]) {
    assert.ok(!text.includes("contact_email"), "no field dumps")
    assert.ok(!text.includes("ABC123"), "no backend values")
    assert.ok(!text.includes("booking failed"), "no backend messages")
  }
})

test("Boundaries reset when the Customer navigates on, not before", () => {
  assert.equal(shouldResetRouteError("/flights", "/flights"), false)
  assert.equal(shouldResetRouteError("/flights", "/hotels"), true)
  assert.equal(shouldResetRouteError(null, "/hotels"), false)
})

test("Every route group plus a global boundary renders ErrorState with retry", () => {
  for (const file of [
    "app/(public)/error.tsx",
    "app/(checkout)/error.tsx",
    "app/global-error.tsx",
    "components/feedback/route-error.tsx",
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} must exist`)
  }
  const shared = readRepo("components/feedback/route-error.tsx")
  assert.match(shared, /ErrorState/, "boundary must render ErrorState")
  assert.match(shared, /onRetry=\{reset\}/, "retry must re-run the segment")
  assert.match(shared, /usePathname/, "boundary must observe navigation")
  assert.match(shared, /shouldResetRouteError/, "boundary must reset on move-on")
  assert.match(shared, /tabIndex=\{-1\}/, "failure region must take focus")
  assert.match(shared, /role="alert"|ErrorState/, "failure must be announced")
  assert.ok(!shared.includes("error.message"), "never render the raw message")
  assert.ok(!shared.includes("error.stack"), "never render a stack trace")
  assert.ok(!shared.includes("{error.digest"), "never render backend digests")
  const global = readRepo("app/global-error.tsx")
  assert.match(global, /<html/, "global boundary owns its document")
  assert.match(global, /ErrorState/, "global boundary renders ErrorState")
  assert.match(global, /onRetry=\{reset\}/, "global retry re-runs the segment")
  assert.ok(!global.includes("error.message"), "global never renders raw")
})
