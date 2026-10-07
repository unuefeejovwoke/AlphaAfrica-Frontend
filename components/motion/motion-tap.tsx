"use client"

import * as React from "react"
import { motion, type HTMLMotionProps } from "motion/react"
import { MOTION_SPRINGS } from "@/lib/motion/springs"
import { cn } from "@/lib/utils"

export interface MotionTapProps extends HTMLMotionProps<"div"> {
  as?: "div" | "span"
}

/**
 * Lightweight tactile interaction wrapper.
 * Provides micro-spring tap feedback (scale: 0.97) and subtle hover scaling.
 * Inherits the MotionProvider's user reduced-motion mode to collapse
 * transforms for visitors requesting reduced motion.
 */
export function MotionTap({
  as = "div",
  whileTap = { scale: 0.97 },
  whileHover = { scale: 1.01 },
  transition = MOTION_SPRINGS.tactile,
  className,
  children,
  ...props
}: MotionTapProps) {
  // Resolve the tag once so the element tree isn't duplicated per branch.
  const Component = (
    as === "span" ? motion.span : motion.div
  ) as typeof motion.div

  return (
    <Component
      whileTap={whileTap}
      whileHover={whileHover}
      transition={transition}
      className={cn("inline-flex", className)}
      {...props}
    >
      {children}
    </Component>
  )
}
