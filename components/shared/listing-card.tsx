import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared "Featured" pill for listing cards (destinations + packages). */
export function FeaturedBadge() {
  return (
    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
      <HugeiconsIcon icon={StarIcon} size={12} aria-hidden="true" />
      Featured
    </span>
  );
}

/** Shared card footer CTA row ("Explore destination" / "View package"). */
export function CardCta({ label }: { label: string }) {
  return (
    <span className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-semibold text-primary">
      <span>{label}</span>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        size={14}
        className="transition-transform group-hover:translate-x-1"
        aria-hidden="true"
      />
    </span>
  );
}

const cardLinkClassName =
  "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/**
 * Shared crawlable card shell: image with alt + body. Keeps destination
 * and package cards visually consistent without duplicating markup.
 */
export function ListingCardShell({
  href,
  imageSrc,
  imageAlt,
  isFeatured,
  children,
}: {
  href: string;
  imageSrc: string;
  imageAlt: string;
  isFeatured?: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(cardLinkClassName)}>
      <div className="relative">
        {/* Plain img: backend media host varies by env, so next/image remotePatterns cannot cover it. */}
        <img
          src={imageSrc}
          alt={imageAlt}
          loading="lazy"
          decoding="async"
          className="aspect-[16/10] w-full object-cover"
        />
        {isFeatured === true && <FeaturedBadge />}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">{children}</div>
    </Link>
  );
}
