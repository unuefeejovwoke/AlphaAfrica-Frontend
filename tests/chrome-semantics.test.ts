import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8")
}

test("Desktop Explore disclosure wires expanded state to the panel it presents", () => {
  const nav = read("components/navigation/public-nav.tsx")

  assert.match(
    nav,
    /id="explore-menu-trigger"/,
    "Explore trigger must carry an id so the panel can reference it"
  )
  assert.match(
    nav,
    /aria-controls="explore-mega-menu"/,
    "Explore trigger must declare which panel it expands"
  )
  assert.match(
    nav,
    /id="explore-mega-menu"/,
    "Explore panel must carry the id the trigger points at"
  )
  assert.match(
    nav,
    /aria-labelledby="explore-menu-trigger"/,
    "Explore panel must be named by its trigger"
  )
  assert.doesNotMatch(
    nav,
    /aria-haspopup/,
    "The services panel is a link disclosure, not a role=menu widget — " +
      "aria-haspopup=true would announce a menu that has no menu semantics"
  )
})

test("Mobile menu trigger and drawer panel share the same relationship", () => {
  const nav = read("components/navigation/public-nav.tsx")

  assert.match(
    nav,
    /aria-controls="mobile-navigation-drawer"/,
    "Mobile trigger must declare which panel it opens"
  )
  assert.match(
    nav,
    /id="mobile-navigation-drawer"/,
    "Drawer popup must carry the id the trigger points at"
  )
  assert.match(
    nav,
    /aria-label="Open navigation menu"/,
    "Trigger only opens; the drawer's own Close affordance closes"
  )
  assert.doesNotMatch(
    nav,
    /Toggle navigation menu/,
    "Stale 'Toggle' label must not survive — the button cannot close"
  )
  assert.match(
    nav,
    /aria-controls="mobile-services-panel"/,
    "Drawer Explore disclosure must declare its panel"
  )
})

test("Footer is a labelled landmark with a correct heading outline", () => {
  const footer = read("components/navigation/public-footer.tsx")

  assert.match(
    footer,
    /<footer\s+aria-label="Site footer"/,
    "Footer landmark must be labelled"
  )
  assert.doesNotMatch(footer, /<h3/, "Footer column headings must not be h3")
  assert.match(
    footer,
    /<h2 className="mb-3\.5 text-xs font-semibold/,
    "Column headings start at h2 — there is no deeper heading ancestor"
  )
  assert.match(
    footer,
    /role="group"\s+aria-label="Social media links"/,
    "aria-label is only exposed on a role=group element, not a plain div"
  )
})

