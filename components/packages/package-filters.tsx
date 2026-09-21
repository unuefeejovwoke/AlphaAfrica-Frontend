"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildPackageSearchParams } from "@/lib/listings";
import type { PackageFilters } from "@/lib/api/packages";

const PRICE_BANDS = [
  { value: "", label: "Any budget" },
  { value: "500000", label: "Up to ₦500,000" },
  { value: "1000000", label: "Up to ₦1,000,000" },
  { value: "2000000", label: "Up to ₦2,000,000" },
  { value: "5000000", label: "Up to ₦5,000,000" },
] as const;

export interface DestinationOption {
  slug: string;
  name: string;
}

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input/80 bg-background/80 px-3.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-foreground/20 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Package listing controls (client): destination, max price, and featured
 * filters update the URL via `startTransition` + `router.replace`, so the
 * server-filtered grid stays shareable and crawlable. The native GET form
 * keeps filtering working without JavaScript.
 */
export function PackageFilters({
  initial,
  destinations,
}: {
  initial: PackageFilters;
  destinations: DestinationOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [destination, setDestination] = React.useState(initial.destination ?? "");
  const [maxPrice, setMaxPrice] = React.useState(
    initial.max_price !== undefined ? String(initial.max_price) : "",
  );
  const [featured, setFeatured] = React.useState(initial.featured === true);

  // Keep controls in sync when the URL changes (back/forward navigation).
  React.useEffect(() => {
    setDestination(initial.destination ?? "");
    setMaxPrice(initial.max_price !== undefined ? String(initial.max_price) : "");
    setFeatured(initial.featured === true);
  }, [initial.destination, initial.max_price, initial.featured]);

  const apply = React.useCallback(
    (next: { destination: string; maxPrice: string; featured: boolean }) => {
      // Single source of truth for the shareable query string.
      const query = buildPackageSearchParams({
        destination: next.destination || undefined,
        max_price: next.maxPrice ? Number(next.maxPrice) : undefined,
        featured: next.featured || undefined,
      });
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router],
  );

  const hasActiveFilters = destination !== "" || maxPrice !== "" || featured;

  return (
    <div className="relative rounded-3xl p-1.5 sm:p-2 bg-muted/40 border border-border/80 shadow-xs dark:bg-zinc-900/40 dark:border-white/10">
      <form
        method="get"
        action="/packages"
        aria-label="Filter packages"
        aria-busy={isPending || undefined}
        onSubmit={(event) => {
          // SPA path: replace the URL without a full navigation.
          // Without JS the native GET submit still filters server-side.
          event.preventDefault();
          apply({ destination, maxPrice, featured });
        }}
        className="flex flex-col gap-5 rounded-[calc(1.5rem-2px)] bg-card p-5 sm:p-6 border border-black/[0.04] dark:border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="package-filter-destination"
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              Destination
            </label>
            <select
              id="package-filter-destination"
              name="destination"
              value={destination}
              disabled={isPending}
              onChange={(event) => {
                const next = event.target.value;
                setDestination(next);
                apply({ destination: next, maxPrice, featured });
              }}
              className={selectClassName}
            >
              <option value="">All destinations</option>
              {destinations.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="package-filter-max-price"
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              Budget
            </label>
            <select
              id="package-filter-max-price"
              name="max_price"
              value={maxPrice}
              disabled={isPending}
              onChange={(event) => {
                const next = event.target.value;
                setMaxPrice(next);
                apply({ destination, maxPrice: next, featured });
              }}
              className={selectClassName}
            >
              {PRICE_BANDS.map((band) => (
                <option key={band.label} value={band.value}>
                  {band.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span id="package-filter-featured-label" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Curation
            </span>
            <label
              htmlFor="package-filter-featured"
              className={cn(
                "flex h-11 cursor-pointer touch-manipulation items-center gap-3 rounded-xl border border-input/80 bg-background/80 px-3.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/20",
                "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
              )}
            >
              <input
                id="package-filter-featured"
                name="featured"
                type="checkbox"
                value="true"
                checked={featured}
                disabled={isPending}
                aria-labelledby="package-filter-featured-label"
                onChange={(event) => {
                  const next = event.target.checked;
                  setFeatured(next);
                  apply({ destination, maxPrice, featured: next });
                }}
                className="size-4 shrink-0 rounded border-input accent-primary"
              />
              <span className="select-none">Featured only</span>
            </label>
          </div>

          <div className="flex items-end gap-2">
            <Button type="submit" disabled={isPending} className="h-11 flex-1 font-semibold touch-manipulation">
              <span>{isPending ? "Updating…" : "Apply filters"}</span>
            </Button>
            {hasActiveFilters && (
              <Button
                render={<Link href="/packages" scroll={false} />}
                variant="outline"
                className="h-11 font-medium touch-manipulation"
              >
                <span>Clear</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50" role="status" aria-live="polite">
          <span className="flex items-center gap-2">
            <span className={cn("size-1.5 rounded-full transition-colors", isPending ? "bg-amber-500 animate-ping" : hasActiveFilters ? "bg-primary" : "bg-muted-foreground/40")} />
            {isPending
              ? "Updating packages…"
              : hasActiveFilters
                ? "Active filters applied. URL updated for sharing."
                : "Filters update the address bar for shareable and bookmarkable searches."}
          </span>
        </div>
      </form>
    </div>
  );
}
