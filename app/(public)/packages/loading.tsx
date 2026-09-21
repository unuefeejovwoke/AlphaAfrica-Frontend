import { CardSkeleton } from "@/components/ui/skeleton";

/** Loading fallback for `/packages`: filter bar + card skeletons. */
export default function PackagesLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col gap-14 sm:gap-18 pb-20 sm:pb-28"
    >
      <section className="pt-10 sm:pt-14 md:pt-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex max-w-3xl flex-col gap-4">
          <div className="h-6 w-36 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          <div className="h-10 sm:h-12 w-3/4 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="h-32 w-full animate-pulse rounded-3xl bg-muted/60 motion-reduce:animate-none" />
      </section>

      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </section>
      <span className="sr-only">Loading packages…</span>
    </div>
  );
}