test("Phone hit targets meet the 44px minimum", () => {
  const nav = read("components/navigation/public-nav.tsx")
  const hotelPagination = read("components/hotels/hotel-pagination.tsx")
  const carPagination = read("components/cars/car-pagination.tsx")
  const calculator = read("components/cars/car-hire-calculator.tsx")
  const phoneField = read("components/ui/phone-field.tsx")

  // Mobile nav trigger + drawer close: 44px square on touch, shrunk on ≥sm
  // pointer-accurate screens only.
  assert.match(
    nav,
    /inline-flex size-11 touch-manipulation items-center justify-center rounded-lg border/,
    "Mobile menu trigger must be a 44px target"
  )
  for (const [label, content] of [
    ["hotel pagination", hotelPagination],
    ["car pagination", carPagination],
  ] as const) {
    assert.match(
      content,
      /size-11 touch-manipulation items-center justify-center rounded-lg text-sm font-semibold tabular-nums[^"]*sm:size-9/,
      `${label} page buttons must be 44px on phones (36px on desktop is fine)`
    )
    assert.match(
      content,
      /min-h-11 touch-manipulation sm:min-h-8/,
      `${label} prev/next buttons must reach 44px on phones`
    )
  }
  assert.match(
    calculator,
    /aria-label="Reduce hours by one"\s+className="size-11 shrink-0"/,
    "Hours stepper minus must be a 44px target"
  )
  assert.match(
    calculator,
    /aria-label="Add one hour"\s+className="size-11 shrink-0"/,
    "Hours stepper plus must be a 44px target"
  )
  assert.match(
    phoneField,
    /flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground[^"]*sm:size-9/,
    "Dial-code combobox trigger must be a 44px target on phones"
  )
})

test("Combobox, phone and date fields declare autofill and naming behaviour", () => {
  const phoneField = read("components/ui/phone-field.tsx")
  const calculator = read("components/cars/car-hire-calculator.tsx")
  const bookingFlow = read("components/hotels/hotel-booking-flow.tsx")
  const autocomplete = read("components/flights/airport-autocomplete.tsx")

  assert.match(
    phoneField,
    /autoComplete="off"\s+aria-label=\{`Country dial code/,
    "Dial-code combobox input must opt out of browser autofill"
  )
  assert.match(
    phoneField,
    /autoComplete = "tel"/,
    "Phone national input must declare tel autofill by default"
  )
  assert.match(
    autocomplete,
    /autoComplete="off"/,
    "Airport combobox must opt out of browser autofill"
  )
  assert.match(
    calculator,
    /type="date"\s+name="pickup_date"\s+autoComplete="off"/,
    "Car pickup date must be named and opt out of autofill"
  )
  assert.match(
    calculator,
    /type="time"\s+name="pickup_time"\s+autoComplete="off"/,
    "Car pickup time must be named and opt out of autofill"
  )
  assert.match(
    bookingFlow,
    /label="Check-in"\s+name="check_in"\s+autoComplete="off"/,
    "Hotel check-in must be a named input"
  )
  assert.match(
    bookingFlow,
    /label="Check-out"\s+name="check_out"\s+autoComplete="off"/,
    "Hotel check-out must be a named input"
  )
})

test("Reveal animations run on compositor-friendly properties, layout ones excluded", () => {
  const faq = read("components/faq/faq-interactive.tsx")
  const homeFaq = read("components/home/home-faq.tsx")

  for (const [label, content] of [
    ["FAQ page accordion", faq],
    ["home accordion", homeFaq],
  ] as const) {
    assert.match(
      content,
      /Accordion\.Panel className="overflow-hidden transition-opacity/,
      `${label} panels must animate opacity only`
    )
    assert.doesNotMatch(
      content,
      /transition-\[height/,
      `${label} panels must not transition height — it re-runs document layout every frame`
    )
    assert.doesNotMatch(
      content,
      /accordion-panel-height/,
      `${label} panels must not keep the height-animation sizing hook`
    )
  }
})

test("Document-wide reduced-motion guard exists in globals.css", () => {
  const css = read("app/globals.css")

  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)/,
    "globals.css must ship a prefers-reduced-motion backstop"
  )
  assert.match(
    css,
    /transition-duration: 0\.01ms !important/,
    "Reduced motion must collapse transitions"
  )
  assert.match(
    css,
    /animation-duration: 0\.01ms !important/,
    "Reduced motion must collapse animations"
  )
  assert.match(
    css,
    /scroll-behavior: auto !important/,
    "Reduced motion must disable smooth scrolling"
  )
})

test("Page declares a theme colour matching the page background", () => {
  const layout = read("app/layout.tsx")
  const css = read("app/globals.css")
  const manifest = read("public/site.webmanifest")

  assert.match(
    layout,
    /export const viewport: Viewport = \{\s*themeColor: "#faf9f7",?\s*\}/,
    "layout.tsx must declare themeColor through the Next Viewport export"
  )
  assert.match(
    css,
    /--background: #faf9f7;/,
    "Theme colour must match the --background token it mirrors"
  )
  assert.match(
    manifest,
    /"theme_color":"#faf9f7"/,
    "Web manifest theme colour must match the page background"
  )
})
