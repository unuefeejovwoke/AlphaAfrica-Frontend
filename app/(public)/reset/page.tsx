import type { Metadata } from "next"
import { ResetForm } from "@/components/auth/reset-form"
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10 sm:px-6 sm:py-14">
      <ResetForm initialEmail={typeof email === "string" ? email : ""} />
    </div>
  )
}
