import { ButtonLink } from "@/components/ui/button"

/** 404 for unknown destination slugs: diagnosis + recovery, no dead end. */
export default function DestinationNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
      <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        Destination not found
      </span>
      <h1 className="text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-4xl">
        We couldn&apos;t find that destination.
      </h1>
      <p className="text-sm leading-relaxed break-words text-muted-foreground">
        It may have been renamed or removed. Browse every destination, or tell a
        specialist where you want to go and they will plan it with you.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <ButtonLink href="/destinations">
          <span>Browse destinations</span>
        </ButtonLink>
        <ButtonLink href="/packages" variant="outline">
          <span>Browse packages</span>
        </ButtonLink>
      </div>
    </div>
  )
}
