import type { Metadata } from "next"
import { ResetForm } from "@/components/auth/reset-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Set a new password | Alphaa Africa",
  description:
    "Enter your reset code and choose a new password for your Alphaa Africa account.",
  alternates: { canonical: canonicalUrl("/reset") },
  robots: { index: false, follow: false },
}

/** `/reset` (never indexed): code plus new password restores access. */
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  return (
    <AuthShell>
      <ResetForm initialEmail={typeof email === "string" ? email : ""} />
    </AuthShell>
  )
}
