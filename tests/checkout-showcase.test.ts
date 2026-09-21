import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Checkout shell stays distraction-free with brand, progress, security, and emergency help", () => {
  const layoutPath = path.resolve(process.cwd(), "app/(checkout)/layout.tsx");
  assert.ok(fs.existsSync(layoutPath), "app/(checkout)/layout.tsx must exist");
  const content = fs.readFileSync(layoutPath, "utf-8");

  assert.match(content, /Secure Checkout/i, "Checkout header must show brand emblem");
  assert.match(content, /Booking progress/i, "Checkout must expose a progress indicator");
  assert.match(content, /Traveller Details/i, "Progress must name checkout steps");
  assert.match(content, /aria-current/, "Current step must use aria-current");
  assert.match(content, /Paystack/i, "Checkout must reassure with payment security badge");
  assert.match(content, /tel:/, "Checkout must offer an emergency phone link");
  assert.match(
    content,
    /lib\/content\/company|company\.phone/,
    "Checkout emergency phone must read from lib/content/company.ts (no hardcoded numbers)"
  );
  assert.doesNotMatch(
    content,
    /tel:\+2348000000000/,
    "Checkout must not hardcode the emergency phone number"
  );
  assert.match(content, /Skip to checkout/, "Checkout must provide a skip link");

  assert.doesNotMatch(content, /PublicNav/, "Checkout must strip public navigation");
  assert.doesNotMatch(content, /PublicFooter/, "Checkout must strip marketing footer");
  assert.doesNotMatch(content, /AssistedSupportWidget/, "Checkout must stay distraction-free");
  assert.doesNotMatch(content, /\/flights/, "Checkout must not link to marketing services");
  assert.doesNotMatch(content, /\/hotels/, "Checkout must not link to marketing services");
});

test("Checkout page presents a secure Guest Booking without marketing egress", () => {
  const pagePath = path.resolve(process.cwd(), "app/(checkout)/checkout/page.tsx");
  assert.ok(fs.existsSync(pagePath), "app/(checkout)/checkout/page.tsx must exist");
  const content = fs.readFileSync(pagePath, "utf-8");

  assert.match(content, /Secure Guest Booking Checkout/, "Checkout page must name Guest Booking");
  assert.match(content, /without creating an account/i, "Must explain Guest Booking plainly");
  assert.match(content, /AAA-000000/, "Must show a booking reference placeholder");
});

test("Foundation Showcase demonstrates all Phase 1 primitives in one view", () => {
  const showcasePath = path.resolve(process.cwd(), "app/(public)/foundation/page.tsx");
  assert.ok(fs.existsSync(showcasePath), "app/(public)/foundation/page.tsx must exist");
  const content = fs.readFileSync(showcasePath, "utf-8");

  assert.match(content, /Foundation Showcase/, "Showcase must have a clear title");
  assert.match(content, /Typography.*Brand Tokens|sBrand/i, "Must cover typography tokens");
  assert.match(content, /Button Variants/, "Must demonstrate button variants");
  assert.match(content, /TravellerStepper/, "Must demonstrate traveller composition");
  assert.match(content, /Traveller.*not passenger/i, "Must use domain language for Traveller");
  assert.match(content, /LoadingState/, "Must demonstrate travel-aware loading presets");
  assert.match(content, /preset="flights"/, "Must include flight search preset");
  assert.match(content, /preset="payment"/, "Must include payment verification preset");
  assert.match(content, /ErrorState/, "Must demonstrate error recovery states");
  assert.match(content, /CardSkeleton/, "Must demonstrate card skeletons");
  assert.match(content, /TableSkeleton/, "Must demonstrate table skeletons");
  assert.match(content, /notifyEnquirySent|notifyCallbackRequested/, "Must trigger toast notifications");
  assert.match(content, /wa\.me/, "Must demonstrate WhatsApp escalation");
  assert.match(content, /tel:/, "Must demonstrate emergency calling");
});
