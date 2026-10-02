import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  InformationCircleIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export type AlertTone = "info" | "success" | "warning"

const toneStyles: Record<AlertTone, string> = {
  info: "border-border bg-muted/40 text-foreground",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-100",
  warning: "border-destructive/30 bg-destructive/5 text-foreground",
}

const toneIcons = {
  info: InformationCircleIcon,
  success: Tick01Icon,
  warning: AlertCircleIcon,
} as const

export interface AlertProps {
  tone?: AlertTone
  title: string
  description?: string
  className?: string
}

export function Alert({
  tone = "info",
  title,
  description,
  className,
}: AlertProps) {
  const Icon = toneIcons[tone]
  return (
    <div
      role="alert"
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-xl border p-4 text-sm",
        toneStyles[tone],
        className
      )}
    >
      <HugeiconsIcon
        icon={Icon}
        size={18}
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold break-words">{title}</p>
        {description && (
          <p className="mt-1 text-xs leading-relaxed break-words opacity-90">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
