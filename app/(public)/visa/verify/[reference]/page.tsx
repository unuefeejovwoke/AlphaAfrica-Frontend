import type { Metadata } from "next"
import { VisaVerifyClient } from "@/components/visa/visa-verify-client"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const dynamic = "force-dynamic"

type VerifyParams = { reference: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<VerifyParams>
}): Promise<Metadata> {
  const { reference } = await params
  // Verification outcomes are private and per-reference: never indexed.
  return {
    metadataBase: new URL(getSiteUrl()),
    title: "Confirming your visa payment | Alphaa Africa",
    description:
      "We're confirming your visa consultation payment. Do not close this page yet.",
    alternates: { canonical: canonicalUrl(`/visa/verify/${reference}`) },
    robots: { index: false, follow: false },
  }
}

/**
 * `/visa/verify/[reference]` (dynamic, never cached): the Paystack return
 * target. Renders nothing conclusive on the server — the client verifies
 * the reference and fetches the final order before showing confirmation
 * or the payment-safety recovery panel (PRD §13, §20).
 */
export default async function VisaVerifyPage({
  params,
}: {
  params: Promise<VerifyParams>
}) {
  const { reference } = await params
  return <VisaVerifyClient reference={reference} />
}
