import type { Metadata } from "next"
import Link from "next/link"
import { ForgotForm } from "@/components/auth/forgot-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Reset your password | Alphaa Africa",
  description:
    "Request a password reset code to recover access to your Alphaa Africa account.",
  alternates: { canonical: canonicalUrl("/forgot") },
  robots: { index: false, follow: false },
}

/** `/forgot` (never indexed): reset-code request, always success copy. */
export default function ForgotPage() {
  return (
    <AuthShell
      footer={
        <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
          Remembered it after all?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <ForgotForm />
    </AuthShell>
  )
}
