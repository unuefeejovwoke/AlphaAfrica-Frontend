"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ChevronDownIcon,
  UserIcon,
  PackageIcon,
  Logout01Icon,
} from "@hugeicons/core-free-icons"
import { requestSignOut } from "@/lib/api/session-client"
import { cn } from "@/lib/utils"

/**
 * Signed-in account disclosure (ticket 03): profile, orders, sign-out.
 * Same disclosure contract as the Explore mega menu — the trigger owns
 * expanded/controls, Escape dismisses, outside pointer dismisses — so
 * keyboard parity holds without a second menu widget.
 */
export function AccountMenu({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean
  onNavigate?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [signingOut, setSigningOut] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return

    function handlePointerOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        // Focus returns to the trigger — dismissal without a pointer
        // lands back where the keyboard user started.
        triggerRef.current?.querySelector("button")?.focus()
      }
    }

    document.addEventListener("mousedown", handlePointerOutside)
    document.addEventListener("touchstart", handlePointerOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerOutside)
      document.removeEventListener("touchstart", handlePointerOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open ])

  const handleSignOut = () => {
    if (signingOut) return
    setSigningOut(true)
    void (async () => {
      await requestSignOut()
      setOpen(false)
      onNavigate?.()
      // Server owns the session — refresh nav reads before leaving.
      router.refresh()
      router.push("/")
    })()
  }

  if (mobile) {
    return (
      <div className="flex flex-col gap-1 border-t border-border/50 pt-3">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="flex touch-manipulation items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <HugeiconsIcon
            icon={UserIcon}
            size={15}
            className="text-muted-foreground"
            aria-hidden="true"
          />
          <span>Profile</span>
        </Link>
        <Link
          href="/orders"
          onClick={onNavigate}
          className="flex touch-manipulation items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <HugeiconsIcon
            icon={PackageIcon}
            size={15}
            className="text-muted-foreground"
            aria-hidden="true"
          />
          <span>Orders</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full touch-manipulation items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
        >
          <HugeiconsIcon
            icon={Logout01Icon}
            size={15}
            className="text-muted-foreground"
            aria-hidden="true"
          />
          <span>{signingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    )
  }

  return (
    <div ref={triggerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-expanded={open}
        aria-controls="account-menu"
      >
        <HugeiconsIcon icon={UserIcon} size={15} aria-hidden="true" />
        <span>Account</span>
        <HugeiconsIcon
          icon={ChevronDownIcon}
          size={14}
          className={cn(
            "transition-transform duration-200 ease-brand",
            open ? "rotate-180 text-primary" : "text-muted-foreground"
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id="account-menu"
          ref={panelRef}
          className="absolute top-full right-0 z-50 mt-2 w-52 rounded-2xl border border-border/80 bg-card p-1.5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)]"
        >
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <HugeiconsIcon
              icon={UserIcon}
              size={15}
              className="text-muted-foreground"
              aria-hidden="true"
            />
            <span>Profile</span>
          </Link>
          <Link
            href="/orders"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <HugeiconsIcon
              icon={PackageIcon}
              size={15}
              className="text-muted-foreground"
              aria-hidden="true"
            />
            <span>Orders</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
          >
            <HugeiconsIcon
              icon={Logout01Icon}
              size={15}
              className="text-muted-foreground"
              aria-hidden="true"
            />
            <span>{signingOut ? "Signing out…" : "Sign out"}</span>
          </button>
        </div>
      )}
    </div>
  )
}
