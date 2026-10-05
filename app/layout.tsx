import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { AnalyticsLoader } from "@/components/analytics/analytics-loader"
import { ThemeProvider } from "@/components/shared/theme-provider"
import { MotionProvider } from "@/components/shared/motion-provider"
import { company } from "@/lib/content/company"
import { getSeoConfig, getSiteUrl } from "@/lib/seo"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// Matches --background in globals.css (light + warm dark), so browser
// chrome and the page are one continuous surface.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#161215" },
  ],
}

/**
 * Site-wide head defaults. Async only for the Google verification token
 * (`seo/config`, ISR-cached with a last-known fallback) — every other field
 * is static, and per-page `generateMetadata` still wins for title/description.
 */
export async function generateMetadata(): Promise<Metadata> {
  const config = await getSeoConfig()
  return {
    metadataBase: new URL(getSiteUrl()),
    // No `template`: every route ships an absolute `<title>` that already ends
    // with the brand (see the title constants in `lib/seo.ts` and
    // `lib/content/*`), so a template would render "… | Alphaa Africa |
    // Alphaa Africa". `tests/seo-titles.test.ts` guards the convention.
    title: config.defaultTitle,
    description: config.defaultDescription,
    verification: { google: config.googleVerification },
    robots: { index: true, follow: true },
    openGraph: {
      siteName: company.brandName,
      locale: "en_NG",
      type: "website",
    },
    twitter: { card: "summary_large_image" },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/site.webmanifest",
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <link rel="preconnect" href="https://wa.me" />
        <ThemeProvider>
          <MotionProvider>
            {children}
            <Toaster position="top-right" />
          </MotionProvider>
        </ThemeProvider>
        <AnalyticsLoader />
      </body>
    </html>
  )
}
