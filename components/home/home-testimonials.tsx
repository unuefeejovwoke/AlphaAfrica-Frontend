"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  StarIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { getTestimonials } from "@/lib/content/testimonials"
import { stats } from "@/lib/content/stats"
import { cn } from "@/lib/utils"

function getInitials(name: string): string {
  const clean = name.replace(/^Dr\.\s+/i, "")
  const parts = clean.split(" ")
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return (name[0] || "A").toUpperCase()
}

export function HomeTestimonials() {
  // ponytail: native CSS scroll-snap slider with auto-advancing interval; upgrade to virtualized carousel if testimonial count exceeds 15.
  const testimonials = React.useMemo(() => getTestimonials(), [])
  // Published review count — single source of truth lives in stats.ts.
  const reviewCount = stats.stats.find((stat) => stat.id === "reviews")?.value
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isPaused, setIsPaused] = React.useState(false)

  const updateScrollState = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft } = el

    const children = Array.from(el.children) as HTMLElement[]
    if (!children.length) return
    let closestIndex = 0
    let minDiff = Infinity
    children.forEach((child, index) => {
      const diff = Math.abs(child.offsetLeft - el.offsetLeft - scrollLeft)
      if (diff < minDiff) {
        minDiff = diff
        closestIndex = index
      }
    })
    setActiveIndex(closestIndex)
  }, [])

  React.useEffect(() => {
    updateScrollState()
    window.addEventListener("resize", updateScrollState)
    return () => window.removeEventListener("resize", updateScrollState)
  }, [updateScrollState])

  // Auto-advance slider every 5s unless hovered, focused, or reduced-motion
  React.useEffect(() => {
    if (isPaused || testimonials.length <= 1) return

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const interval = setInterval(() => {
      const el = scrollRef.current
      if (!el) return
      const children = Array.from(el.children) as HTMLElement[]
      if (!children.length) return

      const nextIndex = (activeIndex + 1) % children.length
      const targetChild = children[nextIndex]
      if (targetChild) {
        el.scrollTo({
          left: targetChild.offsetLeft - el.offsetLeft,
          behavior: "smooth",
        })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isPaused, testimonials.length, activeIndex])

  const scroll = (direction: "prev" | "next") => {
    const el = scrollRef.current
    if (!el) return
    const children = Array.from(el.children) as HTMLElement[]
    if (!children.length) return

    const targetIndex =
      direction === "next"
        ? (activeIndex + 1) % children.length
        : (activeIndex - 1 + children.length) % children.length

    const targetChild = children[targetIndex]
    if (targetChild) {
      el.scrollTo({
        left: targetChild.offsetLeft - el.offsetLeft,
        behavior: "smooth",
      })
    }
  }

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current
    if (!el) return
    const children = Array.from(el.children) as HTMLElement[]
    const targetChild = children[index]
    if (targetChild) {
      el.scrollTo({
        left: targetChild.offsetLeft - el.offsetLeft,
        behavior: "smooth",
      })
    }
  }

  if (testimonials.length === 0) return null

  return (
    <section
      aria-labelledby="home-testimonials-heading"
      className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onTouchStartCapture={() => setIsPaused(true)}
      onTouchEndCapture={() => setIsPaused(false)}
    >
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex max-w-2xl flex-col items-start gap-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
            <HugeiconsIcon
              icon={SparklesIcon}
              size={13}
              className="shrink-0"
              aria-hidden="true"
            />
            <span>Customer Stories</span>
          </span>
          <h2
            id="home-testimonials-heading"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            Trusted by Thousands of African Travellers
          </h2>
          {reviewCount && (
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Based on {reviewCount} verified traveller reviews across Nigeria
              and abroad.
            </p>
          )}
        </div>

        {/* Desktop slider controls */}
        <div className="hidden items-center gap-3 sm:flex">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll("prev")}
              aria-label="Previous testimonial"
              className="inline-flex size-10 items-center justify-center rounded-full border border-border/80 bg-background text-foreground shadow-xs transition-all duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={18}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={() => scroll("next")}
              aria-label="Next testimonial"
              className="inline-flex size-10 items-center justify-center rounded-full border border-border/80 bg-background text-foreground shadow-xs transition-all duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95"
            >
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={18}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Slider viewport */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="What our customers are saying"
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto scroll-smooth pt-1 pb-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
      >
        {testimonials.map((item, index) => (
          <div
            key={item.name}
            role="group"
            aria-roledescription="slide"
            aria-label={`Testimonial ${index + 1} of ${testimonials.length}`}
            className="w-[85vw] shrink-0 snap-start sm:w-[380px] md:w-[410px]"
          >
            <div className="group relative flex h-full flex-col rounded-3xl border border-border/80 bg-muted/40 p-1.5 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/20 hover:shadow-md sm:p-2">
              <div className="flex h-full flex-1 flex-col justify-between rounded-[calc(1.5rem-2px)] border border-black/[0.04] bg-card p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-7">
                {/* Rating + Trip pill */}
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="flex items-center gap-1 text-amber-500"
                    aria-label="5 out of 5 stars"
                  >
                    {[...Array(5)].map((_, i) => (
                      <HugeiconsIcon
                        key={i}
                        icon={StarIcon}
                        size={14}
                        className="fill-amber-400 text-amber-400"
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  {item.trip && (
                    <span className="inline-flex max-w-[200px] items-center gap-1.5 rounded-full border border-border/60 bg-muted/70 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="truncate">{item.trip}</span>
                    </span>
                  )}
                </div>

                {/* Quote */}
                <blockquote className="my-5 flex-1">
                  <p className="text-sm leading-relaxed text-foreground sm:text-[15px]">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </blockquote>

                {/* Author profile */}
                <div className="flex items-center gap-3 border-t border-border/60 pt-4">
                  <div
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary select-none"
                  >
                    {getInitials(item.name)}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                      {item.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.role}
                      {item.location ? ` · ${item.location}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination indicators and mobile navigation */}
      <div className="mt-4 flex items-center justify-between sm:justify-center">
        <div
          className="flex items-center gap-1.5"
          role="tablist"
          aria-label="Slides"
        >
          {testimonials.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={activeIndex === i}
              aria-label={`Go to testimonial ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                activeIndex === i
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        {/* Mobile-only prev/next buttons */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={() => scroll("prev")}
            aria-label="Previous testimonial"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border/80 bg-background text-foreground shadow-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95"
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              size={16}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={() => scroll("next")}
            aria-label="Next testimonial"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border/80 bg-background text-foreground shadow-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95"
          >
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={16}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </section>
  )
}
