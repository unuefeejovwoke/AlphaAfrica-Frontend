import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("Checkout shares the public shell so the interface never switches mid-booking", () => {
  const layoutPath = path.resolve(process.cwd(), "app/(checkout)/layout.tsx")
  assert.ok(fs.existsSync(layoutPath), "app/(checkout)/layout.tsx must exist")
  const content = fs.readFileSync(layoutPath, "utf-8")

  assert.match(
    content,
    /SiteShell/,
    "Checkout must render the shared site shell"
  )
  assert.doesNotMatch(
    content,
    /CHECKOUT_STEPS|Traveller Details/i,
    "Checkout must not hardcode a second progress nav"
  )

  const shellPath = path.resolve(
    process.cwd(),
    "components/navigation/site-shell.tsx"
  )
  assert.ok(
    fs.existsSync(shellPath),
    "components/navigation/site-shell.tsx must exist"
  )
  const shell = fs.readFileSync(shellPath, "utf-8")
  assert.match(shell, /PublicNav/, "Shell must render the public navigation")
  assert.match(shell, /PublicFooter/, "Shell must render the public footer")
  assert.match(
    shell,
    /AssistedSupportWidget/,
    "Shell must keep Talk to Alphaa one tap away"
  )
  assert.match(shell, /Skip to main content/, "Shell must provide a skip link")
})

test("Retired payment route redirects to the one-page checkout", () => {
  const paymentPath = path.resolve(
    process.cwd(),
    "app/(checkout)/checkout/payment/page.tsx"
  )
  assert.ok(
    fs.existsSync(paymentPath),
    "app/(checkout)/checkout/payment/page.tsx must exist for old links"
  )
  const content = fs.readFileSync(paymentPath, "utf-8")

  assert.match(
    content,
    /redirect\(["']\/checkout["']\)/,
    "Old payment links must land on the live checkout"
  )
})

test("Checkout page presents a secure Guest Booking without marketing egress", () => {
  // The heading lives in the checkout client (not the page shell) so the
  // reserved / expired / missing states render their own titles instead of
  // the traveller-details copy.
  const pagePath = path.resolve(
    process.cwd(),
    "app/(checkout)/checkout/page.tsx"
  )
  assert.ok(
    fs.existsSync(pagePath),
    "app/(checkout)/checkout/page.tsx must exist"
  )
  const clientPath = path.resolve(
    process.cwd(),
    "components/flights/checkout-client.tsx"
  )
  assert.ok(
    fs.existsSync(clientPath),
    "components/flights/checkout-client.tsx must exist"
  )
  const content = fs.readFileSync(clientPath, "utf-8")

  assert.match(
    content,
    /Secure Guest Booking Checkout/,
    "Checkout page must name Guest Booking"
  )
  assert.doesNotMatch(
    content,
    /Return to homepage|AAA-000000/,
    "Must offer no egress from checkout and no fake booking reference"
  )
  assert.match(
    content,
    /pay now/i,
    "Must present immediate payment as the default action"
  )
  assert.match(
    content,
    /reserve/i,
    "Must present the reserve-and-pay-later choice for international flights"
  )
})

test("Foundation Showcase demonstrates all Phase 1 primitives in one view", () => {
  const showcasePath = path.resolve(
    process.cwd(),
    "app/(public)/foundation/page.tsx"
  )
  assert.ok(
    fs.existsSync(showcasePath),
    "app/(public)/foundation/page.tsx must exist"
  )
  const content = fs.readFileSync(showcasePath, "utf-8")

  assert.match(
    content,
    /Foundation Showcase/,
    "Showcase must have a clear title"
  )
  assert.match(
    content,
    /Typography.*Brand Tokens|sBrand/i,
    "Must cover typography tokens"
  )
  assert.match(content, /Button Variants/, "Must demonstrate button variants")
  assert.match(
    content,
    /TravellerStepper/,
    "Must demonstrate traveller composition"
  )
  assert.match(
    content,
    /Traveller.*not passenger/i,
    "Must use domain language for Traveller"
  )
  assert.match(
    content,
    /LoadingState/,
    "Must demonstrate travel-aware loading presets"
  )
  assert.match(content, /preset="flights"/, "Must include flight search preset")
  assert.match(
    content,
    /preset="payment"/,
    "Must include payment verification preset"
  )
  assert.match(content, /ErrorState/, "Must demonstrate error recovery states")
  assert.match(content, /CardSkeleton/, "Must demonstrate card skeletons")
  assert.match(content, /TableSkeleton/, "Must demonstrate table skeletons")
  assert.match(
    content,
    /notifyEnquirySent|notifyCallbackRequested/,
    "Must trigger toast notifications"
  )
  assert.match(
    content,
    /wa\.me|getSupportWhatsAppUrl|getWhatsAppUrl/,
    "Must demonstrate WhatsApp escalation"
  )
  assert.match(content, /tel:/, "Must demonstrate emergency calling")
})
