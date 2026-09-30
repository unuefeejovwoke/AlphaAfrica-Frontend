import { cn } from "@/lib/utils"

/**
 * Skeleton matching the vehicle card grid shape — never a blank spinner.
 * `dimmed` keeps previous results visible under a pending filter transition.
 */
export function CarResultsSkeleton({
  count = 6,
  dimmed = false,
}: {
  count?: number
  dimmed?: boolean
}) {
  return (
    <ul
      aria-label="Loading vehicles"
      aria-busy="true"
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2",
        dimmed && "pointer-events-none opacity-60"
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <li
          key={index}
          className="flex animate-pulse flex-col gap-3 rounded-3xl border border-border/60 bg-card p-2"
        >
          <div className="aspect-[16/10] w-full rounded-[calc(1.5rem-2px)] bg-muted" />
          <div className="flex flex-col gap-2 p-3">
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="mt-2 h-5 w-1/3 rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  )
}
