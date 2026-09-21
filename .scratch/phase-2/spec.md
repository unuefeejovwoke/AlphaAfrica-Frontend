Status: ready-for-agent

# Specification: Phase 2 — Public Marketing Experience

## Problem Statement

Visitors must quickly understand Alphaa can book flights, hotels, cars, holiday packages, and visa help, then browse destinations/packages/visa offerings and submit an Enquiry or Visa Consultation without confusion or dead ends. Today only `/`, `/foundation`, and `/checkout` exist; all Phase 2 routes, API wiring, and verified content are missing.

## Solution

Build 10 public routes under `app/(public)` as React Server Components with ISR (`revalidate 3600`, `dynamicParams true` per ADR-0003): Home (live featured), About, Contact (no form, details + Google Map embed), FAQ (grouped), Destinations + `[slug]`, Packages + `[slug]` (URL-driven filters + inline Enquiry), Visa + `[slug]` (inline Consultation + Paystack redirect + `/visa/verify/[reference]`). Centralize HTTP in `lib/api/`, content in `lib/content/company.ts, contact.ts, faqs.ts, testimonials.ts, stats.ts` (Draft|Verified, SEO included), forms in RHF+Zod with human error mapping, and floating/terminal WhatsApp hatch from `company.ts`.

Ubiquitous language (CONTEXT.md): Enquiry = package no-payment request; Visa Consultation = paid country-specific guidance (avoid Visa Application/booking/enquiry); Booking = flights/hotels/cars only; Destination = place grouping with count + starting price; Package = curated itinerary with duration + from-price + inclusions.

## User Stories

1. As a leisure traveller, I want featured destinations/packages on Home with images, count/price/duration, so I can discover trips fast.
2. As a first-time traveller, I want package detail with highlights/inclusions/gallery/description + inline enquiry (name/email/phone/dates/party/message), so I get help without payment stress.
3. As a visa seeker, I want country detail (fee/processing time/overview/FAQ) + inline consultation (purpose/applicants/message) → Paystack → verified confirmation, so I know payment succeeded.
4. As a mobile visitor, I want thumb-friendly filters (packages via URL), bottom-sheet-ready controls, sticky CTAs, and one-tap WhatsApp with trip context.
5. As a returning visitor, I want About (lean trust), Contact (channels + hours + map), FAQ (grouped, crawlable) with clear next actions on every page.

## Implementation Decisions

- RSC + `generateStaticParams` + ISR 3600 + `dynamicParams true`; Home parallel `Promise.all` featured fetches; skeletons, empty ("No featured trips right now, talk to Alphaa"), error+retry; no empty containers (§12).
- `lib/api/` typed client, base URL from env, server GET cached, client POST for Enquiry/Consultation, raw errors mapped to human copy (§10), Nigerian phone/date/counter parity (adults min 1, applicants min 1, dates not past).
- `generateMetadata` + JSON-LD (TouristTrip, FAQPage, Organization) + semantic H1/alt/canonical/OG + crawlable links (§18); analytics events (§22) without passport/payment/token data.
- Support hatch from `company.ts` everywhere; Contact map via no-key `maps.google.com/maps?q=<address>&output=embed` lazy iframe from `company.ts` draft coords.

## Testing Decisions

- External behavior only: featured cards render, filters update URL + results, enquiry shows reference, visa redirects to auth_url then verify confirms, empty/error/retry paths work, WhatsApp prefill includes context.
- `pnpm typecheck` + `pnpm build` pass with zero errors; keyboard/focus/contrast/ARIA on forms, dialogs, steppers, date pickers.

## Out of Scope

- Phases 3–6: flights search/streaming/price/checkout, hotels detail/booking, cars booking, auth/account/order history. Flight/hotel/car tabs on Home route to coming-soon hatch.
- Real Paystack secrets, CMS, backend changes. Draft FAQ/testimonial/stat copy stays until verified replacements land.

## Further Notes

- No fabricated claims beyond Draft-marked content the owner will replace; `stats.ts` stays empty until verified numbers supplied.
- Follow ADR-0001 route groups, ADR-0002 RHF+Zod, ADR-0003 ISR.
