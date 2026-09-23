import * as React from "react"
import Link from "next/link"
import { CheckoutTravellersClient } from "@/components/flights/checkout-travellers-client"
import { Skeleton } from "@/components/ui/skeleton"
import { travellerCompositionSchema } from "@/lib/schemas/travel"

function parseCount(
  value: string | string[] | undefined,
  fallback: number
): number {
  const first = Array.isArray(value) ? value[0] : value
  if (first === undefined) return fallback
  const parsed = Number(first)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

function FormFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading traveller form"
      className="mx-auto flex w-full max-w-2xl flex-col gap-4"
    >
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const candidate = {
    adults: parseCount(params.adults, 1),
    children: parseCount(params.children, 0),
    infants: parseCount(params.infants, 0),
  }
  const parsed = travellerCompositionSchema.safeParse(candidate)
  const party = parsed.success
    ? parsed.data
    : { adults: 1, children: 0, infants: 0 }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 text-center">
        <span className="mx-auto w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Step 1 of 3 · Traveller Details
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-4xl">
          Secure Guest Booking Checkout
        </h1>
        <p className="min-w-0 text-sm leading-relaxed break-words text-muted-foreground">
          Complete your reservation without creating an account. Your payment
          stays protected by 256-bit encryption, and our Abuja specialists
          remain one call away if you need assistance…
        </p>
        <p className="text-xs text-muted-foreground">
          Booking Ref:{" "}
          <span className="font-variant-numeric font-semibold text-foreground tabular-nums">
            AAA-000000
          </span>
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Return to homepage
          </Link>
        </div>
      </div>
      <div className="mt-8">
        <React.Suspense fallback={<FormFallback />}>
          <CheckoutTravellersClient party={party} />
        </React.Suspense>
      </div>
    </section>
  )
}
