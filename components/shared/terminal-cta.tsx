import Image from "next/image"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { SparklesIcon } from "@hugeicons/core-free-icons"
import { CTA_DEFAULT } from "@/lib/images"
import { cn } from "@/lib/utils"

/**
 * Reusable, agency-tier conversion CTA for Alphaa Africa.
 * Full-width section with centered max-width content, brand plum scrim,
 * and a single, focused action leading to the Contact Us page.
 */
export interface TerminalCtaProps {
  title: string
  description: string
  primaryHref?: string
  primaryLabel?: string
  eyebrow?: string
  backgroundImage?: string
  className?: string
}

export function TerminalCta({
  title,
  description,
  primaryHref = "/contact",
  primaryLabel = "Contact Us",
  eyebrow = "Direct Travel Concierge",
  backgroundImage = CTA_DEFAULT,
  className,
}: TerminalCtaProps) {
  return (
    <section
      aria-labelledby="terminal-cta-heading"
      className={cn(
        "group relative w-full reveal overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.25)]",
        className
      )}
    >
      {/* Background photographic depth + brand scrim */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src={backgroundImage}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 1280px"
            className="object-cover object-center transition-transform duration-[600ms] ease-brand group-hover:scale-[1.02]"
            priority={false}
          />
          {/* Brand Plum Scrim: --color-brand-plum (#571563) to deep black */}
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/95 via-secondary/90 to-black/85" />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1.5px]" />
        </div>
      )}

      {/* Centered content with a max width */}
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-14 text-center sm:px-10 sm:py-16 lg:py-20">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-white uppercase backdrop-blur-md">
          <HugeiconsIcon
            icon={SparklesIcon}
            size={13}
            className="text-primary"
            aria-hidden="true"
          />
          <span>{eyebrow}</span>
        </div>

        <h2
          id="terminal-cta-heading"
          className="mt-4 text-2xl font-extrabold tracking-tight text-balance text-white sm:text-3xl lg:text-4xl"
        >
          {title}
        </h2>

        <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-balance text-white/85 sm:text-base">
          {description}
        </p>

        <div className="mt-8 flex items-center justify-center">
          <Link
            href={primaryHref}
            className="inline-flex touch-manipulation items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]"
          >
            <span>{primaryLabel}</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
