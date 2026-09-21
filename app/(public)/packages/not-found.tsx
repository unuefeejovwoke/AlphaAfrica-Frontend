import Link from "next/link";
import { Button } from "@/components/ui/button";

/** 404 for unknown package slugs: diagnosis + recovery, no dead end. */
export default function PackageNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
      <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        Package not found
      </span>
      <h1 className="text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-4xl">
        We couldn&apos;t find that package.
      </h1>
      <p className="text-sm leading-relaxed break-words text-muted-foreground">
        It may have been renamed or removed. Compare every package, or tell a
        specialist what you had in mind and they will rebuild it with you.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button render={<Link href="/packages" />}>
          <span>Browse packages</span>
        </Button>
        <Button render={<Link href="/destinations" />} variant="outline">
          <span>Browse destinations</span>
        </Button>
      </div>
    </div>
  );
}
