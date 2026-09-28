/** Loading fallback for `/blog/[slug]`: hero + body skeletons. */
export default function BlogDetailLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 pb-24 sm:gap-14 sm:px-6 sm:pb-32 md:py-12 lg:px-8"
    >
      <div className="h-5 w-2/3 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="flex flex-col gap-4">
        <div className="h-6 w-32 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
        <div className="h-12 w-full animate-pulse rounded-2xl bg-muted motion-reduce:animate-none sm:h-14" />
        <div className="h-5 w-full max-w-2xl animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        <div className="h-64 w-full animate-pulse rounded-3xl bg-muted/60 motion-reduce:animate-none sm:h-80" />
      </div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-4 w-full animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
              style={{ width: `${92 - (index % 3) * 12}%` }}
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-muted/60 motion-reduce:animate-none" />
      </div>
      <span className="sr-only">Loading post…</span>
    </div>
  )
}
