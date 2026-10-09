"use client"

import * as React from "react"
import { MotionConfig } from "motion/react"

/**
 * App-wide Motion defaults, mounted in `app/layout.tsx` so the whole tree
 * inherits them without any component opting in.
 *
 * `reducedMotion="user"` is the accessibility floor rather than a taste call:
 * it strips transform and layout animations for anyone with the OS
 * reduced-motion setting while preserving opacity and colour transitions, so
 * state changes still read without anything sliding across the screen.
 *
 * Animation components themselves stay server components wherever possible —
 * `motion/react-client` is the slim entry for App Router leaves.
 */
export function MotionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
