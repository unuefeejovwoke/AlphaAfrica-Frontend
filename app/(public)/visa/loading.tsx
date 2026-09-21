import { CardSkeleton } from "@/components/ui/skeleton";

/** Loading skeleton for `/visa` — mirrors the country card grid shape. */
export default function VisaLoading() {
  return (
    <div
      role="status"
      aria-label="Loading visa countries"
      className="flex flex-col gap-14 sm:gap-18 pb-20 sm:pb-28"
    >
      <section className="pt-10 sm:pt-14 md:pt-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex max-w-3xl flex-col gap-4">
          <div className="h-6 w-32 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          <div className="h-10 sm:h-12 w-3/4 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </section>
      <span className="sr-only">Loading visa destinations…</span>
    </div>
  );
}
