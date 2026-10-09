"use client"

import { motion, useReducedMotion, useScroll } from "motion/react"

/**
 * Reading-progress hairline pinned to the top of the viewport on an article
 * page — the reader's sense of how much of the post is left.
 *
 * `scaleX` on a left-anchored 2px bar: one compositor-only transform, no
 * layout, no repaint of the article text. The raw scroll value is bound
 * directly with no spring, so the bar tracks the finger 1:1.
 *
 * The bar is decorative duplication of reading progress (aria-hidden), so
 * under `prefers-reduced-motion` it renders nothing at all rather than a
 * moving element — the article loses no information. This is explicit here
 * because a scroll-driven MotionValue is set outside Motion's animation
 * pipeline, so `MotionProvider`'s `reducedMotion="user"` cannot neutralise it
 * on its own. Hidden from print for the same reason.
 */
export function BlogReadingProgress() {
  const { scrollYProgress } = useScroll()
  const reduceMotion = useReducedMotion()

  if (reduceMotion) return null

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX: scrollYProgress }}
      className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-primary print:hidden"
    />
  )
}
