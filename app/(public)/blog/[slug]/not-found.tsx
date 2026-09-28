import Link from "next/link"
import { Button } from "@/components/ui/button"

/** 404 for unknown post slugs: diagnosis + recovery, no dead end. */
export default function BlogNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
        Post not found
      </span>
      <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
        We couldn&apos;t find that post.
      </h1>
      <p className="text-sm leading-relaxed break-words text-muted-foreground sm:text-base">
        It may have been renamed or removed. Browse every blog post, or tell
        a specialist what you are planning and they will point you forward.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button render={<Link href="/blog" />}>
          <span>Browse posts</span>
        </Button>
        <Button render={<Link href="/contact" />} variant="outline">
          <span>Talk to Alphaa</span>
        </Button>
      </div>
    </div>
  )
}
