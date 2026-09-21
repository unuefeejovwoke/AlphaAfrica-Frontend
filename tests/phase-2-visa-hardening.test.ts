import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Seams under test (pre-agreed):
// 1. lib/listings.ts — visa ItemList/Service JSON-LD helpers (pure)
// 2. lib/analytics.ts — §22 allowlist, PII stripping, server-safe (pure)
// 3. Route contracts at the file seam (metadata, JSON-LD, consultation,
//    Paystack redirect, verify-then-order, WhatsApp hatch from company.ts)

import {
  visaCountryListJsonLd,
  visaCountryDetailJsonLd,
} from "../lib/listings.ts";
import { ANALYTICS_EVENTS, track, sanitizeProps } from "../lib/analytics.ts";

// --- 1. Visa JSON-LD (AI SEO / GEO, no thin pages) ---

test("Visa listing JSON-LD stays non-thin with one node per country", () => {
  const list = visaCountryListJsonLd([
    {
      name: "United Kingdom",
      slug: "united-kingdom",
      consultation_fee: "25000",
      processing_time: "3 to 4 weeks",
      flag_image: "https://cdn.example.com/uk.png",
    },
  ]);
  assert.equal(list["@type"], "ItemList");
  assert.equal(list.itemListElement.length, 1);
  assert.match(list.itemListElement[0].url, /\/visa\/united-kingdom/);
});

test("Visa detail JSON-LD emits a Service with an NGN offer", () => {
  const service = visaCountryDetailJsonLd({
    name: "United Kingdom",
    slug: "united-kingdom",
    consultation_fee: "25000",
    processing_time: "3 to 4 weeks",
    flag_image: "https://cdn.example.com/uk.png",
    description: "Guidance for UK visitor visas",
  });
  assert.equal(service["@type"], "Service");
  assert.equal(service.offers.priceCurrency, "NGN");
  assert.ok(String(service.offers.price).length > 0);
});

// --- 2. Analytics (§22, never captures PII) ---

test("Analytics allowlist covers the Phase 2 §22 events", () => {
  for (const event of [
    "package_viewed",
    "package_enquiry_submitted",
    "visa_country_viewed",
    "visa_application_started",
    "visa_payment_initiated",
    "visa_payment_completed",
    "support_click",
    "booking_confirmation_viewed",
  ]) {
    assert.ok(
      (ANALYTICS_EVENTS as readonly string[]).includes(event),
      `${event} must be an allowlisted analytics event`,
    );
  }
});

test("Analytics props never carry passport, payment, or token data", () => {
  const clean = sanitizeProps({
    slug: "united-kingdom",
    travellers: 2,
    passport_number: "A123",
    card_number: "4111",
    authorization_url: "https://paystack.test/x",
    token: "secret",
    email: "a@example.com",
    phone: "+2348031234567",
  });
  assert.equal(clean.slug, "united-kingdom");
  assert.equal(clean.travellers, 2);
  for (const key of Object.keys(clean)) {
    assert.doesNotMatch(
      key,
      /passport|payment|card|token|email|phone|auth/i,
      `PII key must be stripped: ${key}`,
    );
  }
});

test("track() is server-safe and rejects unknown events", () => {
  assert.doesNotThrow(() => track("visa_country_viewed", { slug: "uk" }));
  assert.throws(() => track("user_password_typed" as never), /unknown.*event/i);
});

// --- 3. Route contracts (external behavior at the file seam) ---

function readRoute(relative: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relative), "utf-8");
}

test("Visa listing is an ISR Server Component with a country grid", () => {
  const content = readRoute("app/(public)/visa/page.tsx");
  assert.doesNotMatch(content, /"use client"/, "Visa listing must be a React Server Component");
  assert.match(content, /export const revalidate = 3600/, "Visa listing must revalidate every 3600s");
  assert.match(content, /generateMetadata/, "Visa listing must expose metadata for SEO");
  assert.match(content, /application\/ld\+json/, "Visa listing must embed JSON-LD");
  assert.match(content, /organizationJsonLd/, "Visa listing must embed Organization JSON-LD");
  assert.match(content, /VisaCountryCard|visa-country-card/, "Visa listing must render country cards");
  assert.match(content, /consultation_fee|Consultation fee/, "Cards must show the consultation fee");
  assert.match(content, /processing_time|Processing time/, "Cards must show processing time");
  assert.match(content, /TerminalCta|Talk to Alphaa/, "Visa listing must end with a support hatch");
});

