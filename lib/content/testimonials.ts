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
  source: "draft",
  updatedAt: "2026-09-21",
  testimonials: [],
  seo: {
    title: "Traveller Stories | Alphaa Africa",
    description:
      "Verified reviews from Alphaa Africa customers will appear here once supplied by the business.",
  },
}
