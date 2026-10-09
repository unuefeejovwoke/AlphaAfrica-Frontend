"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Share01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { formatNaira } from "@/lib/format"

export function PackageShareButton({
  title,
  destinationName,
}: {
  title?: string
  destinationName?: string
} = {}) {
  const [copied, setCopied] = React.useState(false)

  const handleCopyLink = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = url
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopied(true)
      toast.success("Link copied to clipboard", {
        description: "Package link has been copied to your clipboard.",
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("Could not copy link")
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopyLink}
      aria-label="Share package"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-primary/40 hover:text-primary active:scale-[0.98]"
    >
      <HugeiconsIcon
        icon={copied ? Tick01Icon : Share01Icon}
        size={14}
        className={copied ? "text-emerald-600" : "text-muted-foreground"}
        aria-hidden="true"
      />
      <span>{copied ? "Copied" : "Share"}</span>
    </button>
  )
}

export function PackageMobileBar({
  price,
  title,
}: {
  price: string
  title: string
}) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 350) {
        setVisible(true)
      } else {
        setVisible(false)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToEnquiry = () => {
    const element =
      document.getElementById("book-now") || document.getElementById("enquiry")
    if (element) {
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" })
    }
  }

  if (!visible) return null

  return (
    <aside
      aria-label="Quick booking bar"
      className="fixed inset-x-0 bottom-0 z-40 animate-in border-t border-border/80 bg-background/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md duration-200 slide-in-from-bottom lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            From
          </span>
          <div className="flex items-baseline gap-1">
            <span className="truncate text-base font-bold text-foreground">
              {formatNaira(price)}
            </span>
            <span className="text-[11px] text-muted-foreground">/ person</span>
          </div>
        </div>

        <Button
          onClick={scrollToEnquiry}
          size="sm"
          className="shrink-0 shadow-md"
        >
          Book Now
        </Button>
      </div>
    </aside>
  )
}

export function BookNowButton({
  targetId = "book-now",
  className,
  children,
}: {
  targetId?: string
  className?: string
  children?: React.ReactNode
}) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const element =
      document.getElementById(targetId) || document.getElementById("enquiry")
    if (element) {
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" })
    }
  }

  return (
    <Button onClick={handleClick} className={className} size="lg">
      {children || <span>Book Now</span>}
    </Button>
  )
}
