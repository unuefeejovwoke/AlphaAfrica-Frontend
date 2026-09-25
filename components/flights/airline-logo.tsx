"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Airplane01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export interface AirlineLogoProps {
  airline: string
  carrierCode?: string
  className?: string
  size?: "sm" | "md" | "lg"
}

/**
 * Deterministic color generator for the airline monogram badge.
 */
function getAirlineColors(name: string): {
  bg: string
  text: string
  border: string
} {
  const normalized = name.toLowerCase().trim()
  if (normalized.includes("kenya")) {
    return { bg: "bg-red-600", text: "text-white", border: "border-red-700" }
  }
  if (normalized.includes("ethiopian")) {
    return {
      bg: "bg-emerald-700",
      text: "text-amber-300",
      border: "border-emerald-800",
    }
  }
  if (normalized.includes("rwand")) {
    return {
      bg: "bg-sky-500",
      text: "text-yellow-300",
      border: "border-sky-600",
    }
  }
  if (normalized.includes("maroc") || normalized.includes("morocco")) {
    return { bg: "bg-rose-700", text: "text-white", border: "border-rose-800" }
  }
  if (normalized.includes("egypt")) {
    return {
      bg: "bg-blue-900",
      text: "text-amber-400",
      border: "border-blue-950",
    }
  }
  if (normalized.includes("emirates")) {
    return { bg: "bg-red-700", text: "text-white", border: "border-red-800" }
  }
  if (normalized.includes("qatar")) {
    return {
      bg: "bg-[#5C0632]",
      text: "text-white",
      border: "border-[#400423]",
    }
  }
  if (normalized.includes("oman")) {
    return {
      bg: "bg-teal-800",
      text: "text-amber-300",
      border: "border-teal-900",
    }
  }
  if (normalized.includes("turkish")) {
    return { bg: "bg-red-600", text: "text-white", border: "border-red-700" }
  }
  if (normalized.includes("saudi")) {
    return {
      bg: "bg-emerald-800",
      text: "text-amber-200",
      border: "border-emerald-900",
    }
  }
  if (normalized.includes("peace")) {
    return { bg: "bg-blue-700", text: "text-white", border: "border-blue-800" }
  }
  if (normalized.includes("ibom")) {
    return {
      bg: "bg-orange-600",
      text: "text-white",
      border: "border-orange-700",
    }
  }
  if (normalized.includes("green africa")) {
    return {
      bg: "bg-emerald-600",
      text: "text-white",
      border: "border-emerald-700",
    }
  }
  if (normalized.includes("united nigeria")) {
    return {
      bg: "bg-green-700",
      text: "text-white",
      border: "border-green-800",
    }
  }
  if (normalized.includes("british")) {
    return {
      bg: "bg-blue-900",
      text: "text-red-500",
      border: "border-blue-950",
    }
  }
  if (normalized.includes("virgin")) {
    return { bg: "bg-red-600", text: "text-white", border: "border-red-700" }
  }
  if (normalized.includes("lufthansa")) {
    return {
      bg: "bg-amber-400",
      text: "text-blue-950",
      border: "border-amber-500",
    }
  }
  if (normalized.includes("air france")) {
    return { bg: "bg-blue-900", text: "text-white", border: "border-blue-950" }
  }
  if (normalized.includes("klm")) {
    return { bg: "bg-sky-600", text: "text-white", border: "border-sky-700" }
  }

  // Fallback hash
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hues = [
    { bg: "bg-blue-600", text: "text-white", border: "border-blue-700" },
    { bg: "bg-indigo-600", text: "text-white", border: "border-indigo-700" },
    { bg: "bg-emerald-600", text: "text-white", border: "border-emerald-700" },
    { bg: "bg-amber-600", text: "text-white", border: "border-amber-700" },
    { bg: "bg-rose-600", text: "text-white", border: "border-rose-700" },
    { bg: "bg-violet-600", text: "text-white", border: "border-violet-700" },
    { bg: "bg-cyan-600", text: "text-white", border: "border-cyan-700" },
  ]
  return hues[Math.abs(hash) % hues.length]
}

export function AirlineLogo({
  airline,
  carrierCode,
  className,
  size = "md",
}: AirlineLogoProps) {
  const sizeClasses = {
    sm: "size-7 text-[10px]",
    md: "size-10 text-xs",
    lg: "size-12 text-sm",
  }

  const colors = getAirlineColors(airline)

  // 2-letter monogram
  const initials = carrierCode
    ? carrierCode.slice(0, 2).toUpperCase()
    : airline
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border font-bold shadow-xs transition-transform",
        sizeClasses[size],
        `${colors.bg} ${colors.text} ${colors.border}`,
        className
      )}
    >
      <span className="font-semibold tracking-wider">
        {initials || <HugeiconsIcon icon={Airplane01Icon} size={16} />}
      </span>
    </div>
  )
}
