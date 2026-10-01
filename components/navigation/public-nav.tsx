"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Drawer } from "@base-ui/react/drawer"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Menu01Icon,
  Cancel01Icon,
  ChevronDownIcon,
  HelpCircleIcon,
  PhoneIcon,
  CustomerService01Icon,
  Book02Icon,
} from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { UnderConstructionBadge } from "@/components/shared/under-construction-badge"
import { SERVICE_IMAGES } from "@/lib/images"
import { cn } from "@/lib/utils"

type ServiceItem = {
  title: string
  href: string
  description: string
  image: string
  /** Descriptive alt text — the tile is decorative only in the mobile drawer. */
  imageAlt: string
  span: string
  sizes: string
  /** Renders the card as a disabled, non-linkable surface. */
  comingSoon?: boolean
}

const SERVICES: ServiceItem[] = [
  {
    title: "Flights",
    href: "/flights",
    description: "Compare live fares and book in minutes — no account needed.",
    image: SERVICE_IMAGES.flights,
    imageAlt: "Passenger jet climbing after takeoff at dusk",
    span: "col-span-2",
    sizes: "(max-width: 1280px) 50vw, 600px",
  },
  {
    title: "Hotels",
    href: "/hotels",
    description: "Find a place to stay, check the price, book it. Done.",
    image: SERVICE_IMAGES.hotels,
    imageAlt: "Hotel exterior and lit swimming pool at blue hour",
    span: "col-span-1",
    sizes: "(max-width: 1280px) 25vw, 300px",
  },
  {
    title: "Destinations",
    href: "/destinations",
    description:
      "See where you can go, what trips are available, and what they cost.",
    image: SERVICE_IMAGES.destinations,
    imageAlt: "City skyline beside the water at sunset",
    span: "col-span-1",
    sizes: "(max-width: 1280px) 25vw, 300px",
  },
  {
    title: "Visa Assistance",
    href: "/visa",
    description:
      "Unsure about your visa? A specialist reviews your documents and guides you.",
    image: SERVICE_IMAGES.visa,
    imageAlt: "Passport, stamped documents and reading glasses on a desk",
    span: "col-span-1",
    sizes: "(max-width: 1280px) 25vw, 300px",
  },
  {
    title: "Car Rentals",
    href: "/cars",
    description: "Airport pickup or a car for the week — book by the hour.",
    image: SERVICE_IMAGES.cars,
    imageAlt: "SUV waiting at an airport terminal curb with its driver",
    span: "col-span-1",
    sizes: "(max-width: 1280px) 25vw, 300px",
  },
  {
    title: "Packages",
    href: "/packages",
    description:
      "Ready-made holidays with flights and stays included. Tell us what you want.",
    image: SERVICE_IMAGES.packages,
    imageAlt:
      "Family walking through a resort garden toward the ocean at sunset",
    span: "col-span-2",
    sizes: "(max-width: 1280px) 50vw, 600px",
  },
]

