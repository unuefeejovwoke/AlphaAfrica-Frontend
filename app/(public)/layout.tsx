import * as React from "react"
import { PublicNav } from "@/components/navigation/public-nav"
import { PublicFooter } from "@/components/navigation/public-footer"
import { AssistedSupportWidget } from "@/components/support/assisted-support-widget"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <AssistedSupportWidget />
      <PublicFooter />
    </div>
  )
}
