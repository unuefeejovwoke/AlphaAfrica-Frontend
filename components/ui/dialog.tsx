"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export interface DialogProps {
  title: string
  description?: string
  triggerLabel: string
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function Dialog({
  title,
  description,
  triggerLabel,
  children,
  open,
  onOpenChange,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger className="inline-flex touch-manipulation items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
        {triggerLabel}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-foreground/40" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overscroll-contain rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl",
            className
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-bold text-balance text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-sm break-words text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Close dialog"
              className="touch-manipulation rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-4 min-w-0">{children}</div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
