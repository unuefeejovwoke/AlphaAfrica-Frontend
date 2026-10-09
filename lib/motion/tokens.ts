export type CubicBezierCurve = readonly [number, number, number, number]

export const MOTION_EASINGS = {
  brand: [0.32, 0.72, 0, 1],
  easeOut: [0.16, 1, 0.3, 1],
  easeIn: [0.7, 0, 0.84, 0],
  easeInOut: [0.65, 0, 0.35, 1],
} as const satisfies Record<string, CubicBezierCurve>

export const MOTION_DURATIONS = {
  instant: 0.1,
  quick: 0.2,
  /** Desktop menu drop-and-fade entrance (Ticket 06: 220ms). */
  menu: 0.22,
  standard: 0.3,
  moderate: 0.45,
  deliberate: 0.52,
  ambient: 0.7,
} as const

export const MOTION_DISTANCES = {
  subtle: 4,
  /** Desktop dropdown drop distance (Ticket 06: -8px → 0). */
  dropdown: 8,
  standard: 12,
  pronounced: 16,
  modal: 20,
} as const

/** Seconds between sibling arrivals in a stagger — tokenised per Motion Guidelines. */
export const MOTION_STAGGERS = {
  standard: 0.08,
  tight: 0.04,
  /** Mega-menu card cascade interval (Ticket 06: 30ms). */
  menu: 0.03,
  leadIn: 0.05,
} as const
