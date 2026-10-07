"use client"

import * as React from "react"
import { motion, type HTMLMotionProps } from "motion/react"
import { MOTION_SPRINGS } from "@/lib/motion/springs"
import { cn } from "@/lib/utils"

export interface ActiveIndicatorProps extends HTMLMotionProps<"span"> {
  layoutId: string
  as?: "span" | "div"
}

/**
 * Sliding pill background indicator for active tabs, segmented switchers,
 * and filter pills using Motion's layoutId engine.
 *
 * Inherits reducedMotion="user" from MotionProvider so layout translations
 * collapse smoothly to immediate state switches under prefers-reduced-motion.
 */
export function ActiveIndicator({
  layoutId,
  as = "span",
  className,
  transition = MOTION_SPRINGS.layout,
  ...props
}: ActiveIndicatorProps) {
  // Resolve the tag once so the element tree isn't duplicated per branch.
  const Component = (
    as === "div" ? motion.div : motion.span
  ) as typeof motion.span

  return (
    <Component
      layoutId={layoutId}
      transition={transition}
      aria-hidden="true"
      className={cn(
        "absolute inset-0 rounded-xl bg-card shadow-xs ring-1 ring-border/80",
        className
      )}
      {...props}
    />
  )
}
