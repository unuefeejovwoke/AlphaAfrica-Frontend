import { FeaturedEmpty, FeaturedError } from "@/components/home/featured-state"
import { getFeaturedVehicles } from "@/lib/api/cars"
import { CarCard } from "@/components/cars/car-card"

/**
 * Live featured Vehicles (async RSC, streamed inside Suspense).
 * First browse-all page sliced to 3 — the cars endpoint exposes no
 * featured flag. Covers empty and error+retry (§12) with a WhatsApp hatch.
 */
export async function FeaturedCars() {
  let vehicles
  try {
    vehicles = await getFeaturedVehicles(3)
  } catch (error) {
    return (
      <FeaturedError
        title="We couldn't load featured cars."
        whatsappContext="car rental"
        error={error}
      />
    )
  }

  if (vehicles.length === 0) {
    return (
      <FeaturedEmpty
        whatsappContext="car rental"
        description="New vehicles land regularly. Tell us your pickup, hours, and group size and a specialist will arrange a car with a driver."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((vehicle) => (
        <CarCard key={vehicle.slug} vehicle={vehicle} />
      ))}
    </div>
  )
}
