import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { readSessionUser } from "@/lib/api/session"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Sign in | Alphaa Africa",
  description:
    "Sign in to your Alphaa Africa account to reach your bookings and profile. Guest booking keeps working with no account needed.",
  alternates: { canonical: canonicalUrl("/login") },
  robots: { index: false, follow: false },
}

/**
 * `/login` (never indexed): the bounce validates through the full session
 * read — one silent refresh included — so an expired-access holder is
 * refreshed, not bounced. Only same-origin paths survive as targets.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : ""
  const session = await readSessionUser()
  if (session.status === "signed-in") {
    redirect(safeNext || "/")
  }
  return (
    <AuthShell
      footer={
        <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
          New here?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <LoginForm next={safeNext} />
    </AuthShell>
  )
}
