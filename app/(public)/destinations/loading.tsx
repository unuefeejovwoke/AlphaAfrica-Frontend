import { CardSkeleton } from "@/components/ui/skeleton";

/** Loading fallback for `/destinations`: skeletons match the card shape. */
export default function DestinationsLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="flex max-w-3xl flex-col gap-4">
        <div className="h-6 w-28 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
        <div className="h-10 w-3/4 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <span className="sr-only">Loading destinations…</span>
    </div>
  );
}
