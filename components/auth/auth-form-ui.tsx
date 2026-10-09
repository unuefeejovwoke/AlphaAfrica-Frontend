import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon, Tick01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

/**
 * The one status box every auth form uses for an outcome. `tone` picks the
 * accent; the box, the icon slot, and the recovery link are identical either
 * way, so success and failure are the same component rather than twins.
 */
function StatusBox({
  tone,
  role,
  message,
  action,
}: {
  tone: "error" | "success"
  role: "alert" | "status"
  message: React.ReactNode
  action?: { href: string; label: string }
}) {
  const error = tone === "error"
  return (
    <div
      role={role}
      {...(role === "status" ? { "aria-live": "polite" as const } : {})}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3.5 text-sm leading-relaxed text-foreground",
        error
          ? "border-destructive/25 bg-destructive/5"
          : "border-emerald-600/25 bg-emerald-600/5"
      )}
    >
      <HugeiconsIcon
        icon={error ? AlertCircleIcon : Tick01Icon}
        size={16}
        className={cn(
          "mt-0.5 shrink-0",
          error ? "text-destructive" : "text-emerald-600"
        )}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <span>{message}</span>
        {action ? (
          <Link
            href={action.href}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

/**
 * A failure. Assertive (`role="alert"`) — the user must hear it immediately.
 */
export function AuthAlert({
  message,
  action,
}: {
  message: string
  action?: { href: string; label: string }
}) {
  return <StatusBox tone="error" role="alert" message={message} action={action} />
}

export function AuthSuccess({
  heading,
  body,
  linkHref,
  linkLabel,
}: {
  heading: string
  body: string
  linkHref: string
  linkLabel: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-xs sm:p-8"
    >
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <HugeiconsIcon icon={Tick01Icon} size={24} aria-hidden="true" />
      </span>
      {/* `h1`: this terminal state REPLACES the form card, and on /forgot,
          /reset and /verify it is the document's only heading. */}
      <h1 className="text-xl font-extrabold text-foreground">{heading}</h1>
      <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <Link
        href={linkHref}
        className="font-semibold text-primary underline-offset-4 hover:underline"
      >
        {linkLabel}
      </Link>
    </div>
  )
}

/**
 * In-place confirmation for a save that leaves the form standing — profile
 * edits and password rotation. Polite, against `AuthAlert`'s assertive: a save
 * that succeeded should not interrupt.
 */
export function SavedNotice({ children }: { children: React.ReactNode }) {
  return <StatusBox tone="success" role="status" message={children} />
}
