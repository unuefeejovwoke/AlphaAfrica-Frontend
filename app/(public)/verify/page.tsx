import type { Metadata } from "next"
import { VerifyForm } from "@/components/auth/verify-form"
import { AuthShell } from "@/components/auth/auth-shell"
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
    <AuthShell>
      <VerifyForm initialEmail={typeof email === "string" ? email : ""} />
    </AuthShell>
  )
}
