import { CardSkeleton } from "@/components/ui/skeleton"

/** Loading fallback for `/blog`: filter bar + card skeletons. */
export default function BlogLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col gap-14 pb-20 sm:gap-18 sm:pb-28"
    >
      <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 md:pt-16 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <div className="h-6 w-36 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          <div className="h-10 w-3/4 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none sm:h-12" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-48 w-full animate-pulse rounded-3xl bg-muted/60 motion-reduce:animate-none" />
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </section>
      <span className="sr-only">Loading blog posts…</span>
    </div>
  )
}
