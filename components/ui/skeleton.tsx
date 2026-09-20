import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-xl bg-muted/80 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4",
        className
      )}
    >
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

function InputSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Skeleton className="h-3 w-24 rounded-md" />
      <Skeleton className="h-9 w-full rounded-xl" />
    </div>
  );
}

function TableSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-card p-4",
        className
      )}
    >
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-full rounded-lg" />
      ))}
    </div>
  );
}

export { Skeleton, CardSkeleton, InputSkeleton, TableSkeleton };
