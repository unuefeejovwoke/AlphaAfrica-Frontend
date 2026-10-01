import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { AnalyticsLoader } from "@/components/analytics/analytics-loader"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// Matches --background in globals.css, so browser chrome and the page are
// one continuous surface.
export const viewport: Viewport = {
  themeColor: "#faf9f7",
}

export const metadata: Metadata = {
  title: "Alphaa Africa | Travel & Assisted Service",
  description:
    "Abuja's premium assisted-service travel platform. Seamless bookings for flights, hotels, holiday packages, car rentals, and visa assistance with dedicated human support.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <link rel="preconnect" href="https://wa.me" />
        {children}
        <Toaster position="top-right" />
        <AnalyticsLoader />
      </body>
    </html>
  )
}
