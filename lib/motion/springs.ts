import type { Transition } from "motion/react"

export interface SpringConfig {
  readonly type: "spring"
  readonly stiffness: number
  readonly damping: number
  readonly mass: number
}

export const MOTION_SPRINGS = {
  tactile: { type: "spring", stiffness: 500, damping: 35, mass: 0.5 },
  layout: { type: "spring", stiffness: 380, damping: 30, mass: 0.8 },
  sheet: { type: "spring", stiffness: 300, damping: 28, mass: 1 },
  swap: { type: "spring", stiffness: 420, damping: 26, mass: 0.6 },
} as const satisfies Record<string, SpringConfig & Transition>
