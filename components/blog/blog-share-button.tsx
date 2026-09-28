"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Share01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

/**
 * Share / copy-link action for a Post (client island).
 * Copies the current link; confirmation lives on the button itself
 * (tick + "Link copied") with a polite live region so screen readers
 * announce it — no separate toast, one feedback mechanism per action.
 */
export function BlogShareButton() {
  const [copied, setCopied] = React.useState(false)
  const resetRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (resetRef.current) clearTimeout(resetRef.current)
    }
  }, [])

  const share = React.useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    if (!url) return
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
      if (resetRef.current) clearTimeout(resetRef.current)
      resetRef.current = setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard unavailable — button stays in Share state, no dead end.
    }
  }, [])

  return (
    <Button variant="outline" size="sm" type="button" onClick={share} className="touch-manipulation">
      <HugeiconsIcon icon={copied ? Tick01Icon : Share01Icon} size={15} aria-hidden="true" />
      <span aria-live="polite">{copied ? "Link copied" : "Share post"}</span>
    </Button>
  )
}
