"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Message01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TrackLink } from "@/components/analytics/track-link"
import { track } from "@/lib/analytics"
import { formatNaira } from "@/lib/format"
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNumHours((h) => Math.max(MIN_HIRE_HOURS, h - 1))}
            disabled={numHours <= MIN_HIRE_HOURS}
            aria-label="Reduce hours by one"
          >
            <span aria-hidden="true">−</span>
          </Button>
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
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-center text-sm font-bold tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNumHours((h) => Math.min(MAX_HIRE_HOURS, h + 1))}
            disabled={numHours >= MAX_HIRE_HOURS}
            aria-label="Add one hour"
          >
            <span aria-hidden="true">+</span>
          </Button>
        </div>
      </div>

      <dl className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-sm">
        <dt className="text-xs text-muted-foreground">
          {formatNaira(vehicle.hourly_rate)}/hr × {numHours}{" "}
          {numHours === 1 ? "hour" : "hours"} (estimate)
        </dt>
        <dd className="text-base font-extrabold tracking-tight text-foreground tabular-nums">
          {preview !== null ? formatNaira(String(preview)) : "—"}
        </dd>
      </dl>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Estimate only — the exact backend total is confirmed before you pay.
      </p>

      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}

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
