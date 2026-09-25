import type { ContentSource } from "./company.ts"

/**
 * Customer testimonials (Phase 2).
 * Quotes are reproduced verbatim from the reviews published on
 * alphaaafrica.com — never paraphrased and never invented. The `role` field
 * carries each review's headline, which is how the live site labels it.
 */

export interface Testimonial {
  /** Published review copy, kept exactly as the customer wrote it. */
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
        "From booking our flights to arranging our hotel and airport pickup, Alphaa Africa handled everything perfectly. Their team kept us informed every step of the way, making our trip completely stress-free. I highly recommend them to anyone looking for dependable travel services.",
      name: "Kyrian Obaigbena",
      role: "A Truly Stress-Free Travel Experience",
      location: "Abuja",
      source: "verified",
    },
    {
      quote:
        "I've used several travel agencies over the years, but Alphaa Africa stands out for their professionalism and prompt service. They found us the best flight options within our budget and assisted with every detail of our travel plans.",
      name: "Mary Ifeoluwa",
      role: "Professional and Reliable",
      location: "Lagos",
      source: "verified",
    },
    {
      quote:
        "What impressed me most was their responsiveness. Whenever I had a question about my visa application or travel itinerary, their team was available to help. Their customer service is exceptional.",
      name: "Esther Mouka",
      role: "Exceptional Customer Support",
      location: "Port Harcourt",
      source: "verified",
    },
    {
      quote:
        "Managing business travel for our executives used to be stressful until we partnered with Alphaa Africa. Their efficiency, attention to detail, and timely communication have made them our trusted travel management partner.",
      name: "Corporate Client",
      role: "Our Corporate Travel Partner",
      trip: "Enterprise Partner",
      source: "verified",
    },
    {
      quote:
        "Our family vacation was planned flawlessly. From hotel reservations to airport transfers, everything went exactly as promised. Thank you, Alphaa Africa, for making our holiday memorable.",
      name: "Mr Michael Okpale & Family",
      role: "Highly Recommended",
      trip: "Verified Family Traveler",
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
