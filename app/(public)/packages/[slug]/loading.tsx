import { CardSkeleton } from "@/components/ui/skeleton"

/** Loading fallback for `/packages/[slug]`: hero + content skeletons. */
export default function PackageDetailLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="h-64 w-full animate-pulse rounded-3xl bg-muted motion-reduce:animate-none sm:h-80" />
      <div className="flex max-w-3xl flex-col gap-4">
        <div className="h-8 w-2/3 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        <div className="h-20 w-full animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <span className="sr-only">Loading package…</span>
    </div>
  )
}
