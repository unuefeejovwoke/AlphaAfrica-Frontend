import type { ContentSource } from "./company.ts"

/**
 * Grouped FAQs per PRD §8.12.
 *
 * Entries are `source: "draft"` until the owner signs off — no unverified
 * claim is presented as fact. The `flights` group also carries the ten
 * questions published on alphaaafrica.com, copied verbatim and marked
 * `source: "verified"` because they are already live.
 */

export type FaqGroupId =
  | "flights"
  | "hotels"
  | "packages"
  | "visa"
  | "cars"
  | "payments"
  | "changes"
  | "cancellation"
  | "account"
  | "general"

export interface Faq {
  id: string
  question: string
  answer: string
  source: ContentSource
}

export interface FaqGroup {
  id: FaqGroupId
  title: string
  description: string
  faqs: Faq[]
}

export interface FaqContent {
  source: ContentSource
  updatedAt: string
  groups: FaqGroup[]
  seo: {
    title: string
    description: string
  }
}

function draft(id: string, question: string, answer: string): Faq {
  return { id, question, answer, source: "draft" }
}

/** Copied verbatim from a published FAQ page — never edited or invented. */
function verified(id: string, question: string, answer: string): Faq {
  return { id, question, answer, source: "verified" }
}

export const faqs: FaqContent = {
  // Mixed: the `flights` group holds published entries, the rest are draft.
  source: "draft",
  updatedAt: "2026-09-25",
  groups: [
    {
      id: "flights",
      title: "Flights",
      description: "Searching, fares, and what happens after you pay.",
      faqs: [
        draft(
          "flights-search-how",
          "How do I search for flights?",
          "Choose your trip type, enter origin and destination airports, pick dates and travellers, then compare options. Domestic Nigerian searches can take up to a minute because airlines are checked live — results appear as they arrive."
        ),
        draft(
          "flights-price-change",
          "Why did my flight price change before booking?",
          "Airlines update fares frequently. We re-check the fare with the airline before payment. If it changed, we show the old price, the new price, and the difference so you can continue or cancel."
        ),
        draft(
          "flights-pnr",
          "When do I get my ticket or PNR?",
          "For international flights your airline booking reference (PNR) is issued when you book, before you pay — we hold your seat with the airline. Your e-ticket is issued once payment clears. Both the PNR and your booking reference appear on your confirmation screen and receipt; keep them for check-in."
        ),
        // The ten questions below are published verbatim on alphaaafrica.com.
        verified(
          "flights-cheap-flight",
          "How can I book a cheap flight in Nigeria?",
          "You can book a cheap flight in Nigeria by searching for flights online and comparing prices from different airlines using travel websites like Alphaa.Africa Travels & Tours to compare prices and find the best deals. Once you’ve found the cheapest flight, book it online. Double-check all of the information before confirming your booking. Pay for the flight using a credit card or other secure payment method. As soon as your payment clears, you’ll get a confirmation email containing your flight details. Keep this email in a safe place. Print out your ticket or boarding pass and bring it with you to the airport."
        ),
        verified(
          "flights-best-site",
          "Which site is best for flight booking?",
          "The best site for domestic and international flight booking depends on your needs, budget, and preferences. The most popular flight booking site to use is without a doubt, Alphaa.Africa Travels & Tours. We are available 24/7 to provide travellers with convenient access to local and international flights, competitive fares, hotel reservations, tour packages, airport transfers and visa assistance, making us a one-stop travel solution for your journey."
        ),
        verified(
          "flights-nin",
          "Can I use my NIN to book a flight?",
          "Yes, you can use your NIN to book a domestic flight. However, some airlines may require additional identification documents like your international passport especially for international trips to verify your identity. Check with the airline you are traveling with for more information."
        ),
        verified(
          "flights-cheapest-day",
          "What is the cheapest day to buy plane tickets?",
          `There isn't a specific "cheapest day" to buy plane tickets. The best way to get the most affordable prices is to book well in advance especially during the week and regularly check the Alphaa.Africa Travels & Tours site for deals.`
        ),
        verified(
          "flights-usa-price",
          "How much is a ticket from Nigeria to the USA?",
          "The cost of a ticket from Nigeria to the USA depends on various factors, including the type of ticket, time of year, airline, and trip length. Therefore, there is no single answer to this question."
        ),
        verified(
          "flights-cheapest-deals",
          "Where and how can I get the cheapest flights?",
          "Alphaa.Africa Travels & Tours is the best place to find the cheapest flights. Visit our platform or speak with our seasoned travel agents who are always ready to help you find the best available flight deals based on your destination, budget and travel dates."
        ),
        verified(
          "flights-local-airline",
          "Which local flight is best in Nigeria?",
          "The best local flight in Nigeria depends on your destination, travel dates, preferred airline, budget and other travel preferences. Alphaa.Africa Travels & Tours gives you access to available domestic flight options and helps you choose the most suitable flight for your journey. You can book a flight with Alphaa.Africa Travels & Tours to access some of the best deals in the country."
        ),
        verified(
          "flights-no-passport",
          "Can I book a flight within Nigeria without a passport?",
          "Yes, you can book a flight within Nigeria without a passport, provided you have other valid forms of identification such as a driver's license, National ID card, or Voter's card. Booking without any valid identification is not possible."
        ),
        verified(
          "flights-lagos-abuja-price",
          "How much is a flight from Lagos to Abuja?",
          "The cost of a ticket from Lagos to Abuja depends on the type of ticket, time of year, airline, and other factors. Typically, the price ranges from N80,000 to N150,000 for a one-way flight. For the latest available fares, check Alphaa.Africa Travels & Tours for current flight options."
        ),
        verified(
          "flights-abuja-passport",
          "Can I travel to Abuja without a passport?",
          "Yes, you can travel to Abuja without a passport as long as you provide other valid forms of identification such as a driver's license, National ID card, or Voter's card. Booking without any valid identification is not possible."
        ),
      ],
    },
    {
      id: "hotels",
      title: "Hotels",
      description: "Finding stays and completing a hotel booking.",
      faqs: [
        draft(
          "hotels-search-how",
          "How do I find a hotel?",
          "Search by city or hotel name, then filter by star rating and price. Each card shows the starting nightly rate so you can compare quickly. You choose your dates and party on the hotel page when you are ready to book."
        ),
        draft(
          "hotels-guest-booking",
          "Can I book a hotel without creating an account?",
          "Yes. Hotel bookings support guest checkout — you only provide guest name, email, and phone plus your stay details. No account is required."
        ),
      ],
    },
    {
      id: "packages",
      title: "Holiday packages",
      description: "Curated itineraries and the enquiry process.",
      faqs: [
        draft(
          "packages-what",
          "What is a holiday package?",
          "A curated itinerary for one destination with duration, from-price per person, inclusions, and highlights. Packages are enquiry-first: you send details and a travel specialist plans with you."
        ),
        draft(
          "packages-enquiry-payment",
          "Do I pay when I submit a package enquiry?",
          "No. An enquiry is a no-payment request. The travel team follows up with options and pricing, and you only pay once you agree a plan."
        ),
      ],
    },
    {
      id: "visa",
      title: "Visa assistance",
      description: "Consultations, fees, and processing times.",
      faqs: [
        draft(
          "visa-what",
          "What is a visa consultation?",
          "A paid, country-specific guidance session: document review, process walkthrough, and interview preparation with a travel specialist. It is guidance — the embassy makes the final decision."
        ),
        draft(
          "visa-fee",
          "What does the consultation fee cover?",
          "The fee shown per country covers the consultation itself and follow-up guidance. Embassy or application fees charged by authorities are separate where they apply."
        ),
        draft(
          "visa-time",
          "How long does visa processing take?",
          "Each country page shows an indicative processing time (for example, 3 to 4 weeks). Timelines vary by season and applicant history — your specialist confirms expectations during consultation."
        ),
      ],
    },
    {
      id: "cars",
      title: "Car rentals",
      description: "Vehicles, hourly rates, and booking.",
      faqs: [
        draft(
          "cars-rate",
          "How is the car rental price calculated?",
          "Vehicles are priced per hour. Your total is the hourly rate multiplied by the number of hours booked, shown clearly before payment."
        ),
        draft(
          "cars-booking-details",
          "What details do I provide for a car booking?",
          "Pickup and drop-off locations, pickup date and time, number of hours, plus guest name, email, and phone. Guest checkout is supported."
        ),
      ],
    },
    {
      id: "payments",
      title: "Payments",
      description: "How payment works and staying safe.",
      faqs: [
        draft(
          "payments-how",
          "How do I pay for a booking?",
          "After you confirm details, we create a pending booking and redirect you to Paystack to pay securely. We never collect or store your card details on this site."
        ),
        draft(
          "payments-confirm",
          "How do I know my payment succeeded?",
          "After payment you return to a confirmation page that verifies your reference with the provider. Never assume success from the redirect alone — wait for the verified confirmation state."
        ),
      ],
    },
    {
      id: "changes",
      title: "Booking changes",
      description: "Adjusting dates, names, and trip details.",
      faqs: [
        draft(
          "changes-request",
          "Can I change my booking after payment?",
          "Change options depend on the airline, hotel, or vehicle policy for your specific booking. Contact us with your reference and we will explain what is possible before any charges apply."
        ),
        draft(
          "changes-name",
          "Can I correct a traveller name?",
          "Small spelling corrections are often possible, but full name changes usually are not. Share your reference on WhatsApp and we will advise quickly."
        ),
      ],
    },
    {
      id: "cancellation",
      title: "Cancellation & refunds",
      description: "What happens if plans change.",
      faqs: [
        draft(
          "cancellation-policy",
          "Can I cancel and get a refund?",
          "Cancellation and refund terms follow the specific airline, hotel, or provider policy attached to your booking. We explain the applicable terms before you pay and help process eligible requests."
        ),
        draft(
          "cancellation-payment-deducted",
          "My payment was deducted but the booking failed. What next?",
          "Keep your payment reference and contact us immediately. Our team can locate and reconcile the transaction and advise on rebooking or refund."
        ),
      ],
    },
    {
      id: "account",
      title: "Account",
      description: "Registration, login, and booking history.",
      faqs: [
        draft(
          "account-needed",
          "Do I need an account to book?",
          "No. Browsing, flight, hotel, and car bookings support guest checkout. Creating an account is optional and useful for keeping booking history in one place."
        ),
        draft(
          "account-history",
          "How do I view past bookings as a guest?",
          "Use the secure link or token from your confirmation email. Logged-in customers see their orders automatically in booking history."
        ),
      ],
    },
    {
      id: "general",
      title: "General travel",
      description: "Getting help and travelling with confidence.",
      faqs: [
        draft(
          "general-first-trip",
          "Planning your first international trip?",
          "Start with your destination and dates, then speak with us. We help you understand flights, documents, and what to expect at each step so nothing expensive is left to guesswork."
        ),
        draft(
          "general-support",
          "How do I get human help?",
          "Use the Need Help widget, WhatsApp, phone, or email. Real specialists respond during desk hours, Monday to Saturday."
        ),
      ],
    },
  ],
  seo: {
    title:
      "Travel FAQs — Flights, Hotels, Packages, Visa & Payments | Alphaa Africa",
    description:
      "Clear answers on flights, hotels, holiday packages, visa consultations, car rentals, payments, changes, cancellations, and accounts.",
  },
}

export function getFaqGroup(id: FaqGroupId): FaqGroup | undefined {
  return faqs.groups.find((group) => group.id === id)
}

export function getAllFaqs(): Faq[] {
  return faqs.groups.flatMap((group) => group.faqs)
}

export interface HomepageFaqItem extends Faq {
  category: string
}

export const HOMEPAGE_FAQ_SELECTION = [
  { groupId: "flights", faqId: "flights-pnr" },
  { groupId: "hotels", faqId: "hotels-guest-booking" },
  { groupId: "packages", faqId: "packages-enquiry-payment" },
  { groupId: "visa", faqId: "visa-what" },
  { groupId: "payments", faqId: "payments-how" },
] as const

export function getHomepageFaqs(): HomepageFaqItem[] {
  return HOMEPAGE_FAQ_SELECTION.map(({ groupId, faqId }) => {
    const group = faqs.groups.find((g) => g.id === groupId)
    const faq = group?.faqs.find((f) => f.id === faqId)
    if (!faq || !group) {
      throw new Error(
        `FAQ ${faqId} in group ${groupId} not found in lib/content/faqs.ts`
      )
    }
    return {
      ...faq,
      category: group.title,
    }
  })
}
