import { Skeleton } from "@/components/ui/skeleton"

/**
 * Hotel detail loading state (ticket 03): skeleton shape mirrors the final
 * layout (breadcrumb, title, gallery, two-column content + sticky panel) so
 * the page never flashes a blank container and CLS stays near zero.
 */
export default function HotelDetailLoading() {
  return (
    <div
      className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:gap-14 sm:px-6 md:py-12 lg:px-8"
      role="status"
      aria-live="polite"
      aria-label="Loading Hotel details"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-40" />
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex max-w-4xl flex-col gap-3">
          <div className="flex gap-2.5">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-10 w-3/4 sm:h-12" />
        </div>
        <Skeleton className="aspect-[16/10] w-full rounded-2xl sm:aspect-[21/9] sm:rounded-3xl" />
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px] lg:gap-14">
        <div className="flex min-w-0 flex-col gap-12">
          {[0, 1, 2].map((section) => (
            <div key={section} className="flex flex-col gap-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
        <div className="min-w-0">
          <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
