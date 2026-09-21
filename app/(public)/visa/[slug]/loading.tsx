import { CardSkeleton } from "@/components/ui/skeleton";

/** Loading skeleton for `/visa/[slug]` — mirrors the hero + form shape. */
export default function VisaDetailLoading() {
  return (
    <div
      role="status"
      aria-label="Loading visa country"
      className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="h-4 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-64 w-full animate-pulse rounded-3xl bg-muted" />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <div className="h-8 w-2/3 animate-pulse rounded-xl bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded-lg bg-muted" />
        </div>
        <CardSkeleton />
      </div>
    </div>
  );
}
