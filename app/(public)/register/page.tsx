import type { Metadata } from "next"
import Link from "next/link"
import { RegisterForm } from "@/components/auth/register-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Create your account | Alphaa Africa",
  description:
    "Create an Alphaa Africa account so your bookings belong to you. Guest booking keeps working with no account needed.",
  alternates: { canonical: canonicalUrl("/register") },
  robots: { index: false, follow: false },
}

/** `/register` (never indexed): account creation routes onward to `/verify`. */
export default function RegisterPage() {
  return (
    <AuthShell
      footer={
        <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
