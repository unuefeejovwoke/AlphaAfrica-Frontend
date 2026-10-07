import type { Variants } from "motion/react"
import {
  MOTION_DISTANCES,
  MOTION_DURATIONS,
  MOTION_EASINGS,
  MOTION_STAGGERS,
} from "./tokens.ts"
import { MOTION_SPRINGS } from "./springs.ts"

/**
 * Departure -> Arrival: subtle lift and settle using the brand easing.
 * For hero items, content cards, and in-flow client-component entrances.
 * Scroll-driven section reveals stay on the CSS `.reveal` system in
 * globals.css — never rebuild them as JS variants.
 */
export const fadeInRiseVariants: Variants = {
  hidden: {
    opacity: 0,
    y: MOTION_DISTANCES.standard,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.deliberate,
      ease: MOTION_EASINGS.brand,
    },
  },
}

/**
 * Coordinated parent stagger container for child items.
 */
export const staggerContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: MOTION_STAGGERS.standard,
      delayChildren: MOTION_STAGGERS.leadIn,
    },
  },
}

/**
 * Modal & dialog scale-up arrival on the sheet spring; pair with a separate
 * backdrop element for the darkened overlay.
 */
export const modalScaleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: MOTION_SPRINGS.sheet,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: MOTION_DURATIONS.quick,
      ease: MOTION_EASINGS.easeOut,
    },
  },
}

/**
 * Backdrop fade shared by dialogs and drawers (Base UI `render` pattern):
 * soft fade (opacity 0 → 1) on the disclosure tier, mirrored on exit.
 */
const backdropFadeTransition = {
  duration: MOTION_DURATIONS.quick,
  ease: MOTION_EASINGS.easeOut,
} as const

export const backdropFadeVariants: Variants = {
  hidden: {
    opacity: 0,
    transition: backdropFadeTransition,
  },
  visible: {
    opacity: 1,
    transition: backdropFadeTransition,
  },
  exit: {
    opacity: 0,
    transition: backdropFadeTransition,
  },
}

/**
 * Accordion & disclosure panel state pair. Composited transforms only
 * (opacity + y) — never animates height/layout. A panel needing true
 * content-aware height collapse clips with `overflow: hidden` at the call
 * site; height itself stays out of the variant per the transform/opacity rule.
 */
const panelHidden: NonNullable<Variants[string]> = {
  opacity: 0,
  y: -MOTION_DISTANCES.subtle,
  transition: {
    duration: MOTION_DURATIONS.quick,
    ease: MOTION_EASINGS.easeOut,
  },
} as const

const panelVisible: NonNullable<Variants[string]> = {
  opacity: 1,
  y: 0,
  transition: {
    duration: MOTION_DURATIONS.standard,
    ease: MOTION_EASINGS.brand,
  },
} as const

export const accordionPanelVariants: Variants = {
  hidden: panelHidden,
  collapsed: panelHidden,
  visible: panelVisible,
  open: panelVisible,
}
