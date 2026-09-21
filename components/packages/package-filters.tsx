"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildPackageSearchParams } from "@/lib/listings";
import type { PackageFilters } from "@/lib/api/packages";

const PRICE_BANDS = [
  { value: "", label: "Any price" },
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
  "flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";

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
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="package-filter-destination"
            className="text-xs font-semibold tracking-wider text-foreground/80 uppercase"
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
            className="text-xs font-semibold tracking-wider text-foreground/80 uppercase"
          >
            Max price
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
          <span id="package-filter-featured-label" className="text-xs font-semibold tracking-wider text-foreground/80 uppercase">
            Curation
          </span>
          <label
            htmlFor="package-filter-featured"
            className={cn(
              "flex h-11 cursor-pointer touch-manipulation items-center gap-3 rounded-xl border border-input bg-card px-3.5 text-sm font-medium text-foreground",
              "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
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
              className="size-4 shrink-0 accent-[#FF6738]"
            />
            Featured only
          </label>
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit" disabled={isPending} className="h-11 flex-1 touch-manipulation">
            <span>{isPending ? "Updating…" : "Apply filters"}</span>
          </Button>
          {hasActiveFilters && (
            <Button
              render={<Link href="/packages" scroll={false} />}
              variant="outline"
              className="h-11 touch-manipulation"
            >
              <span>Clear</span>
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
        {isPending
          ? "Updating packages…"
          : hasActiveFilters
            ? "Filters applied. Share this URL — it always shows the same results."
            : "Tip: filters update the page address so you can share or bookmark a search."}
      </p>
    </form>
  );
}
