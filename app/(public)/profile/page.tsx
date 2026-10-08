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
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10 sm:px-6 sm:py-14">
      <ProfileForm user={user} />
      <ChangePasswordForm />
    </div>
  )
}
