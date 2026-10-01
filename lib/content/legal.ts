/**
 * Canonical legal content (Privacy Policy + Terms & Conditions).
 * Single source of truth for the `/privacy` and `/terms` routes — page
 * components render from here so copy can never drift between SEO metadata,
 * table of contents, and body sections.
 *
 * Contact facts defer to `company.ts` — never hardcode numbers or emails here.
 * Legal substance follows the Nigeria Data Protection Act 2023 (NDPA),
 * the platform PRD (guest booking, enquiry-first packages, paid visa
 * consultations, Paystack verification flows), and standard travel-agency
 * practice where Alphaa acts as agent/intermediary and supplier fare rules
 * prevail.
 */

import { company } from "./company.ts"

export interface LegalSection {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
  closing?: string
}

export interface LegalDocument {
  slug: "privacy" | "terms"
  title: string
  eyebrow: string
  effectiveDate: string
  intro: string[]
  sections: LegalSection[]
  seo: { title: string; description: string }
}

export const LEGAL_EFFECTIVE_DATE = "30 September 2026"

export const privacyPolicy: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  eyebrow: "Privacy & data protection",
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  intro: [
    'Alphaa Africa Limited ("Alphaa Africa", "we", "us", "our") operates the travel booking and assisted-service platform at alphaaafrica.com, covering flights, hotels, holiday packages, visa consultations, car rentals, destinations, and related support over WhatsApp, phone, email, and in person at our Abuja office.',
    "This Privacy Policy explains, in clear and plain language as required by the Nigeria Data Protection Act 2023 (NDPA), what personal data we collect, why we collect it, the lawful bases we rely on, who we share it with, how long we keep it, and the rights you can exercise over it. It applies to everyone who visits our website, creates an account, makes a guest booking, submits an enquiry or visa consultation request, or contacts our travel specialists.",
  ],
  sections: [
    {
      id: "controller",
      title: "1. Who is responsible for your data",
      paragraphs: [
        "Alphaa Africa Limited is the data controller for personal data processed through this platform. That means we decide the purposes and means of processing described in this policy. Where we use service providers (for example payment processing or hosting) to handle data on our behalf, they act as data processors under our instructions.",
        `Our registered office and primary contact point is ${company.office.address}. For any privacy question, request, or complaint, contact ${company.email} and we will route it to the responsible team. Where the NDPA requires a designated Data Protection Officer, that contact serves as the channel to reach them.`,
      ],
    },
    {
      id: "scope",
      title: "2. Scope of this policy",
      paragraphs: [
        "This policy covers personal data collected through our website, booking and enquiry flows, customer accounts, and support conversations (including WhatsApp chats, calls, and emails where you share booking details with us). It does not cover third-party websites you reach through links on our platform — including airline, hotel, embassy, payment, map, or social-media sites — each of which has its own privacy policy.",
      ],
    },
    {
      id: "data-we-collect",
      title: "3. Personal data we collect",
      paragraphs: [
        "We collect only data that is adequate, relevant, and limited to what is necessary for the purposes below (data minimisation). Depending on what you do on the platform, this may include:",
      ],
      bullets: [
        "Identity and contact details: full name, email address, phone number, and — only where a booking or account flow requires it — date of birth and gender.",
        "Traveller details: for each traveller on a flight booking, first and last name, date of birth, gender, email, phone, traveller type (adult, child, held infant), and passport details where the airline or route requires them.",
        "Hotel and car-booking details: guest name, email, phone, stay or hire dates, room and guest counts, pickup and drop-off locations, and pickup times.",
        "Package enquiries and visa consultations: country of interest, travel purpose (tourism, business, study, work, medical, family visit, or other), preferred dates, number of applicants, and any message or documents you choose to share so a specialist can advise you.",
        "Account data: login credentials (passwords are stored only as irreversible hashes — never in readable form), email-verification and password-reset codes, profile updates, and booking history.",
        "Transaction records: booking references, payment references, amounts, currency, payment status, and verification outcomes. Card and bank credentials are entered on Paystack's secure pages — we never collect, see, or store your card number, CVV, PIN, or bank login.",
        "Support correspondence: messages, call notes, and documents you send over WhatsApp, phone, email, or our contact forms, including booking references you quote so we can locate a transaction.",
        "Technical and usage data: device and browser type, approximate location derived from IP address, pages viewed, searches performed, and booking-funnel events. Analytics events never carry passport data, payment credentials, passwords, or authentication tokens.",
      ],
    },
    {
      id: "lawful-bases",
      title: "4. Lawful bases we rely on (NDPA sections 25–26)",
      paragraphs: [
        "We process personal data only where at least one recognised lawful basis applies. In practice that means:",
      ],
      bullets: [
        "Contract: to search fares, create pending bookings, process payments, issue confirmations, and manage enquiries and consultations you asked us to perform.",
        "Consent: where you freely give it — for example marketing messages, optional cookies, or sharing documents beyond what a booking strictly requires. You may withdraw consent at any time without detriment, and withdrawal does not affect processing already carried out.",
        "Legal obligation: to keep transaction and tax records, respond to lawful requests from competent authorities, and comply with aviation, immigration, and financial regulations.",
        "Legitimate interests: to operate a secure platform, prevent fraud and duplicate charges, improve our services, and pursue or defend legal claims — balanced at all times against your rights and freedoms.",
        "Vital interests: in rare emergencies, to protect life or safety — for example sharing a traveller's details with an airline or emergency contact where necessary.",
      ],
    },
    {
      id: "how-we-use",
      title: "5. How we use your data",
      paragraphs: [
        "We use personal data for specified, explicit, and legitimate purposes only, and never for incompatible purposes:",
      ],
      bullets: [
        "To display flight, hotel, package, visa, and vehicle options and to complete the searches, bookings, enquiries, and consultations you request.",
        "To create pending bookings, redirect you to Paystack for payment, verify the payment reference, and issue booking confirmations with PNR or reservation references.",
        "To operate accounts: registration, login with JWT access and refresh tokens, email verification, password reset, profile management, and order history.",
        "To provide human assistance: answering questions on WhatsApp, phone, and email, reconciling deducted-but-unconfirmed payments, and following up on package enquiries and visa consultations.",
        "To keep the platform safe: fraud prevention, duplicate-submission protection, session management, access control, and troubleshooting.",
        "To meet legal duties and to communicate important service information such as fare changes before payment, booking status, and policy updates.",
        "To send marketing only where you have consented or where the law otherwise permits, with a clear way to opt out in every message.",
      ],
    },
    {
      id: "sharing",
      title: "6. Who we share your data with",
      paragraphs: [
        "We do not sell personal data. We share it only where necessary to deliver the travel services you requested or to meet legal duties, and only with parties that need it:",
      ],
      bullets: [
        "Airlines and distribution partners (including Amadeus for international offers and QuickAir for domestic Nigerian search) — traveller names, dates of birth, passport details, and contact data required to price, ticket, and fulfil a flight.",
        "Hotels, vehicle providers, and package suppliers — guest names, contact details, dates, and service preferences needed to hold or confirm a reservation.",
        "Paystack (our payment processor) — transaction amount, currency, reference, and contact details needed to authorise and verify payment. Paystack processes card and bank credentials directly under its own policy.",
        "Communication and infrastructure providers — hosting, email delivery, Google Maps embeds, and WhatsApp/Meta messaging services used to run support conversations you initiate.",
        "Analytics providers (Google Tag Manager / Google Analytics, only where enabled) — aggregated, pseudonymised usage statistics with sensitive fields stripped before any event is recorded.",
        "Professional advisers, auditors, and competent authorities — where required by law, court order, or to establish, exercise, or defend legal claims.",
      ],
      closing:
        "Every processor we engage is required to handle data only on our instructions, keep it confidential, and apply appropriate technical and organisational safeguards.",
    },
    {
      id: "cross-border",
      title: "7. Cross-border transfers",
      paragraphs: [
        "Travel is inherently international: confirming a flight, hotel, or visa service routinely means sending booking details to airlines, hotels, embassies, or technology providers located outside Nigeria. Where such a transfer occurs, we rely on an adequacy decision where one exists, or on appropriate safeguards such as contractual data-protection clauses, and we ensure your NDPA rights travel with the data. You may ask us at any time which categories of recipients outside Nigeria received your data for a given booking.",
      ],
    },
    {
      id: "cookies",
      title: "8. Cookies and analytics",
      paragraphs: [
        "We use a small number of cookies and similar storage to keep the site working and to understand aggregate usage. Strictly necessary storage (session security, search state, consent choice) is always on because the platform cannot function without it. Optional analytics cookies (for example Google Analytics via Tag Manager) are used only to measure funnel performance — searches started and completed, bookings confirmed, enquiries submitted — and never capture passport data, payment credentials, passwords, or tokens.",
        "You can manage or delete cookies in your browser settings at any time; blocking optional analytics will not break booking. Where analytics is disabled by configuration, our measurement code no-ops entirely.",
      ],
    },
    {
      id: "retention",
      title: "9. How long we keep your data",
      paragraphs: [
        "We retain personal data no longer than necessary for the purposes collected (storage limitation), then delete or anonymise it:",
      ],
      bullets: [
        "Booking and transaction records: retained for as long as needed to service the booking, handle changes, refunds, or disputes, and to satisfy tax, accounting, and aviation record-keeping duties.",
        "Account data: retained while your account is active; on closure we delete or anonymise profile data except where law requires retention.",
        "Enquiries and support messages: retained for a reasonable follow-up and quality-assurance window, then deleted or anonymised.",
        "Technical logs and analytics: retained in aggregated or short-lived form for security and performance monitoring.",
      ],
    },
    {
      id: "security",
      title: "10. How we protect your data",
      paragraphs: [
        "We apply appropriate technical and organisational measures to safeguard security, integrity, and confidentiality: encrypted transport (TLS/SSL), access controls limited to authorised personnel, centralised authentication with automatic token refresh and logout, server-side validation, and a rule that passwords, tokens, passport data, and payment credentials are never logged or placed in URLs. No method of transmission over the internet is completely secure, so where we become aware of a personal-data breach that poses a risk to your rights, we will notify the Nigeria Data Protection Commission within 72 hours and inform affected individuals as required by the NDPA.",
      ],
    },
    {
      id: "rights",
      title: "11. Your rights and how to exercise them (NDPA sections 34–38)",
      paragraphs: [
        "As a data subject you have the right to be informed; to access your data and obtain a copy; to rectify inaccurate or incomplete data; to erase data where it is no longer necessary or consent is withdrawn (subject to legal retention duties); to restrict processing while a dispute is resolved; to receive your data in a structured, commonly used, machine-readable format and to port it; to object to processing including direct marketing and to withdraw consent at any time; not to be subject to a decision based solely on automated processing, including profiling, that produces legal or similarly significant effects; and to lodge a complaint with the Nigeria Data Protection Commission or seek redress in court.",
        "To exercise any of these rights, email support@alphaaafrica.com with the subject “Data Rights Request”, telling us your name, the email or phone number used on the platform, and the right you wish to exercise. We will verify your identity proportionately, respond without undue delay and in any event within the statutory timeframe, and we will never charge you or penalise you for exercising your rights.",
      ],
    },
    {
      id: "children",
      title: "12. Children's data",
      paragraphs: [
        "Our platform is intended for adults who can enter binding contracts. Children's and infants' traveller details may only be submitted by a parent, legal guardian, or person authorised to act for them, strictly for the purpose of completing a booking that includes them. We do not knowingly collect data directly from children for marketing or accounts.",
      ],
    },
    {
      id: "marketing",
      title: "13. Marketing communications",
      paragraphs: [
        "We send promotions, new-package alerts, or travel inspiration only with your consent or where the law otherwise permits, and every message includes a simple way to opt out. Withdrawing marketing consent does not affect service messages we must send about a booking, payment, or consultation you requested.",
      ],
    },
    {
      id: "changes",
      title: "14. Changes to this policy",
      paragraphs: [
        "If we change this policy materially, we will publish the updated version on this page with a new effective date and, where appropriate, notify account holders or active customers by email. The version in force at the time you use the platform governs that use. Continued use after the effective date constitutes acknowledgement of the updated policy.",
      ],
    },
    {
      id: "contact",
      title: "15. Contact and complaints",
      paragraphs: [
        `For privacy questions, data-rights requests, or complaints, contact Alphaa Africa Limited at ${company.email}, on WhatsApp at ${company.whatsapp.display}, or at ${company.office.address} (Monday to Saturday, 8:00 AM to 6:00 PM WAT). If you remain dissatisfied after contacting us, you may lodge a complaint with the Nigeria Data Protection Commission (NDPC) or seek redress before a court of competent jurisdiction in Nigeria.`,
      ],
    },
  ],
  seo: {
    title: "Privacy Policy | Alphaa Africa",
    description:
      "How Alphaa Africa collects, uses, shares, and protects personal data across flights, hotels, packages, visa consultations, and car rentals — your NDPA 2023 rights, retention, security, and contact details.",
  },
}

