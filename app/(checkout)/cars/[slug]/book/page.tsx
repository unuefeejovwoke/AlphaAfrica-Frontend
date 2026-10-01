import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  Message01Icon,
} from "@hugeicons/core-free-icons"
import { ButtonLink } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/error-state"
import { GuestBookingForm } from "@/components/shared/guest-booking-form"
import { ApiError } from "@/lib/api/client"
import {
  buildCarHireParams,
  carHireSchema,
  combinePickupDateTime,
  getCarSupportWhatsAppUrl,
  getVehicleDetail,
  parseCarHireParams,
  previewHireTotal,
  type ParsedCarHireStay,
} from "@/lib/api/cars"
import { formatNaira } from "@/lib/format"
import { canonicalUrl, getSiteUrl } from "@/lib/seo"
import { humanizeSlug } from "@/lib/listings"

/**
 * `/checkout/cars/[slug]/book` — guest booking, never indexed.
 * Trip handoff (?pickup_location=&dropoff_location=&pickup_date=&
 * pickup_time=&num_hours=) validated server-side before the guest form.
 */
export const dynamic = "force-dynamic"

type BookParams = { slug: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<BookParams>
}): Promise<Metadata> {
  const { slug } = await params
  return {
    metadataBase: new URL(getSiteUrl()),
    title: "Complete your Car Booking | Alphaa Africa",
    description:
      "Enter guest details once and continue to secure Paystack payment. No account needed — the exact hourly total is confirmed before you pay.",
    alternates: { canonical: canonicalUrl(`/cars/${slug}`) },
    robots: { index: false, follow: false },
  }
}

function InvalidHire({
  slug,
  hire,
  title,
  message,
}: {
  slug: string
  hire: ParsedCarHireStay
  title: string
  message: string
}) {
  const backParams = buildCarHireParams({
    pickup_location: hire.pickup_location,
    dropoff_location: hire.dropoff_location,
    pickup_date: hire.pickup_date,
    pickup_time: hire.pickup_time,
    num_hours: hire.num_hours ?? 5,
  })
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <HugeiconsIcon icon={AlertCircleIcon} size={24} aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        {message} No booking was made and no payment was taken.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ButtonLink
          href={backParams ? `/cars/${slug}?${backParams}` : `/cars/${slug}`}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} aria-hidden="true" />
          <span>Back to vehicle</span>
        </ButtonLink>
        <ButtonLink
          href={getCarSupportWhatsAppUrl("completing a car hire")}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          size="sm"
        >
          <HugeiconsIcon icon={Message01Icon} size={14} aria-hidden="true" />
          <span>Talk to Alphaa</span>
        </ButtonLink>
      </div>
    </div>
  )
}

export default async function CarBookPage({
  params,
  searchParams,
}: {
  params: Promise<BookParams>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const hire = parseCarHireParams(await searchParams)

  let vehicle
  try {
    vehicle = await getVehicleDetail(slug)
  } catch (error) {
    if (error instanceof ApiError && error.code === "not-found") notFound()
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
        <ErrorState
          error={error}
          preset="general"
          title="We couldn't load this vehicle right now."
          supportContext={`the ${humanizeSlug(slug)} car hire`}
        />
        <ButtonLink href="/cars" variant="ghost" size="sm">
          <span>Back to car search</span>
        </ButtonLink>
      </div>
    )
  }

  const tripValidation = carHireSchema.safeParse({
    pickup_location: hire.pickup_location,
    dropoff_location: hire.dropoff_location,
    pickup_date: hire.pickup_date,
    pickup_time: hire.pickup_time,
    num_hours: hire.num_hours,
  })
  if (!tripValidation.success || hire.num_hours === undefined) {
    return (
      <InvalidHire
        slug={slug}
        hire={hire}
        title="That hire needs a quick review."
        message={
          tripValidation.success
            ? "Add how many hours this hire covers."
            : (tripValidation.error.issues[0]?.message ??
              "Some hire details need attention.")
        }
      />
    )
  }

  const pickupDatetime = combinePickupDateTime(
    hire.pickup_date,
    hire.pickup_time
  )
  if (pickupDatetime === null) {
    return (
      <InvalidHire
        slug={slug}
        hire={hire}
        title="That pickup time needs a quick review."
        message="Pickup must be a real date and time in the future."
      />
    )
  }

  const hours = hire.num_hours
  const preview = previewHireTotal({
    hourlyRate: vehicle.hourly_rate,
    numHours: hours,
  })

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Complete your Car Booking
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {vehicle.name} · Guest booking, no account needed.
          </p>
        </header>

        <GuestBookingForm
          kind="car"
          vehicle={vehicle}
          hire={{
            pickup_location: hire.pickup_location,
            dropoff_location: hire.dropoff_location,
            pickup_datetime: pickupDatetime,
            num_hours: hours,
          }}
          backHref={`/cars/${slug}`}
        />
      </div>

      <aside aria-label="Your hire summary" className="min-w-0">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6 lg:sticky lg:top-24">
          <h2 className="text-base font-bold text-foreground">Your hire</h2>
          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Vehicle
              </dt>
              <dd className="font-semibold text-foreground">{vehicle.name}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Pickup
              </dt>
              <dd className="font-semibold text-foreground">
                {hire.pickup_location}
              </dd>
              <dd className="text-xs text-muted-foreground tabular-nums">
                <time dateTime={pickupDatetime}>
                  {hire.pickup_date} at {hire.pickup_time}
                </time>
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Drop-off
              </dt>
              <dd className="font-semibold text-foreground">
                {hire.dropoff_location}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Hours
              </dt>
              <dd className="font-semibold text-foreground tabular-nums">
                {hours}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
              <dt className="text-xs text-muted-foreground">
                {formatNaira(vehicle.hourly_rate)}/hr × {hours}{" "}
                {hours === 1 ? "hour" : "hours"}
              </dt>
              <dd className="text-base font-extrabold tracking-tight text-foreground tabular-nums">
                {preview !== null ? formatNaira(String(preview)) : "Confirmed"}
              </dd>
            </div>
          </dl>
          <p className="border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
            Estimate only — the exact backend total is confirmed before you pay.
          </p>
        </div>
      </aside>
    </div>
  )
}
