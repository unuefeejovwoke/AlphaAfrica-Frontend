import { Skeleton } from "@/components/ui/skeleton"

/**
 * Hotel detail loading state (ticket 03): the skeleton mirrors the final
 * layout — breadcrumb, then photo beside the identity it belongs to, then the
 * Room Type choice beside the stay panel, then supporting detail — so the page
 * never flashes a blank container and CLS stays near zero. The rail width and
 * the two-column placement must track `page.tsx`, or the swap to real content
 * shifts everything sideways.
 */
export default function HotelDetailLoading() {
  return (
    <div
      className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pt-4 pb-28 sm:px-6 sm:pt-6 lg:px-8 lg:pb-32"
      role="status"
      aria-live="polite"
      aria-label="Loading Hotel details"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-40" />
      </div>

      {/* Row 1: gallery beside the identity block. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-12">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl sm:aspect-[16/10] lg:aspect-[21/9]" />
        <div className="flex min-w-0 flex-col gap-3 lg:pt-2">
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-16 w-full" />
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((chip) => (
              <Skeleton key={chip} className="h-7 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: the decision. Room Types left, stay panel right. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-12">
        <div className="flex min-w-0 flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          {[0, 1, 2].map((card) => (
            <div
              key={card}
              aria-hidden="true"
              className="flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-3"
            >
              <Skeleton className="size-24 shrink-0 rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
        <div className="min-w-0">
          <div className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/80">
            <Skeleton className="h-24" />
            <div className="flex flex-col gap-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: supporting detail. */}
      <div className="flex min-w-0 flex-col gap-3 lg:max-w-[68ch]">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}