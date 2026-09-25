import type { ContentSource } from "./company.ts"

/**
 * Company statistics (Phase 2).
 * PRD rule: never invent statistics. Entries here must be figures the
 * business actually publishes — each one below is copied from the live
 * site (alphaaafrica.com) and carries `source: "verified"`.
 */

export interface Stat {
  id: string
  label: string
  value: string
  source: ContentSource
}

export interface StatContent {
  source: ContentSource
  updatedAt: string
  stats: Stat[]
  seo: {
    title: string
    description: string
  }
}

export const stats: StatContent = {
  source: "verified",
  updatedAt: "2026-09-25",
  stats: [
    {
      id: "travellers",
      label: "Travellers served",
      value: "1M+",
      source: "verified",
    },
    {
      id: "trustpilot",
      label: "Trustpilot rating",
      value: "4.9/5",
      source: "verified",
    },
    {
      id: "reviews",
      label: "Verified reviews",
      value: "5,210",
      source: "verified",
    },
  ],
  seo: {
    title: "About Alphaa Africa — Book Flights, Hotels & Get Travel Help",
    description:
      "Alphaa Africa combines self-service booking with human assistance. Figures shown here are the ones published on alphaaafrica.com.",
  },
}
