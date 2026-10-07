import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Official Flight E-Ticket & Confirmation | Alphaa Africa",
  description:
    "Your official electronic flight ticket and travel confirmation document issued by Alphaa Africa.",
  alternates: { canonical: canonicalUrl("/order") },
  robots: { index: false, follow: false },
}

/**
 * Retired confirmation surface (ADR-0007). The live Paystack return target is
 * the order page, which already routes flight Bookings to the shared flight
 * confirmation component — so this route redirects there instead of being
 * deleted, and saved links keep working. `reference` and `token` carry over;
 * nothing else is read.
 */
export default async function FlightVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v
  const query = new URLSearchParams()
  const reference = first(params.reference)?.trim()
  const token = first(params.token)?.trim()
  if (reference) query.set("reference", reference)
  if (token) query.set("token", token)
  const suffix = query.toString()
  redirect(suffix ? `/order?${suffix}` : "/order")
}
