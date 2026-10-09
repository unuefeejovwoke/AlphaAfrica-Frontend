import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { ProfileForm } from "@/components/auth/profile-form"
import { normalizeAuthUser } from "@/lib/api/auth"
import { readSessionUser } from "@/lib/api/session"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Your profile | Alphaa Africa",
  description:
    "View and update your Alphaa Africa profile and change your password.",
  alternates: { canonical: canonicalUrl("/profile") },
  robots: { index: false, follow: false },
}

/**
 * `/profile` (never indexed): signed-out visits bounce to login with the
 * return target preserved. The session read sits above any cached function
 * — this page caches nothing.
 */
export default async function ProfilePage() {
  const session = await readSessionUser()
  if (session.status !== "signed-in") {
    redirect("/login?next=%2Fprofile")
  }
  const user = normalizeAuthUser(session.user)
  if (!user) {
    redirect("/login?next=%2Fprofile")
  }
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Your account
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {user.email}
          </p>
        </header>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <ProfileForm user={user} />
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  )
}
