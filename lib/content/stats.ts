import type { ContentSource } from "./company.ts";

/**
 * Company statistics (Phase 2).
 * Per the ticket and PRD ("Do not invent statistics"), this stays empty
 * until Alphaa supplies verified numbers. Renderers must handle the
 * empty state — never render placeholder counts.
 */

export interface Stat {
  id: string;
  label: string;
  value: string;
  source: ContentSource;
}

export interface StatContent {
  source: ContentSource;
  updatedAt: string;
  stats: Stat[];
  seo: {
    title: string;
    description: string;
  };
}

export const stats: StatContent = {
  source: "draft",
  updatedAt: "2026-09-21",
  stats: [],
  seo: {
    title: "About Alphaa Africa — Trusted Travel Partner in Abuja",
    description:
      "Alphaa Africa combines self-service booking with human assistance. Verified company figures will appear here once supplied.",
  },
};
