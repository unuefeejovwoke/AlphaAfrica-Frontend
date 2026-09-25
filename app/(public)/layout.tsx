import * as React from "react"
import { SiteShell } from "@/components/navigation/site-shell"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SiteShell>{children}</SiteShell>
}
