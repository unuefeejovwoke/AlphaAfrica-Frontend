import { FeaturedEmpty, FeaturedError } from "@/components/home/featured-state";
import { getFeaturedPackages } from "@/lib/api/packages";
import { PackageCard } from "@/components/packages/package-card";

/**
 * Live featured packages (async RSC, streamed inside Suspense).
 * Shows title, destination, duration, from-price, and key inclusions;
 * covers empty and error+retry (§12).
 */
export async function FeaturedPackages() {
  let packages;
  try {
    packages = await getFeaturedPackages(3);
  } catch (error) {
    return <FeaturedError title="We couldn't load featured packages." whatsappContext="holiday packages" error={error} />;
  }

  if (packages.length === 0) {
    return (
      <FeaturedEmpty
        whatsappContext="holiday packages"
        description="New curated itineraries land regularly. Describe your ideal trip and a specialist will design it with you — no payment needed to start."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {packages.map((pkg) => (
        <PackageCard key={pkg.slug} pkg={pkg} />
      ))}
    </div>
  );
}
