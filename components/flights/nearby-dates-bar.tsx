"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon, Calendar01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { formatNaira } from "@/lib/format"

export interface NearbyDatesBarProps {
  currentDate?: string | null
  lowestPrice?: number | null
  onSelectDate?: (date: string) => void
  className?: string
}

function parseYMD(dateStr: string): [number, number, number] {
  const parts = dateStr.split("-").map(Number)
  return [parts[0] || 2026, parts[1] || 1, parts[2] || 1]
}

function formatYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function addDays(baseDateStr: string, days: number): string {
  try {
    const [y, m, d] = parseYMD(baseDateStr)
    const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0))
    return formatYMD(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
  } catch {
    return baseDateStr
  }
}

function diffDays(d1: string, d2: string): number {
  try {
    const [y1, m1, day1] = parseYMD(d1)
    const [y2, m2, day2] = parseYMD(d2)
    const t1 = Date.UTC(y1, m1 - 1, day1)
    const t2 = Date.UTC(y2, m2 - 1, day2)
    return Math.floor((t1 - t2) / 86400000)
  } catch {
    return 0
  }
}

function formatDateTab(dateStr: string, todayStr: string): { dayName: string; monthDay: string } {
  try {
    const [y, m, d] = parseYMD(dateStr)
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    const dayName =
      dateStr === todayStr
        ? "Today"
        : dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
    const monthDay = dt.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    })
    return { dayName, monthDay }
  } catch {
    return { dayName: "", monthDay: dateStr }
  }
}

function getTodayStr(): string {
  const now = new Date()
  return formatYMD(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function NearbyDatesBar({
  currentDate,
  lowestPrice,
  onSelectDate,
  className,
}: NearbyDatesBarProps) {
  // Always lock minimum date to today in local calendar time
  const todayStr = React.useMemo(() => getTodayStr(), [])

  // Never allow base date to be before today
  const baseDate = currentDate && currentDate >= todayStr ? currentDate : todayStr

  // Calculate days difference from today to baseDate
  const daysFromToday = React.useMemo(() => {
    return Math.max(0, diffDays(baseDate, todayStr))
  }, [baseDate, todayStr])

  // Default start day can show up to 3 days before baseDate, but NEVER before today (>= 0)
  const defaultStartDay = Math.max(0, daysFromToday - 3)
  const [offset, setOffset] = React.useState(0)

  // Reset offset when baseDate changes
  React.useEffect(() => {
    setOffset(0)
  }, [baseDate])

  const currentStartDay = Math.max(0, defaultStartDay + offset)
  const canGoPrev = currentStartDay > 0

  // Generate 7 consecutive future/current dates starting from todayStr + currentStartDay
  const dateTabs = React.useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((idx) => {
      const targetDate = addDays(todayStr, currentStartDay + idx)
      const isSelected = targetDate === baseDate
      const { dayName, monthDay } = formatDateTab(targetDate, todayStr)
      return {
        dateStr: targetDate,
        dayName,
        monthDay,
        isSelected,
        price: isSelected && lowestPrice ? lowestPrice : null,
      }
    })
  }, [todayStr, currentStartDay, baseDate, lowestPrice])

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-2xl border border-border/80 bg-card p-2 shadow-2xs",
        className
      )}
    >
      <button
        type="button"
        disabled={!canGoPrev}
        onClick={() => setOffset((prev) => prev - Math.min(3, currentStartDay))}
        aria-label="Previous dates"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors",
          canGoPrev
            ? "hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer"
            : "opacity-35 cursor-not-allowed pointer-events-none"
        )}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
      </button>

      <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5">
        <div className="hidden shrink-0 items-center gap-1.5 px-2 text-xs font-bold text-muted-foreground uppercase lg:flex">
          <HugeiconsIcon icon={Calendar01Icon} size={14} aria-hidden="true" />
          <span className="text-[11px] tracking-wider">Nearby Dates</span>
        </div>

        {dateTabs.map((tab) => {
          return (
            <button
              key={tab.dateStr}
              type="button"
              onClick={() => onSelectDate?.(tab.dateStr)}
              className={cn(
                "flex min-w-[90px] shrink-0 flex-col items-center justify-center rounded-xl px-3 py-1.5 text-center transition-all sm:min-w-[110px]",
                tab.isSelected
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "border border-border/60 bg-muted/30 text-foreground hover:bg-muted"
              )}
            >
              <span className="text-[11px] font-medium opacity-90">
                {tab.dayName}, {tab.monthDay}
              </span>
              <span
                className={cn(
                  "text-xs font-extrabold tabular-nums",
                  tab.isSelected ? "text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {tab.price ? formatNaira(tab.price) : "View"}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setOffset((prev) => prev + 3)}
        aria-label="Next dates"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer"
      >
        <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
