import { FeaturedEmpty, FeaturedError } from "@/components/home/featured-state"
import { getFeaturedHotels } from "@/lib/api/hotels"
import { HotelCard } from "@/components/hotels/hotel-card"

/**
 * Live featured Hotels (async RSC, streamed inside Suspense).
 * First browse-all page sliced to 3 — the Hotels endpoint exposes no
 * featured flag. Covers empty and error+retry (§12) with a WhatsApp hatch.
 */
export async function FeaturedHotels() {
  let hotels
  try {
    hotels = await getFeaturedHotels(3)
  } catch (error) {
    return (
      <FeaturedError
        title="We couldn't load featured stays."
        whatsappContext="hotel booking"
        error={error}
      />
    )
  }

  if (hotels.length === 0) {
    return (
      <FeaturedEmpty
        whatsappContext="hotel booking"
        description="New stays land regularly. Share your city and dates and a specialist will confirm availability and rates with you."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {hotels.map((hotel) => (
        <HotelCard key={hotel.slug} hotel={hotel} />
      ))}
    </div>
  )
}
