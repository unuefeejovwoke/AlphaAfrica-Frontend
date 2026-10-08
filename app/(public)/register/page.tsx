import type { Metadata } from "next"
import Link from "next/link"
import { RegisterForm } from "@/components/auth/register-form"
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10 sm:px-6 sm:py-14">
      <RegisterForm />
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
