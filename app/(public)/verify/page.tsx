import type { Metadata } from "next"
import { VerifyForm } from "@/components/auth/verify-form"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Verify your email | Alphaa Africa",
  description:
    "Enter the 6-digit code from your verification email to activate your Alphaa Africa account.",
  alternates: { canonical: canonicalUrl("/verify") },
  robots: { index: false, follow: false },
}

/**
 * `/verify` (never indexed): OTP entry plus resend. The backend magic link
 * completes without frontend work and converges on the same verified state;
 * repeat opens of either channel are harmless.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10 sm:px-6 sm:py-14">
      <VerifyForm initialEmail={typeof email === "string" ? email : ""} />
    </div>
  )
}