export const termsConditions: LegalDocument = {
  slug: "terms",
  title: "Terms & Conditions",
  eyebrow: "Legal terms",
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  intro: [
    'These Terms & Conditions ("Terms") form a binding agreement between you (the customer making a booking, submitting an enquiry, or using this website) and Alphaa Africa Limited ("Alphaa Africa", "we", "us", "our"), an Abuja-based travel company operating the platform at alphaaafrica.com.',
    "By browsing this website, starting a search, creating an account, submitting an enquiry or visa consultation request, or paying for any booking, you confirm that you have read, understood, and agree to these Terms together with the supplier terms disclosed before payment (airline fare rules, hotel rate rules, and vehicle-hire terms) and our Privacy Policy. If you do not agree, please do not use the platform. If you book on behalf of other travellers, you confirm you have their authority to accept these Terms for them.",
  ],
  sections: [
    {
      id: "who-we-are",
      title: "1. Who we are and what we do",
      paragraphs: [
        `Alphaa Africa Limited combines modern self-service booking (flights, hotels, car rentals) with human-assisted services (holiday packages and visa consultations) supported by travel specialists reachable on WhatsApp, phone, and email, and in person at ${company.office.address}.`,
        "Unless expressly stated otherwise for a specific product, we act as an agent and intermediary between you and third-party suppliers (airlines, hotels, vehicle providers, and other principals). The travel service itself is provided by the supplier, and your booking is subject both to these Terms and to the supplier's terms attached to your fare, rate, or hire.",
      ],
    },
    {
      id: "services",
      title: "2. Our services",
      paragraphs: [
        "The platform offers the following, each governed by the rules described in this section and disclosed again before you pay:",
      ],
      bullets: [
        "Flights: one-way, round-trip, and multi-city search (international offers via Amadeus; domestic Nigerian results via QuickAir, which may stream progressively and take up to about a minute). Every result shows airline, schedule, duration, stops, cabin, baggage where available, total price, and currency before you select it.",
        "Hotels: search by destination or hotel name with filters for dates, guests, rooms, star rating, and price; detail pages show gallery, amenities, location, room types, and from-prices before you choose.",
        "Holiday packages: curated itineraries sold enquiry-first — you submit a no-payment enquiry and a specialist follows up to plan and price the trip. Nothing in a package listing is a confirmed reservation until we expressly confirm it.",
        "Visa consultations: paid, country-specific guidance (consultation fee and indicative processing time shown per country). This is advisory assistance only — see section 7.",
        "Car rentals: chauffeured vehicles by the hour (executive and standard sedans and SUVs, Coasters, and others), priced at the displayed hourly rate in Naira multiplied by booked hours; the backend-calculated total at checkout is authoritative.",
        "Destinations, blog, and FAQs: editorial and guidance content for discovery. Travel rules change frequently — always confirm current requirements with the relevant authority or our specialists before relying on them.",
      ],
    },
    {
      id: "supplier-terms",
      title: "3. Supplier terms prevail",
      paragraphs: [
        "Airline fare rules, hotel rate rules, and vehicle-hire terms govern changeability, refundability, baggage, check-in times, no-shows, and conduct during travel. Where there is any inconsistency between a supplier's terms and these Terms for the underlying travel service, the supplier's terms prevail for that service. We display or link the applicable rules before payment and our team will explain them on request — please read them before paying, because most discounted fares and rates are non-changeable and non-refundable.",
      ],
    },
    {
      id: "booking-payment",
      title: "4. Booking, pricing, and payment",
      paragraphs: [
        "Prices are shown in Naira (₦) unless a fare is denominated otherwise, and include applicable taxes and our service margin where disclosed. Flight prices shown during search are live offers that can change until ticketed: before you pay, we revalidate the fare with the airline. If the airline updated the fare, we show the previous amount, the new amount, and the difference, and you choose whether to continue at the new price or cancel — nothing is charged without your confirmation of the final total.",
        "Checkout creates a pending booking and redirects you to Paystack's secure pages to authorise payment; we never collect or store card numbers, CVVs, PINs, or bank logins. Returning from Paystack does not by itself mean the booking succeeded — we verify the payment reference with the backend and only then create the airline order/PNR or confirm the hotel or car reservation. Your confirmation screen and booking history show the final reference, amount, payment state, and next steps. Keep your payment and booking references: if a payment is deducted but confirmation is unclear, contact us immediately so we can locate and reconcile the transaction.",
      ],
    },
    {
      id: "accounts",
      title: "5. Guest booking and accounts",
      paragraphs: [
        "You can browse, search, and complete flight, hotel, and car bookings as a guest without creating an account. Account creation is encouraged after a successful booking so you can access order history — never forced before search. Where you do register, you must provide accurate details, keep your credentials confidential, verify your email when asked, and notify us of any suspected compromise. Guest order retrieval uses the secure email-and-token mechanism provided at booking; never share verification links or codes publicly.",
      ],
    },
    {
      id: "your-responsibilities",
      title: "6. Your responsibilities",
      paragraphs: [
        "Accurate information is essential to travel. You agree to:",
      ],
      bullets: [
        "Provide true, complete traveller details exactly as they appear on valid travel documents — you are liable for costs, denied boarding, or cancelled reservations caused by misspelt names, wrong dates of birth, or incorrect passport data.",
        "Hold valid passports, visas, transit permits, health certificates, and identifications for every traveller on every leg, including transit points; domestic Nigerian travel requires a recognised ID (NIN slip, driver's licence, voter's card, or passport).",
        "Meet airline check-in, reconfirmation, and boarding deadlines, hotel check-in/check-out times, and the agreed car pickup time and location.",
        "Ensure every traveller is fit to travel, holds required vaccinations or medical clearances, and complies with airline, hotel, immigration, and public-health rules.",
        "Supervise minors and obtain all consents needed for children or wards travelling with you.",
        "Use the platform lawfully and refrain from fraud, automated scraping, interference with booking flows, or submitting another person's data without authority.",
      ],
    },
    {
      id: "visa-disclaimer",
      title: "7. Visa consultations are advisory, not approvals",
      paragraphs: [
        "Our visa service is assistance and guidance — document checklists, form support, appointment preparation, and submission guidance for the country and travel purpose you select — in exchange for the stated consultation fee. Embassies and high commissions alone decide whether to grant or refuse a visa, and processing times they publish are indicative, not guaranteed. No fee paid to us, and no statement by our specialists, constitutes a promise or guarantee that a visa will be issued, issued by a particular date, or issued for a particular duration. Consultation fees cover professional time and are non-refundable once work has begun, even where the application is ultimately refused or delayed by the issuing authority.",
      ],
    },
    {
      id: "changes-cancellations",
      title: "8. Changes, cancellations, refunds, and no-shows",
      paragraphs: [
        "Whether a booking can be changed or refunded — and at what cost — is determined by the supplier fare or rate rules attached to your specific booking, which we disclose before payment. As a general framework:",
      ],
      bullets: [
        "Change and cancellation requests must be sent to us as early as possible through WhatsApp, phone, email, or the contact page, quoting your booking and payment references. Time limits in fare rules are strict — a request received after a deadline may already be unchangeable.",
        "Eligible refunds are processed back through the original payment channel after deduction of supplier penalties and any disclosed service fees; airline refunds in particular can take several weeks to several months to settle through settlement systems.",
        "No-shows (missing a flight, failing to check in, or not using a hotel night or car hire without prior cancellation) are treated under supplier rules and are typically non-refundable.",
        "Package enquiries submitted without payment carry no cancellation obligation; once a package is confirmed and paid under bespoke terms, those written terms govern.",
        "If we must cancel or materially alter a confirmed service (for example supplier insolvency or withdrawal of inventory), we will notify you promptly and offer rebooking assistance or a refund of amounts recoverable from the supplier.",
      ],
    },
    {
      id: "car-hire",
      title: "9. Car-hire specific terms",
      paragraphs: [
        "Vehicles are hired with a driver by the hour within the stated base city. The total charged is the hourly rate multiplied by booked hours; waiting time you cause, route extensions, out-of-city trips, tolls, and parking may attract additional charges agreed with the driver or our desk. Cancellations close to the pickup time may incur a charge reflecting the driver's mobilisation. Smoking, overloading beyond stated passenger capacity, and unlawful use are prohibited.",
      ],
    },
    {
      id: "fees",
      title: "10. Fees and charges",
      paragraphs: [
        "Quoted totals at checkout are the amounts you authorise. Separately disclosed items — such as airline-imposed change or cancellation penalties, hotel amendment fees, visa consultation fees, and any bespoke package-planning fees — apply as stated at the time of booking. We do not add hidden checkout surcharges beyond the confirmed total. Bank, card-network, or foreign-exchange charges levied by your own provider are outside our control.",
      ],
    },
    {
      id: "acceptable-use",
      title: "11. Acceptable use",
      paragraphs: [
        "You must be at least 18 years old (or acting with a parent's or guardian's consent and authority) and legally capable of entering contracts to make a booking. You must not misuse the platform, attempt unauthorised access, submit false data, resell inventory without written agreement, or infringe the rights of others. We may suspend or terminate access, cancel pending transactions, or report unlawful conduct where necessary to protect the platform, suppliers, or travellers.",
      ],
    },
    {
      id: "intellectual-property",
      title: "12. Intellectual property",
      paragraphs: [
        "The website's text, design, logos, imagery, and software are owned by or licensed to Alphaa Africa and protected by Nigerian and international intellectual-property law. You receive a limited, non-exclusive, non-transferable licence to use the platform for personal travel planning and booking. You may not copy, reproduce, scrape, or redistribute our content without prior written permission, except where the law permits or sharing a booking confirmation for your own travel requires it.",
      ],
    },
    {
      id: "liability",
      title: "13. Limitation of liability",
      paragraphs: [
        "We exercise reasonable skill and care as your booking agent, but the travel services themselves are performed by independent suppliers. To the maximum extent permitted by law, we are not liable for supplier acts or omissions — including schedule changes, cancellations, denied boarding, refused visas or entry, hotel overbooking, baggage loss, or personal injury — nor for indirect, incidental, or consequential losses such as missed connections or lost business, except where caused by our own negligence or wilful misconduct. Nothing in these Terms limits liability that cannot lawfully be limited, including liability for fraud or for death or personal injury caused by negligence. Our aggregate liability for any booking is limited to the service margin we earned on that booking or the amount recoverable from the supplier, whichever is greater, unless the law requires otherwise.",
      ],
    },
    {
      id: "force-majeure",
      title: "14. Events beyond our control",
      paragraphs: [
        "Neither party is liable for failure to perform caused by events beyond reasonable control — including natural disasters, epidemics, war or civil unrest, terrorism, government restrictions or airspace closures, strikes, airport or system outages, and supplier insolvency. Where such events affect your trip, we will provide reasonable assistance (rebooking options, documentation for claims, and refund processing for recoverable amounts) but cannot guarantee outcomes controlled by suppliers or authorities. Comprehensive travel insurance is strongly recommended for every trip.",
      ],
    },
    {
      id: "complaints",
      title: "15. Support and complaints",
      paragraphs: [
        `If anything goes wrong, contact us immediately on WhatsApp at ${company.whatsapp.display}, by email at ${company.email}, or at our Abuja office (Monday to Saturday, 8:00 AM to 6:00 PM WAT), quoting your booking and payment references. For travel-day or payment-uncertainty issues, call the phone line for the fastest response. We aim to acknowledge complaints promptly and resolve them fairly, liaising with the supplier where the issue sits with them.`,
      ],
    },
    {
      id: "governing-law",
      title: "16. Governing law and dispute resolution",
      paragraphs: [
        "These Terms, and any dispute arising from them or from bookings made under them, are governed by the laws of the Federal Republic of Nigeria. The parties shall first seek amicable settlement through good-faith negotiation within 30 days of a written complaint. Failing settlement, the dispute shall be referred to mediation and, if still unresolved, to arbitration seated in Abuja, Nigeria under the Arbitration and Mediation Act 2023, with proceedings in English — without prejudice to either party's right to seek urgent interim relief from a court of competent jurisdiction.",
      ],
    },
    {
      id: "changes",
      title: "17. Changes to these Terms",
      paragraphs: [
        "We may update these Terms to reflect new services, legal requirements, or supplier practices. The version published on this page at the time of your booking governs that booking; subsequent changes do not retroactively alter confirmed bookings. Material changes will carry a new effective date, and continued use of the platform after that date constitutes acceptance. For the avoidance of doubt, supplier fare and rate rules applicable to an already-ticketed booking can only be changed by the supplier under its own conditions.",
      ],
    },
    {
      id: "general",
      title: "18. General provisions",
      paragraphs: [
        "If any provision of these Terms is held invalid or unenforceable, the remaining provisions continue in full force. Our failure to enforce a provision on one occasion is not a waiver of the right to enforce it later. You may not assign your rights under a booking without our written consent; we may assign ours in connection with a business reorganisation with notice to you. These Terms, the applicable supplier terms, and our Privacy Policy constitute the entire agreement for bookings made through the platform.",
      ],
    },
  ],
  seo: {
    title: "Terms & Conditions | Alphaa Africa",
    description:
      "The booking terms for Alphaa Africa flights, hotels, packages, visa consultations, and car rentals — supplier terms, pricing and Paystack payments, changes and refunds, responsibilities, liability, and Nigerian governing law.",
  },
}

export const legalDocuments: Record<LegalDocument["slug"], LegalDocument> = {
  privacy: privacyPolicy,
  terms: termsConditions,
}
