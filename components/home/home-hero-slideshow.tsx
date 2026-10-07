"use client"

import * as React from "react"
import Image from "next/image"
import { motion, useReducedMotion } from "motion/react"
import { HERO_SLIDES } from "@/lib/images"
import { MOTION_EASINGS } from "@/lib/motion/tokens"

/** Seconds each frame stays on screen — calm pace for a background layer. */
const SLIDE_INTERVAL_MS = 6000
/** Crossfade length. Genuine-reason exception above the duration tokens: a
 * full-bleed hero crossfade needs ~1s to read as premium rather than a blink. */
const CROSSFADE_DURATION = 1

/**
 * Decorative homepage hero background slideshow.
 *
 * Pure auto-rotation with no visible controls (per design): stacked
 * `next/image` frames crossfade via opacity only (composited, no layout
 * animation). All frames stay mounted so every image is decoded before its
 * first appearance — no flash on first rotation (~224KB total, all local webp).
 *
 * Accessibility: the layer is `aria-hidden` — the server-rendered headline
 * carries the meaning. Honors `prefers-reduced-motion` by freezing on the
 * first frame, and pauses rotation on hover/focus and hidden tabs.
 */
export function HomeHeroSlideshow() {
  const reduceMotion = useReducedMotion()
  const [active, setActive] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const staticFrame = reduceMotion || HERO_SLIDES.length < 2

  React.useEffect(() => {
    if (staticFrame || paused || document.visibilityState === "hidden") return
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % HERO_SLIDES.length)
    }, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [staticFrame, paused])

  if (staticFrame) {
    return (
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src={HERO_SLIDES[0]?.src ?? "/images/hero.webp"}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0"
      aria-hidden="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {HERO_SLIDES.map((slide, index) => (
        <motion.div
          key={slide.src}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: index === active ? 1 : 0 }}
          transition={{
            duration: CROSSFADE_DURATION,
            ease: MOTION_EASINGS.brand,
          }}
        >
          <Image
            src={slide.src}
            alt=""
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover object-center"
          />
        </motion.div>
      ))}
    </div>
  )
}