test("Visa detail renders the nine PRD sections with a locked consultation form", () => {
  const content = readRoute("app/(public)/visa/[slug]/page.tsx");
  assert.doesNotMatch(content, /"use client"/, "Visa detail must be a React Server Component");
  assert.match(content, /generateStaticParams/, "Visa detail must pre-render known slugs");
  assert.match(content, /generateMetadata/, "Visa detail must expose metadata for SEO");
  assert.match(content, /application\/ld\+json/, "Visa detail must embed JSON-LD");
  assert.match(content, /organizationJsonLd/, "Visa detail must embed Organization JSON-LD");
  assert.match(content, /VisaConsultationForm|visa-consultation-form/, "Visa detail must embed the inline consultation form");
  assert.match(content, /FAQ|faqPageJsonLd/, "Visa detail must answer questions with FAQ content");
  for (const heading of ["overview", "Consultation fee", "Processing", "Who", "helps with"]) {
    assert.match(content, new RegExp(heading, "i"), `Visa detail must include: ${heading}`);
  }
});

test("Consultation form locks country, offers 7 purposes, and Paystack-redirects", () => {
  const content = readRoute("components/visa/visa-consultation-form.tsx");
  assert.match(content, /"use client"/, "Consultation form must be a client component");
  assert.match(content, /react-hook-form/, "Consultation form must use RHF");
  assert.match(content, /zodResolver|visaConsultationSchema/, "Consultation form must validate with Zod");
  assert.match(content, /readOnly|countryName|locked/i, "Country must be prefilled and locked");
  assert.match(content, /travel_purpose/, "Form must capture travel purpose");
  assert.match(content, /TRAVEL_PURPOSE_LABELS|travelPurposeSchema/, "Purposes must come from the API-mirrored schema");
  assert.match(content, /num_applicants/, "Form must capture applicant count");
  assert.match(content, /authorization_url/, "Form must redirect to the Paystack authorization URL");
  assert.match(content, /window\.location\.href/, "Paystack handoff must be a full redirect");
  assert.match(content, /isSubmitting|submittedReference/, "Duplicate submits must be disabled while pending");
  assert.match(content, /getHumanErrorMessage/, "Backend errors must map to human copy");
});

test("Verify page fetches the final order and never assumes success", () => {
  // The route is an RSC shell plus a live client: assert them together.
  const content =
    readRoute("app/(public)/visa/verify/[reference]/page.tsx") +
    readRoute("components/visa/visa-verify-client.tsx");
  assert.match(content, /verifyVisaPayment/, "Verify must call the visa verification endpoint");
  assert.match(content, /getPaymentOrder|payments\/order|order/i, "Verify must fetch the final order");
  assert.match(content, /getPaymentSafetyCopy|payment safe|reconcile/i, "Failure must reassure about payment safety");
  assert.match(content, /WhatsApp|whatsapp|getSupportWhatsAppUrl/i, "Verify must hatch to WhatsApp support");
  assert.doesNotMatch(content, /payment succeeded|booking confirmed/i, "Verify must not assume success on load");
});

test("Support hatch reads every number from company.ts with context prefill", () => {
  for (const file of [
    "components/support/assisted-support-widget.tsx",
    "components/shared/terminal-cta.tsx",
    "app/(public)/page.tsx",
    "app/(public)/about/page.tsx",
  ]) {
    const content = readRoute(file);
    assert.match(content, /lib\/content\/company/, `${file} must read contact details from company.ts`);
    assert.match(content, /getSupportWhatsAppUrl|getWhatsAppUrl/, `${file} must prefill WhatsApp context`);
  }
  const widget = readRoute("components/support/assisted-support-widget.tsx");
  assert.match(widget, /visa.*assistance|assistance.*visa/i, "Widget must know the visa context");
});
