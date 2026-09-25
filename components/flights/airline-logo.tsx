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
 * Deterministic color generator for airlines without a customized SVG logo.
 */
function getAirlineColors(name: string): { bg: string; text: string; border: string } {
  const normalized = name.toLowerCase().trim()
  if (normalized.includes("kenya")) {
    return { bg: "bg-red-600", text: "text-white", border: "border-red-700" }
  }
  if (normalized.includes("ethiopian")) {
    return { bg: "bg-emerald-700", text: "text-amber-300", border: "border-emerald-800" }
  }
  if (normalized.includes("rwand")) {
    return { bg: "bg-sky-500", text: "text-yellow-300", border: "border-sky-600" }
  }
  if (normalized.includes("maroc") || normalized.includes("morocco")) {
    return { bg: "bg-rose-700", text: "text-white", border: "border-rose-800" }
  }
  if (normalized.includes("egypt")) {
    return { bg: "bg-blue-900", text: "text-amber-400", border: "border-blue-950" }
  }
  if (normalized.includes("emirates")) {
    return { bg: "bg-red-700", text: "text-white", border: "border-red-800" }
  }
  if (normalized.includes("qatar")) {
    return { bg: "bg-[#5C0632]", text: "text-white", border: "border-[#400423]" }
  }
  if (normalized.includes("oman")) {
    return { bg: "bg-teal-800", text: "text-amber-300", border: "border-teal-900" }
  }
  if (normalized.includes("turkish")) {
    return { bg: "bg-red-600", text: "text-white", border: "border-red-700" }
  }
  if (normalized.includes("saudi")) {
    return { bg: "bg-emerald-800", text: "text-amber-200", border: "border-emerald-900" }
  }
  if (normalized.includes("peace")) {
    return { bg: "bg-blue-700", text: "text-white", border: "border-blue-800" }
  }
  if (normalized.includes("ibom")) {
    return { bg: "bg-orange-600", text: "text-white", border: "border-orange-700" }
  }
  if (normalized.includes("green africa")) {
    return { bg: "bg-emerald-600", text: "text-white", border: "border-emerald-700" }
  }
  if (normalized.includes("united nigeria")) {
    return { bg: "bg-green-700", text: "text-white", border: "border-green-800" }
  }
  if (normalized.includes("british")) {
    return { bg: "bg-blue-900", text: "text-red-500", border: "border-blue-950" }
  }
  if (normalized.includes("virgin")) {
    return { bg: "bg-red-600", text: "text-white", border: "border-red-700" }
  }
  if (normalized.includes("lufthansa")) {
    return { bg: "bg-amber-400", text: "text-blue-950", border: "border-amber-500" }
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

/**
 * Authentic stylized airline brand icons for major carriers.
 */
function AirlineBrandIcon({ name }: { name: string }) {
  const normalized = name.toLowerCase().trim()

  if (normalized.includes("kenya")) {
    return (
      <svg viewBox="0 0 32 32" className="size-full fill-current" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#C8102E" />
        <path
          d="M10 8h3v7.5l5.5-7.5h3.8L16 15.5l6.5 8.5h-3.8l-5.7-7.5V24h-3V8z"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  if (normalized.includes("ethiopian")) {
    return (
      <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
        <rect width="32" height="32" rx="16" fill="#007A3D" />
        <path d="M4 11h24l-3 4H7l-3-4z" fill="#007A3D" />
        <path d="M6 15h20l-3 4H9l-3-4z" fill="#FED100" />
        <path d="M8 19h16l-3 4H11l-3-4z" fill="#C8102E" />
      </svg>
    )
  }

  if (normalized.includes("rwand")) {
    return (
      <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#00A3E0" />
        <circle cx="16" cy="16" r="6" fill="#FAD201" />
        <path d="M16 6v3M16 23v3M6 16h3M23 16h3" stroke="#FAD201" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (normalized.includes("maroc") || normalized.includes("morocco")) {
    return (
      <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#C1272D" />
        <polygon
          points="16,8 18.5,13.5 24.5,14 20,18 21.5,24 16,20.5 10.5,24 12,18 7.5,14 13.5,13.5"
          fill="none"
          stroke="#006233"
          strokeWidth="2"
        />
      </svg>
    )
  }

  if (normalized.includes("egypt")) {
    return (
      <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#0A2240" />
        <path
          d="M10 20c2-5 6-8 12-8-3 3-4 6-4 9-2-1-5-1-8-1z"
          fill="#D4AF37"
        />
        <circle cx="19" cy="14" r="1.5" fill="#D4AF37" />
      </svg>
    )
  }

  if (normalized.includes("emirates")) {
    return (
      <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
        <rect width="32" height="32" rx="6" fill="#D71921" />
        <text
          x="16"
          y="21"
          fontSize="11"
          fontWeight="bold"
          fill="#FFFFFF"
          textAnchor="middle"
          fontFamily="serif"
        >
          EK
        </text>
      </svg>
    )
  }

  if (normalized.includes("qatar")) {
    return (
      <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#5C0632" />
        <path
          d="M16 8l3 7-3 2-3-2 3-7zm0 10l4 6h-8l4-6z"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  if (normalized.includes("oman")) {
    return (
      <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#004D71" />
        <path
          d="M12 10c4 0 8 3 8 7s-4 7-8 7c3-2 5-4 5-7s-2-5-5-7z"
          fill="#C49A45"
        />
      </svg>
    )
  }

  if (normalized.includes("turkish")) {
    return (
      <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#E81932" />
        <circle cx="16" cy="16" r="9" fill="#FFFFFF" />
        <path
          d="M12 16c2-3 5-4 8-3-2 1-3 3-3 4-2 0-3.5-.5-5-1z"
          fill="#E81932"
        />
      </svg>
    )
  }

  if (normalized.includes("saudi")) {
    return (
      <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#006C35" />
        <path
          d="M16 9v12M12 13l4-2 4 2M11 19c2 1 8 1 10 0"
          stroke="#C8A155"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (normalized.includes("peace")) {
    return (
      <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
        <rect width="32" height="32" rx="16" fill="#002D62" />
        <path
          d="M8 18c3-4 8-6 14-6-4 3-6 7-6 10-2-1-5-2-8-4z"
          fill="#D9261C"
        />
        <circle cx="18" cy="13" r="1.5" fill="#FFFFFF" />
      </svg>
    )
  }

  if (normalized.includes("ibom")) {
    return (
      <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#FF5E00" />
        <path
          d="M10 20c2-5 7-8 12-8-3 3-5 6-5 9-2-1-4-1-7-1z"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  return null
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

  const brandIcon = AirlineBrandIcon({ name: airline })
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
        brandIcon ? "border-transparent bg-transparent" : `${colors.bg} ${colors.text} ${colors.border}`,
        className
      )}
    >
      {brandIcon || (
        <span className="font-semibold tracking-wider">{initials || <HugeiconsIcon icon={Airplane01Icon} size={16} />}</span>
      )}
    </div>
  )
}
