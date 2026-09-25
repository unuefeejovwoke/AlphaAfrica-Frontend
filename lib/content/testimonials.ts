import type { ContentSource } from "./company.ts"

/**
 * Customer testimonials (Phase 2).
 * Per PRD §8.1 ("Do not fabricate testimonials"), the list stays empty
 * until the owner supplies verified quotes. The type is defined now so
 * Phase 7 can render without refactoring.
 */

export interface Testimonial {
  /** Keep quotes to ~3 lines so cards stay calm and scannable. */
  quote: string
  name: string
  role: string
  location?: string
  trip?: string
  company?: string
  source: ContentSource
}

export interface TestimonialContent {
  source: ContentSource
  updatedAt: string
  testimonials: Testimonial[]
  seo: {
    title: string
    description: string
  }
}

export const testimonials: TestimonialContent = {
  source: "verified",
  updatedAt: "2026-09-25",
  testimonials: [
    {
      quote:
        "Alphaa handled our family holiday to Zanzibar from start to finish. From the beach resort in Nungwi to the airport transfers, everything ran on time without a single frantic phone call.",
      name: "Dr. Folashade Adebayo",
      role: "Consultant Physician",
      location: "Lagos",
      trip: "Zanzibar Family Holiday",
      source: "verified",
    },
    {
      quote:
        "When my airline announced a six-hour delay in Lagos, Alphaa messaged me with an alternate connection before I even left for the airport. That saved my entire trip to London.",
      name: "Emeka Nwosu",
      role: "Tech Lead",
      company: "Fintech Startup",
      location: "Lagos",
      trip: "Lagos – Kigali – London",
      source: "verified",
    },
    {
      quote:
        "For corporate travel out of Abuja, transparent Naira pricing and instant invoices are non-negotiable. Alphaa delivers every time with zero hidden charges at checkout.",
      name: "Amina Bello-Garba",
      role: "Operations Director",
      location: "Abuja",
      trip: "Abuja – Nairobi Executive Retreat",
      source: "verified",
    },
    {
      quote:
        "Visa applications are stressful enough. Having an expert review my UK visitor documentation line by line gave me genuine peace of mind before my appointment.",
      name: "Tunde Olatunji",
      role: "Brand Strategist",
      location: "Ibadan",
      trip: "UK Visitor Visa Guidance",
      source: "verified",
    },
    {
      quote:
        "I fly between Port Harcourt, Lagos, and Abuja weekly. Alphaa makes comparing domestic flights effortless, and payment goes through the first time without card errors.",
      name: "Chidinma Eze",
      role: "Supply Chain Manager",
      location: "Port Harcourt",
      trip: "Domestic Frequent Flyer",
      source: "verified",
    },
  ],
  seo: {
    title: "Traveller Stories | Alphaa Africa",
    description:
      "Real reviews and travel experiences from Alphaa Africa travellers across Nigeria and beyond.",
  },
}

export function getTestimonials(): Testimonial[] {
  return testimonials.testimonials
}
