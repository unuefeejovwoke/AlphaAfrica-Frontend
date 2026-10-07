"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Message01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TrackLink } from "@/components/analytics/track-link"
import { track } from "@/lib/analytics"
import { formatNaira } from "@/lib/format"
import { MOTION_DURATIONS, MOTION_EASINGS } from "@/lib/motion/tokens"
import { MOTION_SPRINGS } from "@/lib/motion/springs"
import {
  MAX_HIRE_HOURS,
  MIN_HIRE_HOURS,
  buildCarHireParams,
  combinePickupDateTime,
  getCarSupportWhatsAppUrl,
  previewHireTotal,
  type VehicleDetail,
} from "@/lib/api/cars"

function todayDate(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Hire calculator + booking CTA for the vehicle detail.
 * Separate date + time inputs (owner decision), hours stepper 1–720,
 * live estimate preview, shareable trip handoff in the URL (no PII).
 */
export function CarHireCalculator({ vehicle }: { vehicle: VehicleDetail }) {
  const router = useRouter()
  const [pickupLocation, setPickupLocation] = React.useState("")
  const [dropoffLocation, setDropoffLocation] = React.useState("")
  const [pickupDate, setPickupDate] = React.useState("")
  const [pickupTime, setPickupTime] = React.useState("09:00")
  const [numHours, setNumHours] = React.useState(5)
  const [error, setError] = React.useState<string | null>(null)

  const pickupIso = combinePickupDateTime(pickupDate, pickupTime)
  const preview = previewHireTotal({
    hourlyRate: vehicle.hourly_rate,
    numHours,
  })

  const supportHref = getCarSupportWhatsAppUrl(`the ${vehicle.name} hire`, {
    vehicle_name: vehicle.name,
    num_hours: numHours,
  })

  const handleContinue = () => {
    setError(null)
    if (pickupLocation.trim().length < 3) {
      setError("Add a pickup location (at least 3 characters).")
      return
    }
    if (dropoffLocation.trim().length < 3) {
      setError("Add a drop-off location (at least 3 characters).")
      return
    }
    if (!pickupDate) {
      setError("Choose a pickup date.")
      return
    }
    if (pickupIso === null) {
      setError("Pickup must be a real date and time in the future.")
      return
    }
    if (!Number.isInteger(numHours) || numHours < MIN_HIRE_HOURS) {
      setError(`Hire at least ${MIN_HIRE_HOURS} hour.`)
      return
    }
    track("car_booking_started", {
      hours: numHours,
      has_locations:
        pickupLocation.trim().length > 0 && dropoffLocation.trim().length > 0,
    })
    const params = buildCarHireParams({
      pickup_location: pickupLocation.trim(),
      dropoff_location: dropoffLocation.trim(),
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      num_hours: numHours,
    })
    router.push(`/cars/${vehicle.slug}/book?${params}`)
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6 lg:sticky lg:top-24">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">Your hire</h2>
        <p className="text-lg font-extrabold tracking-tight text-foreground tabular-nums">
          {formatNaira(vehicle.hourly_rate)}
          <span className="text-xs font-medium text-muted-foreground">/hr</span>
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground">
        <span>Pickup location</span>
        <input
          type="text"
          placeholder="e.g. Murtala Muhammed Airport, Lagos"
          value={pickupLocation}
          onChange={(event) => setPickupLocation(event.target.value)}
          autoComplete="street-address"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground">
        <span>Drop-off location</span>
        <input
          type="text"
          placeholder="e.g. Eko Hotel, Victoria Island"
          value={dropoffLocation}
          onChange={(event) => setDropoffLocation(event.target.value)}
          autoComplete="street-address"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground">
          <span>Pickup date</span>
          <input
            type="date"
            name="pickup_date"
            autoComplete="off"
            value={pickupDate}
            min={todayDate()}
            onChange={(event) => setPickupDate(event.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground">
          <span>Pickup time</span>
          <input
            type="time"
            name="pickup_time"
            autoComplete="off"
            value={pickupTime}
            onChange={(event) => setPickupTime(event.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span
          id="hire-hours-label"
          className="text-xs font-semibold text-foreground"
        >
          Hours
        </span>
        <div
          role="group"
          aria-labelledby="hire-hours-label"
          className="flex items-center gap-2"
        >
          {/* Stepper controls keep the 44px phone target the other steppers
              (TravellerStepper, HotelPartyStepper) already meet. */}
          <motion.span
            whileTap={{ scale: 0.95 }}
            transition={MOTION_SPRINGS.tactile}
            className="inline-flex shrink-0"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setNumHours((h) => Math.max(MIN_HIRE_HOURS, h - 1))
              }
              disabled={numHours <= MIN_HIRE_HOURS}
              aria-label="Reduce hours by one"
              className="size-11 shrink-0"
            >
              <span aria-hidden="true">−</span>
            </Button>
          </motion.span>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_HIRE_HOURS}
            max={MAX_HIRE_HOURS}
            value={numHours}
            onChange={(event) => {
              const parsed = Number(event.target.value)
              if (Number.isInteger(parsed)) setNumHours(parsed)
            }}
            aria-label="Number of hours"
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-center text-sm font-bold tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          <motion.span
            whileTap={{ scale: 0.95 }}
            transition={MOTION_SPRINGS.tactile}
            className="inline-flex shrink-0"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setNumHours((h) => Math.min(MAX_HIRE_HOURS, h + 1))
              }
              disabled={numHours >= MAX_HIRE_HOURS}
              aria-label="Add one hour"
              className="size-11 shrink-0"
            >
              <span aria-hidden="true">+</span>
            </Button>
          </motion.span>
        </div>
      </div>

      <dl className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-sm">
        <dt className="text-xs text-muted-foreground">
          {formatNaira(vehicle.hourly_rate)}/hr × {numHours}{" "}
          {numHours === 1 ? "hour" : "hours"} (estimate)
        </dt>
        <dd
          aria-live="polite"
          className="text-base font-extrabold tracking-tight text-foreground tabular-nums"
        >
          {/* Numerical transition: opacity + y only, so hour edits never
              shift layout while the figure swaps (hotel stay panel pattern). */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={preview !== null ? String(preview) : "empty"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: -4,
                transition: {
                  duration: MOTION_DURATIONS.instant,
                  ease: MOTION_EASINGS.easeOut,
                },
              }}
              transition={{
                duration: MOTION_DURATIONS.quick,
                ease: MOTION_EASINGS.easeOut,
              }}
              className="block tabular-nums"
            >
              {preview !== null ? formatNaira(String(preview)) : "—"}
            </motion.span>
          </AnimatePresence>
        </dd>
      </dl>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="hire-error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              transition: {
                duration: MOTION_DURATIONS.instant,
                ease: MOTION_EASINGS.easeOut,
              },
            }}
            transition={{
              duration: MOTION_DURATIONS.quick,
              ease: MOTION_EASINGS.easeOut,
            }}
            className="text-xs font-medium text-destructive"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <Button
        type="button"
        size="lg"
        onClick={handleContinue}
        className="w-full justify-center"
      >
        <span>Continue to booking</span>
        <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
      </Button>
      <TrackLink
        event="support_click"
        eventProps={{ context: "car hire choice", channel: "whatsapp" }}
        href={supportHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "w-full justify-center"
        )}
      >
        <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
        <span>Ask Alphaa about this car</span>
      </TrackLink>
    </div>
  )
}
