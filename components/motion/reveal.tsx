"use client"

import * as React from "react"
import { motion } from "motion/react"
import { MOTION_DURATIONS, MOTION_EASINGS } from "@/lib/motion/tokens"

export interface RevealProps {
  children: React.ReactNode
  className?: string
  /** Seconds to wait before playing — keep 0 except for hero-adjacent choreography. */
  delay?: number
  id?: string
}

/**
 * Time-based scroll entrance: fades up once when the element enters the
 * viewport. Unlike the CSS `.reveal` system (scroll-linked via
 * `animation-timeline: view()`, progress = scrollbar position), this plays a
 * real 520ms fade so scrolling feels like motion, and it works in Firefox
 * where the view timeline is still gated. Inherits reduced-motion handling
 * from `MotionProvider` — no per-component override.
 */
export function Reveal({ children, className, delay = 0, id }: RevealProps) {
  return (
    <motion.div
      id={id}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: MOTION_DURATIONS.deliberate,
        ease: MOTION_EASINGS.brand,
        delay,
      }}
    >
      {children}
    </motion.div>
  )
}
