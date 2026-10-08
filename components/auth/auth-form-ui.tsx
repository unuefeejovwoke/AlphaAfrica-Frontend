import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon, Tick01Icon } from "@hugeicons/core-free-icons"

/**
 * Shared auth form visuals (tickets 02 + 05): one form-level alert voice and
 * one terminal-success panel, so register, verify, forgot, and reset read
 * as one flow. Field errors render inline beside inputs via `Input`/`error`.
 */
export function AuthAlert({
  message,
  action,
}: {
  message: string
  action?: { href: string; label: string }
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 p-3.5 text-xs leading-relaxed text-foreground"
    >
      <HugeiconsIcon
        icon={AlertCircleIcon}
        size={16}
        className="mt-0.5 shrink-0 text-destructive"
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
      <h2 className="text-xl font-extrabold text-foreground">{heading}</h2>
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
