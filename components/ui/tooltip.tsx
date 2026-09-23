"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "@/lib/utils"

export interface TooltipProps {
  label: string
  content: string
  children?: React.ReactNode
  className?: string
}

export function Tooltip({ label, content, children, className }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger
        aria-label={label}
        className="inline-flex touch-manipulation items-center rounded-lg px-2 py-1 text-sm font-medium text-foreground underline decoration-dotted underline-offset-4 transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {children ?? label}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner
          sideOffset={6}
          className="z-50 outline-none"
        >
          <TooltipPrimitive.Popup
            className={cn(
              "max-w-60 rounded-lg border border-border bg-foreground px-2.5 py-1.5 text-xs break-words text-background shadow-md",
              className
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
