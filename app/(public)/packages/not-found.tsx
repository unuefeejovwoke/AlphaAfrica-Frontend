import { ButtonLink } from "@/components/ui/button"

/** 404 for unknown package slugs: diagnosis + recovery, no dead end. */
export default function PackageNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
        Package not found
      </span>
      <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
        We couldn&apos;t find that package.
      </h1>
      <p className="text-sm leading-relaxed break-words text-muted-foreground sm:text-base">
        It may have been renamed or removed. Compare every package, or tell a
        specialist what you had in mind and they will rebuild it with you.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <ButtonLink href="/packages">
          <span>Browse packages</span>
        </ButtonLink>
        <ButtonLink href="/destinations" variant="outline">
          <span>Browse destinations</span>
        </ButtonLink>
      </div>
    </div>
  )
}
