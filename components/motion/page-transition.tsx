"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { MOTION_DURATIONS, MOTION_EASINGS } from "@/lib/motion/tokens"

/**
 * Lightweight route cross-dissolve mounted in `SiteShell` around
 * `<main id="main-content">`.
 *
 * Opacity only over `MOTION_DURATIONS.quick` (200ms) — never vertical (`y`)
 * translation, so Next.js App Router navigation never scroll-jumps.
 * `MotionProvider` collapses the fade for reduced-motion visitors.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: MOTION_DURATIONS.quick,
          ease: MOTION_EASINGS.easeOut,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
