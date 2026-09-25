import { cn } from "@/lib/utils"

/**
 * Status tag for a service that is visible in navigation but has no
 * production-ready page behind it yet. Always paired with a non-interactive
 * element (never an anchor) so a half-built route can never be reached.
 */
export function UnderConstructionBadge({
  label = "Under construction",
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full bg-amber-400 px-2 py-0.5 text-[10px] leading-tight font-bold tracking-wider text-amber-950 uppercase",
        className
      )}
    >
      {label}
    </span>
  )
}
