import type { Metadata } from "next"
import Link from "next/link"
import { ForgotForm } from "@/components/auth/forgot-form"
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10 sm:px-6 sm:py-14">
      <ForgotForm />
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Remembered it after all?{" "}
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
