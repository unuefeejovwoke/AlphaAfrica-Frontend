import type { Metadata } from "next"

/**
 * `/foundation` is an internal Phase 1 design-system showcase ("verify every
 * primitive in one view"), not a public page. The page itself is a client
 * component and cannot export metadata, so this sibling server layout carries
 * it — otherwise the route inherits the homepage's title and description and
 * competes with it as duplicate content.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function FoundationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
