import { CardSkeleton } from "@/components/ui/skeleton";

/** Loading skeleton for `/visa` — mirrors the country card grid shape. */
export default function VisaLoading() {
  return (
    <div
      role="status"
      aria-label="Loading visa countries"
      className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="flex max-w-3xl flex-col gap-4">
        <div className="h-6 w-32 animate-pulse rounded-full bg-muted" />
        <div className="h-10 w-3/4 animate-pulse rounded-xl bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton className="hidden sm:flex" />
        <CardSkeleton className="hidden lg:flex" />
      </div>
    </div>
  );
}