export function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [megaMenuOpen, setMegaMenuOpen] = React.useState(false)
  const [mobileServicesOpen, setMobileServicesOpen] = React.useState(true)
  const megaMenuTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const exploreTriggerRef = React.useRef<HTMLDivElement>(null)
  const megaMenuRef = React.useRef<HTMLDivElement>(null)

  const handleMegaMenuEnter = React.useCallback(() => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current)
      megaMenuTimeoutRef.current = null
    }
    setMegaMenuOpen(true)
  }, [])

  const handleMegaMenuLeave = React.useCallback(() => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setMegaMenuOpen(false)
    }, 200)
  }, [])

  React.useEffect(() => {
    return () => {
      if (megaMenuTimeoutRef.current) {
        clearTimeout(megaMenuTimeoutRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (!megaMenuOpen) return

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (
        exploreTriggerRef.current &&
        !exploreTriggerRef.current.contains(target) &&
        megaMenuRef.current &&
        !megaMenuRef.current.contains(target)
      ) {
        setMegaMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMegaMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [megaMenuOpen])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          <div
            ref={exploreTriggerRef}
            onMouseEnter={handleMegaMenuEnter}
            onMouseLeave={handleMegaMenuLeave}
            className="relative"
          >
            {/* Disclosure pattern: the trigger owns expanded/controls state and
                the panel it presents renders adjacent to it, so tab order
                follows what the menu shows. No menu-button semantics — the
                panel is a set of links, not a menu widget. */}
            <button
              type="button"
              id="explore-menu-trigger"
              onClick={() => setMegaMenuOpen((prev) => !prev)}
              onMouseEnter={handleMegaMenuEnter}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-expanded={megaMenuOpen}
              aria-controls="explore-mega-menu"
            >
              <span>Explore</span>
              <HugeiconsIcon
                icon={ChevronDownIcon}
                size={14}
                className={`transition-transform duration-200 ease-out ${megaMenuOpen ? "rotate-180 text-primary" : "text-muted-foreground"}`}
                aria-hidden="true"
              />
            </button>
          </div>

          <Link
            href="/faq"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span>FAQ</span>
          </Link>

          <Link
            href="/blog"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span>Blog</span>
          </Link>

          <Link
            href="/contact"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span>Contact</span>
          </Link>
        </nav>

        <Link
          href="/"
          className="group flex items-center gap-2.5 lg:absolute lg:left-1/2 lg:-translate-x-1/2"
        >
          <Image
            src="/android-chrome-192x192.png"
            alt="Alphaa Africa"
            width={32}
            height={32}
            className="size-8 object-contain transition-transform duration-300 ease-out group-hover:scale-105"
            priority
          />
          <span className="text-lg leading-none font-bold tracking-tight">
            <span className="text-secondary">Alphaa</span>{" "}
            <span className="font-medium text-primary">Africa</span>
          </span>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          <ButtonLink href="/flights" size="default">
            Book a Trip
          </ButtonLink>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ButtonLink href="/flights" size="sm" className="text-xs">
            Book
          </ButtonLink>
          {/* The drawer panel carries the matching id, so trigger and panel
              share the same expanded/controls relationship the desktop
              disclosure has. */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex size-11 touch-manipulation items-center justify-center rounded-lg border border-border/60 bg-card text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label="Open navigation menu"
          >
            <HugeiconsIcon icon={Menu01Icon} size={18} aria-hidden="true" />
          </button>
        </div>

        {megaMenuOpen && (
          <div
            id="explore-mega-menu"
            role="group"
            aria-labelledby="explore-menu-trigger"
            ref={megaMenuRef}
            onMouseEnter={handleMegaMenuEnter}
            onMouseLeave={handleMegaMenuLeave}
            className="absolute top-full right-4 left-4 hidden pt-2 sm:right-6 sm:left-6 lg:right-8 lg:left-8 lg:block"
          >
            <div className="w-full rounded-2xl border border-border/80 bg-card p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)]">
              <div className="grid grid-cols-4 gap-3.5">
                {SERVICES.map((service) => {
                  const isDisabled = Boolean(service.comingSoon)

                  const cardBody = (
                    <>
                      <Image
                        src={service.image}
                        alt={service.imageAlt}
                        fill
                        sizes={service.sizes}
                        className={cn(
                          "object-cover transition-transform duration-500 ease-out",
                          isDisabled
                            ? "opacity-70"
                            : "group-hover/card:scale-105"
                        )}
                      />

                      <div
                        className={cn(
                          "absolute inset-0 bg-black/40",
                          !isDisabled &&
                            "transition-colors duration-300 group-hover/card:bg-black/30"
                        )}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                      <div className="relative z-10">
                        {/* Link card label, not a document heading — the
                            heading outline belongs to the page behind the nav. */}
                        <p className="text-base font-bold tracking-tight text-white">
                          {service.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/80">
                          {service.description}
                        </p>
                        {isDisabled && (
                          <UnderConstructionBadge className="mt-2" />
                        )}
                      </div>
                    </>
                  )

                  if (isDisabled) {
                    return (
                      <div
                        key={service.href}
                        className={cn(
                          "relative flex h-[190px] cursor-not-allowed flex-col justify-end overflow-hidden rounded-xl border border-dashed border-border/60 p-4",
                          service.span
                        )}
                      >
                        {cardBody}
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={service.href}
                      href={service.href}
                      onClick={() => setMegaMenuOpen(false)}
                      className={cn(
                        "group/card relative flex h-[190px] flex-col justify-end overflow-hidden rounded-xl border border-border/40 p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        service.span
                      )}
                    >
                      {cardBody}
                    </Link>
                  )
                })}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={CustomerService01Icon}
                    size={15}
                    className="text-primary"
                    aria-hidden="true"
                  />
                  <span>
                    Not sure where to start?{" "}
                    <Link
                      href="/contact"
                      onClick={() => setMegaMenuOpen(false)}
                      className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                      Talk to our travel specialists
                    </Link>
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Secure payments by Paystack
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Drawer.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/20 backdrop-blur-xs transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 sm:bg-black/10" />
          <Drawer.Viewport className="fixed inset-0 z-50 flex items-start justify-center p-4">
            <Drawer.Popup
              id="mobile-navigation-drawer"
              className="max-h-[88vh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-background px-4 py-5 shadow-2xl lg:hidden"
            >
              <Drawer.Content className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center justify-between px-2 pb-3">
                  <Drawer.Title className="text-sm font-semibold text-foreground">
                    Menu
                  </Drawer.Title>
                  <Drawer.Close
                    aria-label="Close navigation menu"
                    className="inline-flex size-11 touch-manipulation items-center justify-center rounded-lg border border-border/60 bg-card text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={16}
                      aria-hidden="true"
                    />
                  </Drawer.Close>
                </div>
                <Drawer.Description className="sr-only">
                  Alphaa Africa navigation
                </Drawer.Description>

                <button
                  type="button"
                  onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                  className="flex w-full touch-manipulation items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-expanded={mobileServicesOpen}
                  aria-controls="mobile-services-panel"
                >
                  <span>Explore</span>
                  <HugeiconsIcon
                    icon={ChevronDownIcon}
                    size={16}
                    className={`text-muted-foreground transition-transform duration-200 ease-out ${mobileServicesOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {mobileServicesOpen && (
                  <div
                    id="mobile-services-panel"
                    className="grid grid-cols-2 gap-2 py-1"
                  >
                    {SERVICES.map((item) => {
                      const isDisabled = Boolean(item.comingSoon)

                      const cardBody = (
                        <>
                          <Image
                            src={item.image}
                            alt={item.imageAlt}
                            fill
                            sizes="180px"
                            className={cn(
                              "object-cover",
                              isDisabled && "opacity-70"
                            )}
                          />
                          <div className="absolute inset-0 bg-black/45" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                          <div className="relative z-10 flex flex-col items-start gap-1">
                            <span className="text-xs leading-tight font-bold text-white">
                              {item.title}
                            </span>
                            {isDisabled && <UnderConstructionBadge />}
                          </div>
                        </>
                      )

                      if (isDisabled) {
                        return (
                          <div
                            key={item.href}
                            className="relative flex h-24 cursor-not-allowed flex-col justify-end overflow-hidden rounded-xl border border-dashed border-border/60 p-2.5"
                          >
                            {cardBody}
                          </div>
                        )
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="group relative flex h-24 flex-col justify-end overflow-hidden rounded-xl border border-border/50 p-2.5 transition-transform active:scale-[0.98]"
                        >
                          {cardBody}
                        </Link>
                      )
                    })}
                  </div>
                )}

                <Link
                  href="/faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex touch-manipulation items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <HugeiconsIcon
                    icon={HelpCircleIcon}
                    size={15}
                    className="text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span>FAQ</span>
                </Link>

                <Link
                  href="/blog"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex touch-manipulation items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <HugeiconsIcon
                    icon={Book02Icon}
                    size={15}
                    className="text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span>Blog</span>
                </Link>

                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex touch-manipulation items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <HugeiconsIcon
                    icon={PhoneIcon}
                    size={15}
                    className="text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span>Contact</span>
                </Link>

                <div className="mt-3 flex flex-col gap-2 border-t border-border/50 pt-3">
                  <ButtonLink
                    href="/flights"
                    onClick={() => setMobileMenuOpen(false)}
                    size="lg"
                    className="w-full justify-center"
                  >
                    Book a Trip
                  </ButtonLink>
                </div>
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </header>
  )
}
